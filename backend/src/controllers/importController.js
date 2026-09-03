const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');
const Member = require('../models/Member');
const Area = require('../models/Area');
const Ward = require('../models/Ward');
const Booth = require('../models/Booth');
const Family = require('../models/Family');
const ImportReview = require('../models/ImportReview');
const ImportJob = require('../models/ImportJob');
const ElectoralList = require('../models/ElectoralList');
const ElectoralMembership = require('../models/ElectoralMembership');
const { assertBoothAccess, assertWardAccess } = require('../utils/boothAccess');
const { findPartyFromText } = require('../utils/partySeed');
const { ocrPdf } = require('../utils/pdfOcr');
const { ocrWardPdf } = require('../utils/wardPdfOcr');
const { normalizeEpic, isValidEpic } = require('../utils/epic');
const { convertKrutiDevToUnicode } = require('../utils/legacyHindi');
const { isValidHindiText, isValidAssemblyHeader } = require('./areaController');
const { uploadFilePath } = require('../utils/uploadPath');
const { persistLocalImage } = require('../utils/persistentMedia');
const { findBestLocationMatch } = require('../utils/locationMerge');
const {
  canonicalizeExcelRow,
  isKnownExcelHeader,
  buildSafeExcelMerge,
} = require('../utils/excelMerge');
const {
  areaImportCache,
  pdfAreaHierarchyCache,
  invalidateMemberData,
} = require('../utils/dataCache');
const importProgress = new Map();
const progressWrites = new Map();

const isWindows = process.platform === 'win32';
const isWindowsExecutablePath = (value = '') => /^[a-z]:\\/i.test(String(value));
const commandFromEnv = (envName, fallback) => {
  const configured = process.env[envName];
  if (!configured) return fallback;
  if (!isWindows && isWindowsExecutablePath(configured)) return fallback;
  return configured;
};

const progressId = (req) => String(req.body?.uploadId || req.params?.uploadId || req.query?.uploadId || '').replace(/[^a-z0-9_-]/gi, '').slice(0, 80);
const safeUploadId = (value) => String(value || '').replace(/[^a-z0-9_-]/gi, '').slice(0, 80);
const chunkDirectory = (id) => uploadFilePath('chunks', safeUploadId(id));
const persistProgress = (id, value, owner) => {
  if (!id) return;
  const previous = progressWrites.get(id) || Promise.resolve();
  const write = previous.catch(() => {}).then(() => {
    const update = {
      $set: {
        ...value,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    };
    const options = {};
    if (owner) {
      update.$setOnInsert = { uploadId: id, owner };
      options.upsert = true;
    }
    return ImportJob.updateOne({ uploadId: id }, update, options);
  }).catch((error) => console.error('Import progress persistence failed:', error.message));
  progressWrites.set(id, write);
  write.finally(() => {
    if (progressWrites.get(id) === write) progressWrites.delete(id);
  });
};
const setProgress = (id, patch, owner) => {
  if (!id) return;
  const value = { id, ...importProgress.get(id), ...patch, updatedAt: new Date().toISOString() };
  importProgress.set(id, value);
  persistProgress(id, value, owner);
};
const finishProgressSoon = (id, patch, owner) => {
  setProgress(id, patch, owner);
  if (id) setTimeout(() => importProgress.delete(id), 15 * 60 * 1000).unref?.();
};

exports.importStatus = async (req, res, next) => {
  try {
    const id = progressId(req);
    const current = importProgress.get(id)
      || await ImportJob.findOne({ uploadId: id, owner: req.currentUser._id }).lean();
    res.json(current || { status: 'waiting', stage: 'Waiting for upload', imported: 0, skipped: 0, total: 0, processed: 0, uploadBytes: 0, uploadTotalBytes: 0, ocrPagesProcessed: 0, ocrPagesTotal: 0, ocrCardsProcessed: 0, ocrCardsTotal: 0 });
  } catch (error) { next(error); }
};
exports.trackUploadProgress = (req, res, next) => {
  const id = progressId(req);
  if (!id) return next();
  const totalBytes = Number(req.headers['content-length'] || 0);
  let receivedBytes = 0;
  setProgress(id, {
    status: 'uploading',
    stage: 'Receiving file on server',
    uploadBytes: 0,
    uploadTotalBytes: totalBytes,
    imported: 0,
    skipped: 0,
    processed: 0,
    total: 0,
    ocrPagesProcessed: 0,
    ocrPagesTotal: 0,
    ocrCardsProcessed: 0,
    ocrCardsTotal: 0,
  }, req.currentUser._id);
  req.on('data', (chunk) => {
    receivedBytes += chunk.length;
    setProgress(id, {
      status: 'uploading',
      stage: 'Receiving file on server',
      uploadBytes: receivedBytes,
      uploadTotalBytes: totalBytes,
    });
  });
  req.on('end', () => {
    setProgress(id, {
      status: 'processing',
      stage: 'Upload received. Preparing import',
      uploadBytes: receivedBytes,
      uploadTotalBytes: totalBytes,
    });
  });
  next();
};

exports.uploadPdfChunk = (req, res, next) => {
  try {
    const id = safeUploadId(req.params.uploadId);
    const index = Number(req.params.index);
    const totalChunks = Number(req.header('x-total-chunks') || req.header('X-Total-Chunks'));
    const totalBytes = Number(req.header('x-total-bytes') || req.header('X-Total-Bytes'));
    if (!id || !Number.isInteger(index) || index < 0 || !Number.isInteger(totalChunks)
      || totalChunks < 1 || index >= totalChunks || !Buffer.isBuffer(req.body) || !req.body.length) {
      const error = new Error('Invalid PDF upload chunk.'); error.status = 400; throw error;
    }
    const maxBytes = Number(process.env.MAX_UPLOAD_MB || 250) * 1024 * 1024;
    if (!Number.isFinite(totalBytes) || totalBytes < 1 || totalBytes > maxBytes) {
      const error = new Error(`PDF is too large. Maximum upload size is ${process.env.MAX_UPLOAD_MB || 250} MB.`);
      error.status = 413; throw error;
    }
    const dir = chunkDirectory(id);
    fs.mkdirSync(dir, { recursive: true });
    const metaPath = path.join(dir, 'meta.json');
    const owner = String(req.currentUser._id);
    if (fs.existsSync(metaPath)) {
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      if (meta.owner !== owner || meta.totalChunks !== totalChunks || meta.totalBytes !== totalBytes) {
        const error = new Error('Upload ID is already in use. Start a new upload.'); error.status = 409; throw error;
      }
    } else {
      fs.writeFileSync(metaPath, JSON.stringify({ owner, totalChunks, totalBytes, createdAt: Date.now() }));
    }
    const target = path.join(dir, `${index}.part`);
    const temporary = `${target}.tmp`;
    fs.writeFileSync(temporary, req.body);
    fs.renameSync(temporary, target);
    const receivedBytes = fs.readdirSync(dir).filter((name) => /^\d+\.part$/.test(name))
      .reduce((sum, name) => sum + fs.statSync(path.join(dir, name)).size, 0);
    setProgress(id, { status: 'uploading', stage: 'Receiving file on server', uploadBytes: receivedBytes,
      uploadTotalBytes: totalBytes, imported: 0, skipped: 0, processed: 0, total: 0 }, req.currentUser._id);
    res.json({ received: index, receivedBytes, totalBytes });
  } catch (error) { next(error); }
};

exports.completePdfChunks = (req, res, next) => {
  const id = safeUploadId(req.params.uploadId);
  try {
    const dir = chunkDirectory(id);
    const meta = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8'));
    if (meta.owner !== String(req.currentUser._id)) {
      const error = new Error('This upload belongs to another user.'); error.status = 403; throw error;
    }
    const filename = String(req.body?.filename || 'voter-list.pdf').replace(/[^a-z0-9._-]/gi, '-');
    if (!/\.pdf$/i.test(filename)) { const error = new Error('PDF filename required.'); error.status = 400; throw error; }
    const finalName = `${Date.now()}-${filename}`;
    const finalPath = uploadFilePath(finalName);
    const output = fs.openSync(finalPath, 'w');
    let assembledBytes = 0;
    try {
      for (let index = 0; index < meta.totalChunks; index += 1) {
        const partPath = path.join(dir, `${index}.part`);
        if (!fs.existsSync(partPath)) {
          const error = new Error(`Upload incomplete. Missing chunk ${index + 1} of ${meta.totalChunks}.`);
          error.status = 409; throw error;
        }
        const chunk = fs.readFileSync(partPath);
        fs.writeSync(output, chunk); assembledBytes += chunk.length;
      }
    } finally { fs.closeSync(output); }
    if (assembledBytes !== meta.totalBytes) {
      fs.rmSync(finalPath, { force: true });
      const error = new Error('Uploaded PDF size did not match. Retry the upload.'); error.status = 409; throw error;
    }
    assertReadablePdf(finalPath);
    fs.rmSync(dir, { recursive: true, force: true });
    const file = { path: finalPath, filename: finalName, originalname: filename, size: assembledBytes };
    setProgress(id, { status: 'processing', stage: 'Upload received. PDF/OCR import running in background',
      uploadBytes: assembledBytes, uploadTotalBytes: assembledBytes }, req.currentUser._id);
    setImmediate(() => runPdfImport({ file, body: { ...req.body, uploadId: id }, currentUser: req.currentUser }, id)
      .catch((error) => console.error('Background chunked PDF import failed:', error)));
    res.status(202).json({ processing: true, uploadId: id, message: 'PDF upload complete. OCR/import started.' });
  } catch (error) {
    finishProgressSoon(id, { status: 'failed', stage: error.message || 'PDF upload failed' }, req.currentUser?._id); next(error);
  }
};

const estimateDobFromAge = (age) => {
  const value = Number(age);
  if (!value || value < 1 || value > 120) return undefined;
  return new Date(Date.UTC(new Date().getFullYear() - value, 0, 1));
};

const cleanValue = (value = '') => String(value).replace(/\s+/g, ' ').replace(/^[\uFF1A:\-\s]+/, '').trim();
const cleanHeaderName = (value, rejectPattern) => {
  const text = cleanValue(value).replace(/^[^\u0900-\u097F]*/, '').trim();
  if (!text || (rejectPattern && rejectPattern.test(text))) return '';
  return text;
};

const devanagariTextCount = (value = '') => (String(value).match(/[\u0900-\u097F]/g) || []).length;
const looksLikeBadLatinSection = (value = '') => {
  const text = cleanValue(value);
  if (/google|polling|station|view|map|sifer|after|aftet|hier|uzar|zadt|merit|oiler|sffzr|freran|\bore\b/i.test(text)) return true;
  if (devanagariTextCount(text) >= 2) return false;
  const latinCount = (text.match(/[A-Za-z]/g) || []).length;
  return latinCount > 3;
};
const cleanSectionName = (value = '') => {
  let text = cleanHeaderName(value);
  if (!text) return '';
  text = text.replace(/\s*(?:we\s*,?\s*fer|wrefer|ore|hier|uzar|sifer|zadt|merit|oiler|freran|after|aftet)\b.*$/gi, '').trim();
  if (/EPIC|RJ\/|Google|Polling|Station|Map|View|[\[\]{}|\\&_~]/i.test(text)) return '';
  if (text.length > 75) return '';
  if (devanagariTextCount(text) < 2 || looksLikeBadLatinSection(text)) return '';
  return text;
};
const safeSectionMap = (sectionMap = {}) => Object.fromEntries(
  Object.entries(sectionMap || {})
    .map(([number, name]) => [cleanValue(number), cleanSectionName(name)])
    .filter(([number, name]) => number && name),
);
const sectionHeaderForRecord = (record = {}, header = {}, sectionMap = safeSectionMap(header.sectionMap)) => {
  const sectionNumber = cleanValue(record.sectionNumber || (Object.keys(sectionMap).length <= 1 ? header.sectionNumber : ''));
  const headerSectionNumber = cleanValue(header.sectionNumber || '');
  const useHeaderSectionFallback = Object.keys(sectionMap).length <= 1;
  const mappedSectionName = sectionNumber ? cleanSectionName(sectionMap[sectionNumber]) : '';
  const recordSectionName = cleanSectionName(record.sectionName);
  const headerSectionName = (useHeaderSectionFallback || !sectionNumber || sectionNumber === headerSectionNumber)
    ? cleanSectionName(header.sectionName)
    : '';
  const sectionName = mappedSectionName || recordSectionName || headerSectionName;
  return {
    ...header,
    assemblyNumber: header.assemblyNumber || record.assemblyNumber,
    assemblyName: header.assemblyName || record.assemblyName,
    partNumber: header.partNumber || record.partNumber,
    sectionNumber,
    sectionName,
    sectionMap,
  };
};

const romanVillageAliases = new Map(Object.entries({
  bheeta: 'भीटा',
  bhita: 'भीटा',
  beeta: 'भीटा',
  beta: 'भीटा',
}));

const pdfVillageHintFromName = (fileName = '') => {
  const base = path.basename(String(fileName), path.extname(String(fileName)));
  const cleaned = base
    .toLowerCase()
    .replace(/\b(?:pdf|voter|roll|list|matdata|matdataa|page|part|booth|ward)\b/g, ' ')
    .replace(/[0-9_\-()[\].]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return '';
  for (const token of cleaned.split(' ')) {
    if (romanVillageAliases.has(token)) return romanVillageAliases.get(token);
  }
  const hindi = cleaned.match(/[\u0900-\u097F][\u0900-\u097F\s]{1,40}/);
  if (hindi) return cleanValue(hindi[0]);
  return '';
};

const applyPdfVillageHint = (item, villageHint) => {
  const village = cleanValue(villageHint);
  if (!village) return;
  const hasGoodVillage = cleanValue(item.village).match(/[\u0900-\u097F]/);
  if (!hasGoodVillage) item.village = village;
  const location = cleanValue(item.location);
  if (!location || !location.match(/[\u0900-\u097F]/) || /\b(?:hier|ore)\b/i.test(location)) {
    item.location = village;
  }
  const house = cleanValue(item.houseNumber);
  const address = cleanValue(item.address);
  if (!address || /\b(?:hier|ore)\b/i.test(address) || !address.match(/[\u0900-\u097F]/)) {
    item.address = [village, house].filter(Boolean).join(', ');
  }
};

const pick = (row, ...keys) => {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') return value;
  }
  return undefined;
};

const normalizeGender = (value) => {
  const gender = String(value || '').trim().toLowerCase();
  if (['m', 'male', 'पुरुष', 'पु'].includes(gender)) return 'male';
  if (['f', 'female', 'महिला', 'स्त्री'].includes(gender)) return 'female';
  if (['o', 'other', 'others', 'अन्य', 'third gender', 'transgender'].includes(gender)) return 'other';
  return '';
};

const legacyLocation = (value) => {
  const text = cleanValue(value);
  return text ? convertKrutiDevToUnicode(text) : undefined;
};

const knownImportHeaders = new Set([
  'ac no', 'part no.', 'part no', 'sl. no. in part',
  'epic no', 'name', 'age', 'gender', 's/o, d/o, w/o name', 'rln type',
  'mobile no', 'mobile', 'cast', 'caste', 'address', 'villege', 'village',
  'gram panchayat', 'block', 'tehsil', 'education', 'occupation',
  'presant city', 'present city', 'presant state', 'present state',
  'post', 'support level', 'sectionnumber', 'section number', 'sectionname',
  'section name', 'assemblynumber', 'assembly number', 'assemblyname',
  'assembly name',
]);

const buildExtraDetails = (row) => Object.entries(row)
  .filter(([key, value]) => (
    value !== undefined
    && value !== null
    && String(value).trim() !== ''
    && !knownImportHeaders.has(String(key).trim().toLowerCase())
    && !isKnownExcelHeader(key)
  ))
  .map(([label, value]) => ({ label: cleanValue(label), value: cleanValue(value) }));
const normalize = (inputRow) => {
  const row = canonicalizeExcelRow(inputRow);
  const age = pick(row, 'age', 'Age', 'उम्र', 'आयु');
  const address = legacyLocation(pick(row, 'address', 'Address', 'पता'));
  const village = legacyLocation(pick(row, 'village', 'villege', 'Village', 'गांव', 'गाँव'));
  const gramPanchayat = legacyLocation(pick(row, 'gramPanchayat', 'gram panchayat', 'Gram Panchayat', 'ग्राम पंचायत'));
  const tehsil = legacyLocation(pick(row, 'tehsil', 'Tehsil', 'block', 'Block', 'तहसील'));
  const presentCity = legacyLocation(pick(row, 'presant city', 'present city', 'Present City'));
  const presentState = legacyLocation(pick(row, 'presant state', 'present state', 'Present State'));
  const extraDetails = buildExtraDetails(row);
  if (presentCity) extraDetails.push({ label: 'Present City', value: presentCity });
  if (presentState) extraDetails.push({ label: 'Present State', value: presentState });
  return {
    name: pick(row, 'name', 'Name', 'firstName', 'First Name', 'नाम'),
    surname: pick(row, 'surname', 'Surname', 'lastName', 'Last Name', 'उपनाम'),
    mobile: String(pick(row, 'mobile', 'Mobile', 'Mobile No', 'phone', 'Phone', 'मोबाइल') || '').trim(),
    altMobile: String(pick(row, 'altMobile', 'Alternate Mobile', 'वैकल्पिक मोबाइल') || '').trim(),
    address,
    location: village || gramPanchayat || address,
    gender: normalizeGender(pick(row, 'gender', 'Gender', 'लिंग')),
    occupation: pick(row, 'occupation', 'Occupation', 'व्यवसाय'),
    education: pick(row, 'education', 'Education', 'शिक्षा'),
    caste: pick(row, 'caste', 'Caste', 'Cast', 'जाति'),
    subCaste: pick(row, 'subCaste', 'Sub Caste', 'Sub-Caste', 'उपजाति'),
    organizationPost: pick(row, 'organizationPost', 'Post', 'post', 'पद'),
    organizationLevel: pick(row, 'organizationLevel', 'Post Level', 'पद स्तर'),
    supportLevel: pick(row, 'supportLevel', 'Support Level') == null
      ? undefined
      : String(pick(row, 'supportLevel', 'Support Level')).toLowerCase(),
    voterId: pick(row, 'voterId', 'Voter ID', 'EPIC No', 'EPIC Number', 'EPIC', 'मतदाता ID', 'मतदाता पहचान पत्र'),
    voterSerial: pick(row, 'voterSerial', 'Serial', 'Serial No', 'Sl. No. In Part', 'क्रमांक', 'मतदाता क्रमांक', 'क्र', 'क्र.', 'क्रं', 'क्रं.', 'क', 'क.', 'मतदाता क्र.', 'मतदाता क्रं.', 'सरियल', 'सीरियल'),
    guardianName: pick(row, 'guardianName', 'Father/Husband', 's/o, d/o, w/o Name', 'पिता/पति का नाम', 'पिता का नाम', 'पति का नाम'),
    relationType: pick(row, 'relationType', 'RLN Type'),
    houseNumber: pick(row, 'houseNumber', 'House Number', 'घर संख्या', 'गृह संख्या'),
    age,
    estimatedDob: estimateDobFromAge(age),
    assemblyNumber: pick(row, 'assemblyNumber', 'AC No', 'Assembly No', 'विधानसभा संख्या'),
    assemblyName: pick(row, 'assemblyName', 'AC Name', 'Assembly Name', 'vidhansabha', 'विधानसभा'),
    partNumber: pick(row, 'partNumber', 'Part No.', 'Part No', 'भाग संख्या'),
    sectionNumber: pick(row, 'sectionNumber', 'Section Number', 'अनुभाग संख्या'),
    sectionName: legacyLocation(pick(row, 'sectionName', 'Section Name', 'अनुभाग नाम')),
    tehsil,
    gramPanchayat,
    village,
    pinCode: pick(row, 'pinCode', 'PIN Code', 'Pincode'),
    municipality: pick(row, 'municipality', 'Municipality'),
    extraDetails,
  };
};

const cleanImportData = (data) => Object.fromEntries(
  Object.entries(data).filter(([, value]) => (
    value !== undefined
    && value !== null
    && (Array.isArray(value) ? value.length > 0 : String(value).trim() !== '')
  )),
);

const assignNonEmptyFields = (target, source, fields) => {
  for (const field of fields) {
    const value = source?.[field];
    if (
      value !== undefined
      && value !== null
      && (Array.isArray(value) ? value.length > 0 : String(value).trim() !== '')
    ) {
      target[field] = value;
    }
  }
};
const mergeExtraDetails = (current = [], incoming = []) => {
  const merged = new Map();
  [...current, ...incoming].forEach((item) => {
    const label = cleanValue(item?.label);
    const value = cleanValue(item?.value);
    if (label && value) merged.set(label.toLowerCase(), { label, value });
  });
  return [...merged.values()];
};

const getOrCreateArea = async ({ name, type, parent = null, assemblyNumber = '', userId }) => {
  const cleanName = cleanValue(name);
  if (!cleanName) return parent;
  if (!isValidHindiText(cleanName)) return parent;
  const cleanAssemblyNumber = String(assemblyNumber || '').trim();
  if (type === 'assembly' && !isValidAssemblyHeader({ assemblyNumber: cleanAssemblyNumber, assemblyName: cleanName })) {
    return parent;
  }
  const cacheIdentity = type === 'assembly' && cleanAssemblyNumber ? cleanAssemblyNumber : cleanName.toLowerCase();
  const cacheKey = `${String(parent || 'root')}|${type}|${cacheIdentity}`;
  if (areaImportCache.has(cacheKey)) return areaImportCache.get(cacheKey);
  const identityQuery = { parent, type, name: cleanName };
  const query = type === 'assembly' && cleanAssemblyNumber
    ? { parent, type, $or: [{ assemblyNumber: cleanAssemblyNumber }, { name: cleanName }] }
    : identityQuery;
  let area = await Area.findOne(query);
  if (!area && type !== 'assembly') {
    const candidates = await Area.find({ parent, type, active: true }).lean();
    const fuzzy = findBestLocationMatch(cleanName, candidates, {
      minScore: type === 'village' ? 0.84 : 0.88,
      ambiguityMargin: 0.06,
    });
    if (fuzzy) area = await Area.findById(fuzzy.candidate._id);
  }
  if (area) {
    area.active = true;
    if (cleanAssemblyNumber && !area.assemblyNumber) area.assemblyNumber = cleanAssemblyNumber;
    await area.save();
  } else {
    try {
      area = await Area.findOneAndUpdate(
        identityQuery,
        {
          $set: { active: true },
          $setOnInsert: {
            name: cleanName,
            type,
            parent,
            assemblyNumber: cleanAssemblyNumber,
            createdBy: userId,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
    } catch (error) {
      if (error?.code !== 11000) throw error;
      area = await Area.findOne(query);
      if (!area) throw error;
    }
  }
  areaImportCache.set(cacheKey, area._id);
  return area._id;
};

const ensureAreaHierarchy = async (data, userId) => {
  let parent = null;
  const assemblyNumber = String(data.assemblyNumber || '').trim();
  const assemblyName = cleanValue(data.assemblyName);

  if (isValidAssemblyHeader({ assemblyNumber, assemblyName })) {
    const [assemblyByName, assemblyByNumber] = await Promise.all([
      Area.findOne({ parent: null, type: 'assembly', name: assemblyName }),
      Area.findOne({ parent: null, type: 'assembly', assemblyNumber }),
    ]);
    let existingAssembly = assemblyByName || assemblyByNumber;
    if (existingAssembly) {
      existingAssembly.active = true;
      if (assemblyName && isValidHindiText(assemblyName) && (!assemblyByName || assemblyByName.id === existingAssembly.id)) {
        existingAssembly.name = assemblyName;
      }
      if (!existingAssembly.assemblyNumber && (!assemblyByNumber || assemblyByNumber.id === existingAssembly.id)) {
        existingAssembly.assemblyNumber = assemblyNumber;
      }
      try {
        await existingAssembly.save();
      } catch (error) {
        if (error?.code !== 11000 || !assemblyName) throw error;
        existingAssembly = await Area.findOne({ parent: null, type: 'assembly', name: assemblyName });
        if (!existingAssembly) throw error;
      }
      parent = existingAssembly._id;
    } else {
      parent = await getOrCreateArea({
        name: assemblyName,
        type: 'assembly',
        assemblyNumber,
        userId,
      });
    }
  } else if (assemblyNumber) {
    const existing = await Area.findOne({ parent: null, type: 'assembly', assemblyNumber });
    if (existing && isValidHindiText(existing.name)) parent = existing._id;
  } else if (assemblyName && isValidHindiText(assemblyName)) {
    const existing = await Area.findOne({ parent: null, type: 'assembly', name: assemblyName });
    if (existing && isValidHindiText(existing.name)) parent = existing._id;
  }

  if (isValidHindiText(data.tehsil)) {
    parent = await getOrCreateArea({ name: data.tehsil, type: 'tehsil', parent, userId });
  }
  if (isValidHindiText(data.gramPanchayat)) {
    parent = await getOrCreateArea({ name: data.gramPanchayat, type: 'gram_panchayat', parent, userId });
  }
  if (isValidHindiText(data.village)) {
    parent = await getOrCreateArea({ name: data.village, type: 'village', parent, userId });
  }
  return parent;
};

const enrichPdfAreaHierarchy = async (data, hierarchyStart) => {
  const locationText = cleanValue([
    data.village,
    data.sectionName,
    data.address,
    data.location,
  ].filter(Boolean).join(' '));
  if (!data.locationResolution) {
    data.locationResolution = {
      raw: {
        tehsil: cleanValue(data.tehsil),
        gramPanchayat: cleanValue(data.gramPanchayat),
        village: cleanValue(data.village),
        pinCode: cleanValue(data.pinCode),
        sectionName: cleanValue(data.sectionName),
      },
      suggested: {},
      status: 'unmatched',
      confidence: 0,
      matchedAlias: '',
    };
  }
  if (!locationText || !hierarchyStart) return hierarchyStart;
  const cacheKey = `${String(hierarchyStart)}|${cleanValue(data.gramPanchayat)}|${cleanValue(data.pinCode)}|${locationText}`;
  if (pdfAreaHierarchyCache.has(cacheKey)) {
    const cached = pdfAreaHierarchyCache.get(cacheKey);
    Object.assign(data, cached.fields);
    data.locationResolution.suggested = {
      tehsil: cached.fields.tehsil,
      gramPanchayat: cached.fields.gramPanchayat,
      village: cached.fields.village,
      pinCode: cached.fields.pinCode,
    };
    data.locationResolution.status = 'suggested';
    data.locationResolution.confidence = cached.fields.locationMatchConfidence;
    data.locationResolution.matchedAlias = cached.fields.locationMatchedAlias;
    data.locationResolution.reviewNote = cached.fields.locationReviewNote || '';
    return cached.area;
  }

  const start = await Area.findById(hierarchyStart).lean();
  if (!start) return hierarchyStart;
  let tehsils = [];
  if (start.type === 'tehsil') tehsils = [start];
  else if (start.type === 'assembly') {
    tehsils = await Area.find({ parent: start._id, type: 'tehsil', active: true }).lean();
  } else {
    const tehsil = start.type === 'gram_panchayat'
      ? await Area.findById(start.parent).lean()
      : null;
    if (tehsil?.type === 'tehsil') tehsils = [tehsil];
  }
  if (!tehsils.length) return hierarchyStart;

  let tehsil = tehsils.length === 1 ? tehsils[0] : null;
  if (data.tehsil) {
    tehsil = findBestLocationMatch(data.tehsil, tehsils, { minScore: 0.86 })?.candidate || tehsil;
  }
  if (!tehsil) return hierarchyStart;

  const gramPanchayats = await Area.find({ parent: tehsil._id, type: 'gram_panchayat', active: true }).lean();
  let gramPanchayat = null;
  if (data.gramPanchayat) {
    gramPanchayat = findBestLocationMatch(data.gramPanchayat, gramPanchayats)?.candidate || null;
  }

  const villageQuery = { type: 'village', active: true };
  if (gramPanchayat) villageQuery.parent = gramPanchayat._id;
  else villageQuery.parent = { $in: gramPanchayats.map((item) => item._id) };
  const villages = await Area.find(villageQuery).lean();
  const villageInput = cleanValue(data.village) || locationText;
  const villageMatch = findBestLocationMatch(villageInput, villages, {
    minScore: cleanValue(data.village) ? 0.82 : 0.88,
    ambiguityMargin: 0.06,
  });
  if (!villageMatch) return hierarchyStart;
  const village = villageMatch.candidate;
  if (!gramPanchayat) {
    gramPanchayat = gramPanchayats.find((item) => String(item._id) === String(village.parent));
  }
  if (!gramPanchayat) return hierarchyStart;

  const rawPinCode = cleanValue(data.pinCode);
  const masterPinCode = cleanValue(village.pinCode || gramPanchayat.pinCode);
  data.tehsil = tehsil.name;
  data.gramPanchayat = gramPanchayat.name;
  data.village = village.name;
  if (masterPinCode) data.pinCode = masterPinCode;
  data.locationMatchConfidence = Math.round(villageMatch.score * 100);
  data.locationResolution.suggested = {
    tehsil: data.tehsil,
    gramPanchayat: data.gramPanchayat,
    village: data.village,
    pinCode: data.pinCode,
  };
  data.locationResolution.status = 'suggested';
  data.locationResolution.confidence = data.locationMatchConfidence;
  data.locationResolution.matchedAlias = villageMatch.matchedValue || village.name;
  if (rawPinCode && masterPinCode && rawPinCode !== masterPinCode) {
    data.locationResolution.reviewNote = `PDF PIN ${rawPinCode}; master PIN ${masterPinCode}`;
  }
  const fields = {
    tehsil: data.tehsil,
    gramPanchayat: data.gramPanchayat,
    village: data.village,
    pinCode: data.pinCode,
    locationMatchConfidence: data.locationMatchConfidence,
    locationMatchedAlias: data.locationResolution.matchedAlias,
    locationReviewNote: data.locationResolution.reviewNote || '',
  };
  pdfAreaHierarchyCache.set(cacheKey, { area: village._id, fields });
  return village._id;
};
const assertReadablePdf = (filePath) => {
  const buffer = fs.readFileSync(filePath);
  if (buffer.length < 8 || buffer.slice(0, 5).toString('ascii') !== '%PDF-') {
    const err = new Error('Uploaded file is not a valid PDF. Please upload the original voter-list PDF, not a renamed or incomplete file.');
    err.status = 400;
    throw err;
  }
  return buffer;
};
const isObjectId = (value) => /^[a-f\d]{24}$/i.test(String(value || ''));

const resolveWard = async (value) => {
  if (!value || isObjectId(value)) return value;
  const text = String(value).trim();
  const ward = await Ward.findOne({ $or: [{ number: text }, { name: new RegExp(`^${text}$`, 'i') }] });
  return ward?._id;
};

const resolveBooth = async (value, ward) => {
  if (!value || isObjectId(value)) return value;
  const text = String(value).trim();
  const query = { $or: [{ number: text }, { name: new RegExp(`^${text}$`, 'i') }] };
  if (ward) query.ward = ward;
  const booth = await Booth.findOne(query);
  return booth?._id;
};

const getOrCreateImportScope = async ({ user, body, firstMember }) => {
  if (user.role === 'booth') {
    return {
      ward: user.assignedBooth?.ward,
      booth: user.assignedBooth?._id || user.assignedBooth,
    };
  }
  if (user.role === 'ward_head') {
    const ward = user.assignedWard?._id || user.assignedWard;
    const booth = await resolveBooth(body.booth || firstMember?.partNumber || 'default', ward);
    if (booth) return { ward, booth };
    const createdBooth = await Booth.create({
      ward,
      number: String(firstMember?.partNumber || '1'),
      name: `Part ${firstMember?.partNumber || '1'}`,
      area: firstMember?.assemblyName || firstMember?.sectionName,
    });
    return { ward, booth: createdBooth._id };
  }

  let ward = await resolveWard(body.ward);
  const targetWardNumber = firstMember?.wardNumber || firstMember?.assemblyNumber;
  if (!ward && targetWardNumber) {
    const wardSet = { active: true };
    const wardInsert = {
      number: String(targetWardNumber),
    };
    if (firstMember.wardNumber) {
      wardSet.name = `Ward ${firstMember.wardNumber}`;
      wardSet.area = firstMember.assemblyName || firstMember.sectionName || `Ward ${firstMember.wardNumber}`;
    } else if (firstMember.assemblyName) {
      wardSet.name = firstMember.assemblyName;
      wardSet.area = firstMember.assemblyName;
    } else {
      wardInsert.name = `Assembly ${firstMember.assemblyNumber}`;
    }
    const createdWard = await Ward.findOneAndUpdate(
      { number: String(targetWardNumber) },
      {
        $set: wardSet,
        $setOnInsert: wardInsert,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    ward = createdWard._id;
  }

  let booth = await resolveBooth(body.booth, ward);
  if (!booth && ward) {
    const number = String(firstMember?.partNumber || body.booth || '1');
    const createdBooth = await Booth.findOneAndUpdate(
      { ward, number },
      {
        ward,
        number,
        name: `Part ${number}`,
        area: firstMember?.assemblyName || firstMember?.sectionName,
        address: firstMember?.assemblyName || firstMember?.sectionName,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    booth = createdBooth._id;
  }
  return { ward, booth };
};

const parseHeader = (text) => {
  const normalized = String(text || '')
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim();
  const assembly = normalized.match(
    /(?:विधान\s*सभा\s*(?:क्षेत्र)?|assembly\s*(?:constituency)?|AC)[^:：\n]{0,110}[:：-]?\s*([0-9O०-९]{1,3})\s*(?:[-–:]\s*)?(.+?)(?=\s*(?:अनुभाग|भाग\s*(?:संख्या|नं)|section|part\s*(?:number|no)|निर्वाचक)|$)/i,
  );
  const part = normalized.match(
    /(?:भाग|part)\s*(?:संख्या|नं\.?|number|no\.?)?\s*[:：\s-]+\s*([0-9O\u0966-\u096f]{1,4})/i,
  );
  const section = normalized.match(
    /(?:अनुभाग|section|SUT|UM|UT|SU|अिुभाग|अनुमाग)\s*(?:की)?\s*(?:संख्या|नं\.?|number|no\.?)?\s*(?:व|एवं|and)?\s*(?:नाम|name)?\s*[:：;\-]*\s*([0-9O\u0966-\u096f]{1,3})?\s*(?:[-–:]\s*)?(.+?)(?=\s*(?:भाग\s*(?:संख्या|नं)|निर्वाचक|मतदाता|part\s*(?:number|no))|$)/i,
  );
  const wardMatch = normalized.match(
    /(?:वार्ड\s*(?:संख्या|नं\.?|number|no\.?)?|ward)\s*[:：-]*\s*(?:वार्ड\s*संख्या\s*)?([0-9O\u0966-\u096f]{1,4})/i,
  );
  const digits = (value) => value?.replace(/O/gi, '0').replace(/[०-९]/g, (digit) => '०१२३४५६७८९'.indexOf(digit));
  return {
    assemblyNumber: digits(assembly?.[1]),
    assemblyName: cleanValue(assembly?.[2]),
    partNumber: digits(part?.[1]),
    sectionNumber: digits(section?.[1]),
    sectionName: cleanValue(section?.[2]),
    wardNumber: digits(wardMatch?.[1]),
  };
};

const extractVoterId = (chunk) => {
  const compact = chunk
    .toUpperCase()
    .replace(/[|\\]/g, '/')
    .replace(/[^A-Z0-9/]/g, '')
    .replace(/\s+/g, '');
  const modern = compact.match(/[A-Z]{3}[0-9O]{7}/)?.[0];
  if (modern) {
    return `${modern.slice(0, 3)}${modern.slice(3).replace(/O/g, '0')}`;
  }
  const legacy = compact.match(/RJ\/[0-9O]{1,3}\/[0-9O]{1,3}\/[0-9O]{5,8}/)?.[0];
  return legacy?.replace(/O/g, '0');
};

const parseHindiVoterRoll = (text, headerOverride) => {
  const header = headerOverride || parseHeader(text);
  const normalized = text.replace(/\r/g, '\n');
  const serialMatches = [...normalized.matchAll(/(?:^|\n)\s*(\d{1,6})\s*(?:\n|\s)+(?:\d{1,4}\s*)?(SNE|RJ\/|MBY|[A-Z]{2,4})/g)];
  const chunks = [];
  for (let i = 0; i < serialMatches.length; i += 1) {
    const start = serialMatches[i].index;
    const end = serialMatches[i + 1]?.index || normalized.length;
    chunks.push(normalized.slice(start, end));
  }
  const fallbackChunks = chunks.length ? chunks : normalized.split(/(?=निर्वाचक\S*\s+का\s+नाम)/);

  return fallbackChunks.map((chunk) => {
    const voterId = extractVoterId(chunk);
    const serial = chunk.match(/^\s*(\d{1,6})/m)?.[1];
    const name = chunk.match(/(?:निर्वाचक\S*|मतदाता)\s*(?:का)?\s*नाम\s*[:：-]?\s*([^\n]+)/)?.[1];
    const father = chunk.match(/(?:पिता|पि\S*)\s*(?:का)?\s*नाम\s*[:：-]?\s*([^\n]+)/)?.[1];
    const husband = chunk.match(/(?:पति|पत्ति|प्रति)\s*(?:का)?\s*नाम\s*[:：-]?\s*([^\n]+)/)?.[1];
    const mother = chunk.match(/माता\s+का\s+नाम\s*[:：-]?\s*([^\n]+)/)?.[1];
    const house = chunk.match(/गृह\s*संख्या\s*[:：-]?\s*([^\n]+)/)?.[1];
    const age = chunk.match(/(?:उम्र|उप्र|आयु)\s*[:：-]?\s*([0-9]{1,3})/i)?.[1];
    const genderText = chunk.match(/लिंग\s*[:：-]?\s*([^\n\s]+)/)?.[1];
    const cleanOcrField = (value) => cleanValue(value)
      .replace(/\s+(?:of|fire|fra|rs|गृह|उम्र|लिंग)\b.*$/i, '')
      .replace(/[|\\]+$/g, '')
      .trim();
    const guardianName = cleanOcrField(father || husband || mother || '');
    const relationType = father ? 'father' : husband ? 'husband' : mother ? 'mother' : '';
    const gender = /\u092A\u0941\u0930\u0941\u0937/.test(genderText || '') ? 'male' : /\u092E\u0939\u093F\u0932\u093E/.test(genderText || '') ? 'female' : '';
    const cleanName = cleanOcrField(name);
    const devanagariCount = (cleanName.match(/[\u0900-\u097F]/g) || []).length;
    const latinCount = (cleanName.match(/[A-Za-z]/g) || []).length;
    if (
      !cleanName
      || devanagariCount < 2
      || latinCount > devanagariCount
      || /^(?:ASSEMBLYNUMBER|PARTNUMBER|SECTIONNUMBER)$/i.test(cleanName)
    ) return null;
    return {
      ...header,
      voterSerial: serial,
      voterId,
      name: cleanName,
      mobile: '',
      guardianName,
      relationType,
      houseNumber: cleanOcrField(house),
      address: [header.sectionName || header.assemblyName, cleanOcrField(house)].filter(Boolean).join(', '),
      location: header.sectionName || header.assemblyName || '',
      age: age ? Number(age) : undefined,
      estimatedDob: estimateDobFromAge(age),
      gender,
      rawText: chunk.trim(),
    };
  }).filter(Boolean);
};

const extractTextWithFallback = async (filePath, importFileName, onOcrProgress) => {
  const pdfBuffer = assertReadablePdf(filePath);
  const extractionErrors = [];
  try {
    const pdfParse = require('pdf-parse');
    const parsed = await pdfParse(pdfBuffer);
    if (parsed.text?.trim().length > 40) return { text: parsed.text, ocr: null };
  } catch (firstError) {
    extractionErrors.push('pdf-parse: ' + firstError.message);
    const originalConsoleWarn = console.warn;
    const originalConsoleError = console.error;
    try {
      const PDFParser = require('pdf2json');
      const text = await new Promise((resolve, reject) => {
        const parser = new PDFParser();
        parser.on('pdfParser_dataError', (error) => reject(error.parserError || error));
        parser.on('pdfParser_dataReady', (data) => {
          const pageText = (data.Pages || []).flatMap((page) => (
            page.Texts || []
          ).map((item) => (
            item.R || []
          ).map((run) => decodeURIComponent(run.T || '')).join(''))).join('\n');
          resolve(pageText);
        });
        console.warn = () => {};
        console.error = () => {};
        try {
          parser.loadPDF(filePath);
        } catch (error) {
          reject(error);
        }
      });
      if (text?.trim().length > 40) return { text, ocr: null };
    } catch (secondError) {
      extractionErrors.push('pdf2json: ' + secondError.message);
    } finally {
      console.warn = originalConsoleWarn;
      console.error = originalConsoleError;
    }
  }
  try {
    const ocr = await ocrPdf(filePath, importFileName, { onProgress: onOcrProgress });
    return { text: ocr.text, ocr };
  } catch (ocrError) {
    const detail = [...extractionErrors, 'OCR: ' + ocrError.message].filter(Boolean).join(' | ');
    const corruptHint = /trailer dictionary|xref|Invalid PDF|bad XRef|endobj/i.test(detail)
      ? ' The PDF appears damaged or incomplete; download/export it again and retry.'
      : '';
    const err = new Error('PDF text extraction and OCR failed.' + corruptHint + ' Ensure Poppler/Tesseract are installed and PDFTOPPM_PATH, TESSERACT_PATH, and Hindi language data are configured. Detail: ' + detail);
    err.status = 400;
    throw err;
  }
};

const parsePdfTextLayerMembers = async (filePath) => {
  const pdfjs = require('pdf-parse/lib/pdf.js/v1.10.100/build/pdf.js');
  const document = await pdfjs.getDocument(new Uint8Array(fs.readFileSync(filePath)));
  const members = [];
  const documentText = [];
  const imageOnlyPages = [];
  let documentHeader = {};

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent({ normalizeWhitespace: true, disableCombineTextItems: false });
    const items = content.items
      .map((item) => ({ text: String(item.str || ''), x: item.transform?.[4], y: item.transform?.[5] }))
      .filter((item) => item.text.trim() && Number.isFinite(item.x) && Number.isFinite(item.y));
    if (!items.length) imageOnlyPages.push(pageNumber);
    const width = page.view[2] - page.view[0];
    const height = page.view[3] - page.view[1];
    const orderedItems = items
      .slice()
      .sort((a, b) => Math.abs(b.y - a.y) > 1 ? b.y - a.y : a.x - b.x);
    const pageText = orderedItems.map((item) => item.text).join(' ');
    const headerText = orderedItems
      .filter((item) => item.y >= height * 0.955)
      .map((item) => item.text)
      .join(' ');
    documentText.push(pageText);
    const pageHeader = parseHeader(headerText);
    documentHeader = {
      ...documentHeader,
      ...Object.fromEntries(Object.entries(pageHeader).filter(([, value]) => value)),
    };

    const gridTop = height * 0.969;
    const rowStep = height * 0.094;
    const cards = Array.from({ length: 30 }, () => []);
    for (const item of items) {
      const column = item.x < width / 3 ? 0 : item.x < (width * 2) / 3 ? 1 : 2;
      const row = Math.floor((gridTop - item.y) / rowStep);
      if (row >= 0 && row < 10) cards[row * 3 + column].push(item);
    }

    for (const cardItems of cards) {
      if (!cardItems.length) continue;
      const lines = [];
      for (const item of cardItems.sort((a, b) => Math.abs(b.y - a.y) > 1 ? b.y - a.y : a.x - b.x)) {
        let line = lines.find((entry) => Math.abs(entry.y - item.y) <= 1.2);
        if (!line) {
          line = { y: item.y, items: [] };
          lines.push(line);
        }
        line.items.push(item);
      }
      const cardText = lines
        .sort((a, b) => b.y - a.y)
        .map((line) => line.items.sort((a, b) => a.x - b.x).map((item) => item.text).join(''))
        .join('\n');
      const voterId = extractVoterId(cardText);
      const name = cleanValue(cardText.match(/(?:निर्वाचक|मतदाता)\s*(?:का)?\s*नाम\s*[:：ः-]?\s*([^\n]+)/i)?.[1]);
      if (!name || !voterId) continue;
      const father = cleanValue(cardText.match(/पिता\s*(?:का)?\s*नाम\s*[:：ः-]?\s*([^\n]+)/i)?.[1]);
      const husband = cleanValue(cardText.match(/पति\s*(?:का)?\s*नाम\s*[:：ः-]?\s*([^\n]+)/i)?.[1]);
      const mother = cleanValue(cardText.match(/माता\s*(?:का)?\s*नाम\s*[:：ः-]?\s*([^\n]+)/i)?.[1]);
      const houseNumber = cleanValue(cardText.match(/(?:गृह|मकान)\s*संख्या\s*[:：-]?\s*([^\n]+)/i)?.[1]);
      const ageText = cardText.match(/(?:उम्र|आयु)\s*[:：-]?\s*(\d{1,3})/i)?.[1];
      const serial = cardText.match(/^\s*(\d{1,4})/)?.[1];
      const header = {
        ...documentHeader,
        ...Object.fromEntries(Object.entries(pageHeader).filter(([, value]) => value)),
      };
      members.push({
        ...header,
        name,
        mobile: '',
        voterId,
        voterSerial: serial,
        guardianName: father || husband || mother || '',
        relationType: father ? 'father' : husband ? 'husband' : mother ? 'mother' : '',
        houseNumber,
        age: ageText ? Number(ageText) : undefined,
        estimatedDob: estimateDobFromAge(ageText),
        gender: /महिला/.test(cardText) ? 'female' : /पुरुष/.test(cardText) ? 'male' : '',
        address: [header.sectionName || header.assemblyName, houseNumber].filter(Boolean).join(', '),
        location: header.sectionName || header.assemblyName || '',
        rawText: cardText,
      });
    }
  }
  const normalizedMembers = members.map((member) => ({
    ...member,
    assemblyNumber: member.assemblyNumber || documentHeader.assemblyNumber,
    assemblyName: member.assemblyName || documentHeader.assemblyName,
    partNumber: member.partNumber || documentHeader.partNumber,
  }));
  return { text: documentText.join('\n'), members: normalizedMembers, imageOnlyPages, header: documentHeader };
};
const parsePdfMembers = async (filePath, importFileName, onOcrProgress) => {
  const textLayer = await parsePdfTextLayerMembers(filePath);
  if (textLayer.members.length) {
    // Always run Python OCR pipeline to extract voter photos, card images, and 7-rule house numbers
    const ocr = await ocrPdf(filePath, importFileName, { onProgress: onOcrProgress });
    const header = { ...(ocr.header || {}), ...textLayer.header };
    const sectionNames = new Map();
    for (const member of textLayer.members) {
      if (member.sectionNumber && member.sectionName && !sectionNames.has(String(member.sectionNumber))) {
        sectionNames.set(String(member.sectionNumber), member.sectionName);
      }
    }
    const headerSectionMap = header.sectionMap && typeof header.sectionMap === 'object' ? header.sectionMap : {};
    const useHeaderSectionFallback = Object.keys(headerSectionMap).length <= 1;
    const ocrMembers = (ocr.voterRecords || []).map((record) => {
      let recSecName = cleanSectionName(record.sectionName || '');
      let sectionNumber = record.sectionNumber;
      let sectionName = '';

      if (recSecName && headerSectionMap && Object.keys(headerSectionMap).length > 0) {
        const entry = Object.entries(headerSectionMap).find(([k, v]) => {
          const cv = cleanSectionName(v);
          return cv === recSecName || cv.includes(recSecName) || recSecName.includes(cv);
        });
        if (entry) {
          sectionNumber = entry[0];
          sectionName = entry[1];
        } else {
          sectionName = recSecName;
        }
      }

      if (!sectionName) {
        const secKey = String(sectionNumber || (useHeaderSectionFallback ? header.sectionNumber : ''));
        const mappedName = secKey ? headerSectionMap[secKey] : '';
        sectionName = mappedName || sectionNames.get(secKey) || recSecName || (useHeaderSectionFallback ? header.sectionName : '');
      }
      if (!sectionNumber && useHeaderSectionFallback) sectionNumber = header.sectionNumber;
      const finalSecKey = String(sectionNumber || '');
      if (finalSecKey && sectionName && !sectionNames.has(finalSecKey)) sectionNames.set(finalSecKey, sectionName);
      return {
        ...header,
        assemblyNumber: header.assemblyNumber || record.assemblyNumber,
        assemblyName: header.assemblyName || record.assemblyName,
        partNumber: header.partNumber || record.partNumber,
        sectionNumber: sectionNumber || record.sectionNumber || '',
        sectionName: sectionName || header.sectionName || '',
        name: record.name || '',
        guardianName: record.guardianName || '',
        relationType: record.relationType || '',
        houseNumber: cleanValue(record.houseNumber),
        age: record.age,
        estimatedDob: estimateDobFromAge(record.age),
        gender: record.gender || '',
        voterSerial: record.voterSerial || undefined,
        voterId: record.voterId || undefined,
        mobile: '',
        address: [sectionName || header.assemblyName, cleanValue(record.houseNumber)].filter(Boolean).join(', '),
        location: sectionName || header.assemblyName || '',
        photo: record.photo,
        cardImage: record.cardImage || '',
        rawText: record.rawText || record.text,
        ocrConfidence: record.confidence,
        houseNumberConfidence: record.houseNumberConfidence,
        locationMatchConfidence: record.locationMatchConfidence,
        locationResolution: record.locationResolution,
        ocrNeedsReview: Boolean(record.needsReview),
        ocrReviewReasons: Array.isArray(record.reviewReasons) ? record.reviewReasons : [],
        ocrValidationPassed: Boolean(record.validationPassed),
        ocrFieldConfidence: record.fieldConfidence || {},
        ocrValues: {
          raw: record.rawFields || {},
          suggested: record.suggestedFields || {},
          verified: {},
          status: 'suggested',
        },
      };
    });
    const mergedMap = new Map();
    const serialMap = new Map();

    for (const member of textLayer.members) {
      const epic = normalizeEpic(member.voterId);
      const key = epic || `text-${member.voterSerial || Math.random()}`;
      mergedMap.set(key, { ...member, voterId: epic || member.voterId });
      const serial = Number(member.voterSerial);
      if (!isNaN(serial) && serial > 0) {
        serialMap.set(serial, key);
      }
    }

    for (const ocrMem of ocrMembers) {
      const ocrEpic = normalizeEpic(ocrMem.voterId);
      const serial = Number(ocrMem.voterSerial);

      let targetKey = ocrEpic && mergedMap.has(ocrEpic) ? ocrEpic : null;
      if (!targetKey && !isNaN(serial) && serial > 0 && serialMap.has(serial)) {
        targetKey = serialMap.get(serial);
      }

      if (targetKey && mergedMap.has(targetKey)) {
        const prev = mergedMap.get(targetKey);
        const preferredEpic = isValidEpic(ocrEpic) ? ocrEpic : (isValidEpic(prev.voterId) ? prev.voterId : (ocrEpic || prev.voterId));
        mergedMap.set(targetKey, {
          ...ocrMem,
          ...prev,
          voterId: preferredEpic,
          voterSerial: prev.voterSerial || ocrMem.voterSerial,
          houseNumber: cleanValue(ocrMem.houseNumber) || cleanValue(prev.houseNumber),
          photo: ocrMem.photo || prev.photo || '',
          cardImage: ocrMem.cardImage || prev.cardImage || '',
          ocrValues: ocrMem.ocrValues || prev.ocrValues,
          ocrConfidence: ocrMem.ocrConfidence || prev.ocrConfidence,
          locationResolution: ocrMem.locationResolution || prev.locationResolution,
        });
      } else {
        const key = ocrEpic || `ocr-${serial || Math.random()}`;
        mergedMap.set(key, {
          ...ocrMem,
          voterId: ocrEpic || ocrMem.voterId,
        });
      }
    }

    return { text: `${textLayer.text}\n${ocr.text || ''}`, members: [...mergedMap.values()], ocr };
  }
  const extracted = await extractTextWithFallback(filePath, importFileName, onOcrProgress);
  let text = String(extracted?.text || '');
  const header = {
    ...parseHeader(text),
    ...(extracted.ocr?.header || {}),
  };
  header.assemblyName = cleanHeaderName(header.assemblyName, /भाग\s*संख्या|अनुभाग/i);
  header.sectionName = cleanHeaderName(header.sectionName, /भाग\s*संख्या|विधान\s*सभा/i);
  const voterRollMembers = extracted.ocr?.voterRecords?.length
    ? extracted.ocr.voterRecords.flatMap((record) => (
      record.name
        ? [{
          ...header,
          name: record.name,
          assemblyNumber: record.assemblyNumber || header.assemblyNumber || '',
          assemblyName: record.assemblyName || header.assemblyName || '',
          partNumber: record.partNumber || header.partNumber || '',
          sectionNumber: record.sectionNumber || '',
          sectionName: record.sectionName || '',
          guardianName: record.guardianName || '',
          relationType: record.relationType || '',
          houseNumber: cleanValue(record.houseNumber),
          age: record.age,
          estimatedDob: estimateDobFromAge(record.age),
          gender: record.gender || '',
          voterSerial: record.voterSerial || undefined,
          voterId: record.voterId || undefined,
          mobile: '',
          address: [header.sectionName || header.assemblyName, cleanValue(record.houseNumber)].filter(Boolean).join(', '),
          location: header.sectionName || header.assemblyName || '',
          photo: record.photo,
          cardImage: record.cardImage || '',
          rawText: record.rawText || record.text,
          ocrConfidence: record.confidence,
        houseNumberConfidence: record.houseNumberConfidence,
        locationMatchConfidence: record.locationMatchConfidence,
        locationResolution: record.locationResolution,
        ocrNeedsReview: Boolean(record.needsReview),
        ocrReviewReasons: Array.isArray(record.reviewReasons) ? record.reviewReasons : [],
        ocrValidationPassed: Boolean(record.validationPassed),
        ocrFieldConfidence: record.fieldConfidence || {},
        ocrValues: {
          raw: record.rawFields || {},
          suggested: record.suggestedFields || {},
          verified: {},
          status: 'suggested',
        },
        }]
        : parseHindiVoterRoll(record.text || record.rawText || '', header)
          .map((member) => ({ ...member, ...header, photo: record.photo }))
    ))
    : parseHindiVoterRoll(text);
  if (voterRollMembers.length) return { text, members: voterRollMembers, ocr: extracted.ocr };

  const members = [];
  let current = {};
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  for (const line of lines) {
    const mobile = line.match(/(?:\+91[-\s]?)?[6-9]\d{9}/);
    if (mobile) current.mobile = mobile[0].replace(/\D/g, '').slice(-10);
    if (/name\s*:/i.test(line)) current.name = line.split(/name\s*:/i)[1].trim();
    if (/address\s*:/i.test(line)) current.address = line.split(/address\s*:/i)[1].trim();
    if (/location|area\s*:/i.test(line)) current.location = line.split(/:\s*/).slice(1).join(':').trim();
    if (/party/i.test(line)) current.partyText = line;
    if (current.name && current.mobile) {
      members.push({ ...current, rawText: line });
      current = {};
    }
  }
  if (members.length || extracted.ocr) return { text, members, ocr: extracted.ocr };

  try {
    const ocr = await ocrPdf(filePath, importFileName, { onProgress: onOcrProgress });
    text = ocr.text;
    const ocrMembers = parseHindiVoterRoll(text);
    return { text, members: ocrMembers, ocr };
  } catch (ocrError) {
    const err = new Error(`PDF contained no readable voter records and OCR failed. Detail: ${ocrError.message}`);
    err.status = 400;
    throw err;
  }
};

const extractPdfImages = async (filePath, importFileName) => {
  const pdfimages = commandFromEnv('PDFIMAGES_PATH', 'pdfimages');
  const safeBase = path.basename(importFileName, path.extname(importFileName)).replace(/[^a-z0-9_-]/gi, '-');
  const imageId = `${Date.now()}-${safeBase}`;
  const imageDir = uploadFilePath('pdf-images', imageId);
  fs.mkdirSync(imageDir, { recursive: true });
  const prefix = path.join(imageDir, 'photo');

  try {
    await new Promise((resolve, reject) => {
      const child = spawn(pdfimages, ['-png', filePath, prefix], { windowsHide: true });
      let stderr = '';
      child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
      child.on('error', reject);
      child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(stderr || `pdfimages exited with code ${code}`))));
    });
  } catch (error) {
    return {
      images: [],
      status: `Photo extraction skipped. Install Poppler and set PDFIMAGES_PATH. Detail: ${error.message}`,
    };
  }

  const files = fs.readdirSync(imageDir)
    .filter((file) => /\.(png|jpg|jpeg)$/i.test(file))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map((file) => uploadPublicPath('pdf-images', imageId, file));

  return {
    images: files,
    status: files.length ? `Extracted ${files.length} image(s) from PDF.` : 'No embedded images found in PDF.',
  };
};
const AUTO_FAMILY_MAX_MEMBERS = Math.max(2, Number(process.env.AUTO_FAMILY_MAX_MEMBERS || 15));
const normalizeFamilyHouse = (value) => cleanValue(value)
  .replace(/[०-९]/g, (digit) => String('०१२३४५६७८९'.indexOf(digit)))
  .replace(/\s+/g, '')
  .toLowerCase();
const escapeFamilyRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const rebuildFamiliesForMembers = async (members, userId) => {
  const targets = new Map();
  for (const member of members) {
    const houseNumber = normalizeFamilyHouse(member.houseNumber);
    if (!houseNumber) continue;
    const sectionNumber = cleanValue(member.sectionNumber);
    const sectionName = cleanValue(member.sectionName);
    const section = cleanValue(sectionNumber || sectionName || 'no-section').toLowerCase();
    const groupingKey = `${member.booth || ''}:${section}:${houseNumber}`;
    if (!targets.has(groupingKey)) {
      targets.set(groupingKey, {
        groupingKey,
        booth: member.booth,
        houseNumber,
        rawHouseNumber: cleanValue(member.houseNumber),
        sectionNumber,
        sectionName,
      });
    }
  }

  let rebuilt = 0;
  for (const target of targets.values()) {
    const query = {
      booth: target.booth,
      houseNumber: new RegExp(`^${escapeFamilyRegex(target.rawHouseNumber)}$`, 'i'),
    };
    if (target.sectionNumber) query.sectionNumber = target.sectionNumber;
    else if (target.sectionName) query.sectionName = target.sectionName;
    else query.$or = [
      { sectionNumber: '' },
      { sectionNumber: null },
      { sectionNumber: { $exists: false } },
    ];
    const fullGroup = await Member.find(query);
    if (!fullGroup.length || fullGroup.length > AUTO_FAMILY_MAX_MEMBERS) continue;
    const head = [...fullGroup].sort((a, b) => (Number(b.age) || 0) - (Number(a.age) || 0))[0];
    await Family.findOneAndUpdate(
      { groupingKey: target.groupingKey },
      {
        $set: {
          source: 'auto',
          groupingKey: target.groupingKey,
          familyHead: head._id,
          headName: head.name,
          houseNumber: normalizeFamilyHouse(head.houseNumber),
          sectionNumber: cleanValue(head.sectionNumber),
          sectionName: cleanValue(head.sectionName),
          address: head.address,
          ward: head.ward,
          booth: head.booth,
          members: fullGroup.map((member) => member._id),
          updatedBy: userId,
        },
        $setOnInsert: { createdBy: userId },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    rebuilt += 1;
  }
  return rebuilt;
};
exports.importMembers = async (req, res, next) => {
  const uploadId = progressId(req);
  try {
    setProgress(uploadId, { status: 'processing', stage: 'Reading Excel/CSV file', imported: 0, skipped: 0, processed: 0, total: 0 });
    if (!req.file) return res.status(400).json({ message: 'Excel/CSV file required' });
    const workbook = XLSX.readFile(req.file.path);
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
    setProgress(uploadId, { stage: 'Importing voter rows', total: rows.length });
    if (!rows.length) return res.status(400).json({ message: 'Excel/CSV file has no voter rows.' });
    const firstMember = cleanImportData(normalize(rows[0]));
    const { ward, booth } = await getOrCreateImportScope({
      user: req.currentUser,
      body: req.body,
      firstMember,
    });
    if (!ward || !booth) {
      return res.status(400).json({
        message: 'Excel se Vidhan Sabha/Part detect nahi hua. AC No aur Part No columns rakhein, ya ward/booth select karein.',
      });
    }
    assertBoothAccess(req.currentUser, booth);
    assertWardAccess(req.currentUser, ward);

    const affected = [];
    const skipped = [];
    let createdCount = 0;
    let updatedCount = 0;
    let matchedCount = 0;
    let filledFieldCount = 0;
    let correctedFieldCount = 0;
    let conflictCount = 0;
    let reviewRequired = 0;
    const fieldStats = { filled: {}, corrected: {}, conflicts: {} };
    const addFieldStats = (bucket, fields) => {
      for (const field of fields) bucket[field] = (bucket[field] || 0) + 1;
    };
    let processed = 0;
    const sourceType = req.file.mimetype === 'text/csv' ? 'csv' : 'excel';
    const sourceFile = `/uploads/${req.file.filename}`;
    for (const row of rows) {
      const data = cleanImportData(normalize(row));
      data.assemblyNumber ||= firstMember.assemblyNumber;
      data.assemblyName ||= firstMember.assemblyName;
      data.partNumber ||= firstMember.partNumber;
      data.voterId = normalizeEpic(data.voterId);
      if (data.relationType) {
        const relation = String(data.relationType).trim().toLowerCase();
        data.relationType = ({
          f: 'father', father: 'father',
          h: 'husband', husband: 'husband',
          m: 'mother', mother: 'mother',
        })[relation] || 'other';
      }
      if (!data.name) {
        skipped.push({ row, reason: 'Name missing' });
        processed += 1;
        setProgress(uploadId, { processed, imported: affected.length, skipped: skipped.length });
        continue;
      }
      if (!isValidEpic(data.voterId)) {
        skipped.push({ row, reason: 'Valid EPIC number required' });
        processed += 1;
        setProgress(uploadId, { processed, imported: affected.length, skipped: skipped.length });
        continue;
      }
      data.area = await ensureAreaHierarchy(data, req.currentUser._id);
      const existing = await Member.findOne({ voterId: data.voterId });
      if (existing) {
        matchedCount += 1;
        const current = existing.toObject();
        const merge = buildSafeExcelMerge(current, data);
        const extraDetails = mergeExtraDetails(existing.extraDetails, data.extraDetails);
        const extraDetailsChanged = JSON.stringify(existing.extraDetails || []) !== JSON.stringify(extraDetails);
        Object.assign(existing, merge.updates);
        if (!existing.booth) existing.booth = booth;
        if (!existing.ward) existing.ward = ward;
        if (extraDetailsChanged) existing.extraDetails = extraDetails;
        existing.updatedBy = req.currentUser._id;

        if (merge.corrected.length) {
          const currentOcrValues = existing.ocrValues?.toObject?.() || existing.ocrValues || {};
          existing.ocrValues = {
            raw: currentOcrValues.raw || {},
            suggested: {
              ...(currentOcrValues.suggested || {}),
              ...Object.fromEntries(merge.corrected.map((field) => [field, data[field]])),
            },
            verified: currentOcrValues.verified || {},
            status: 'suggested',
          };
          if (existing.verificationStatus !== 'duplicate') existing.verificationStatus = 'needs_review';
        }

        if (merge.conflicts.length) {
          const incomingConflicts = Object.fromEntries(
            merge.conflicts.map((item) => [item.field, item.incoming]),
          );
          const existingConflicts = Object.fromEntries(
            merge.conflicts.map((item) => [item.field, item.existing]),
          );
          await ImportReview.create({
            sourceType,
            sourceFile,
            reason: `Excel EPIC match has ${merge.conflicts.length} protected field conflict(s)`,
            rawData: { voterId: existing.voterId, existing: existingConflicts },
            suggestedData: { voterId: existing.voterId, ...incomingConflicts },
            ward: existing.ward || ward,
            booth: existing.booth || booth,
            resolvedMember: existing._id,
            createdBy: req.currentUser._id,
          });
          reviewRequired += 1;
        }

        const changed = merge.filled.length > 0
          || merge.corrected.length > 0
          || extraDetailsChanged
          || !current.booth
          || !current.ward;
        if (changed) {
          await existing.save();
          updatedCount += 1;
        }
        filledFieldCount += merge.filled.length;
        correctedFieldCount += merge.corrected.length;
        conflictCount += merge.conflicts.length;
        addFieldStats(fieldStats.filled, merge.filled);
        addFieldStats(fieldStats.corrected, merge.corrected);
        addFieldStats(fieldStats.conflicts, merge.conflicts.map((item) => item.field));
        affected.push(existing);
        processed += 1;
        setProgress(uploadId, {
          processed,
          imported: affected.length,
          skipped: skipped.length,
          matched: matchedCount,
          updated: updatedCount,
          conflicts: conflictCount,
        });
        continue;
      }
      const mobileDuplicates = data.mobile
        ? await Member.find({ mobile: data.mobile }).select('_id mobile voterId')
        : [];
      const member = await Member.create({
        ...data,
        booth,
        ward,
        createdBy: req.currentUser._id,
        updatedBy: req.currentUser._id,
        sourceDocument: { type: sourceType, file: sourceFile },
        verificationStatus: mobileDuplicates.length ? 'duplicate' : 'pending',
        duplicateWarnings: mobileDuplicates.map((duplicate) => ({
          field: 'mobile',
          member: duplicate._id,
          value: data.mobile,
        })),
      });
      affected.push(member);
      createdCount += 1;
      processed += 1;
      setProgress(uploadId, { processed, imported: affected.length, skipped: skipped.length });
    }
    setProgress(uploadId, { stage: 'Building family records', processed, imported: affected.length, skipped: skipped.length });
    const families = await rebuildFamiliesForMembers(affected, req.currentUser._id);
    finishProgressSoon(uploadId, { status: 'completed', stage: 'Import complete', processed, total: rows.length, imported: affected.length, skipped: skipped.length });
    invalidateMemberData();
    res.json({
      imported: affected.length,
      created: createdCount,
      matched: matchedCount,
      updated: updatedCount,
      filledFields: filledFieldCount,
      correctedFields: correctedFieldCount,
      conflicts: conflictCount,
      fieldStats,
      skipped,
      reviewRequired,
      families,
      importedIds: affected.map((member) => member._id),
    });
  } catch (e) {
    finishProgressSoon(uploadId, {
      status: 'failed',
      stage: e.message || 'Excel/CSV import failed',
    });
    next(e);
  }
};

const runWardPdfImport = async ({ file, body, currentUser }, uploadId) => {
  let electoralList;
  try {
    if (!file) { const error = new Error('Ward PDF file required'); error.status = 400; throw error; }
    assertReadablePdf(file.path);
    setProgress(uploadId, { status: 'processing', stage: 'Reading municipal Ward PDF', imported: 0, skipped: 0, processed: 0, total: 0 }, currentUser._id);
    const result = await ocrWardPdf(file.path, file.filename, {
      onProgress: ({ phase, processedPages, totalPages }) => setProgress(uploadId, {
        stage: phase === 'rendering' ? 'Preparing Ward PDF pages' : `Reading Ward PDF pages ${processedPages} / ${totalPages}`,
        ocrPagesProcessed: processedPages,
        ocrPagesTotal: totalPages,
      }),
    });
    const header = result.header || {};
    header.municipality = cleanValue(body.municipality || header.municipality);
    header.wardNumber = cleanValue(body.wardNumber || body.ward || header.wardNumber);
    header.assemblyNumber = cleanValue(body.assemblyNumber || header.assemblyNumber);
    if (!header.municipality || !header.wardNumber) {
      const error = new Error('Municipality/Ward header detect nahi hua. Upload se pehle municipality aur Ward number select karein.');
      error.status = 400;
      throw error;
    }
    const sourceHash = crypto.createHash('sha256').update(fs.readFileSync(file.path)).digest('hex');
    electoralList = await ElectoralList.findOneAndUpdate(
      { type: 'municipal', sourceHash },
      { $set: {
        name: `${header.municipality} Ward ${header.wardNumber}`,
        year: Number(header.year || 2026),
        assemblyNumber: header.assemblyNumber || '',
        assemblyName: header.assemblyName || '',
        municipality: header.municipality,
        wardNumber: header.wardNumber,
        partNumber: header.partNumber || '',
        pollingStation: header.pollingStation || '',
        sourceFile: file.filename,
        status: 'processing',
        createdBy: currentUser._id,
      } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    const records = result.records || [];
    setProgress(uploadId, { stage: 'Matching Ward EPIC numbers', total: records.length, processed: 0 });
    let matched = 0;
    let wardOnly = 0;
    let review = 0;
    let processed = 0;
    const importedIds = [];
    const skipped = [];
    for (const item of records) {
      const rawEpic = cleanValue(item.voterId);
      const epic = normalizeEpic(rawEpic);
      const hasValidEpic = isValidEpic(epic);
      const voterSerial = cleanValue(item.voterSerial);
      const isDeleted = Boolean(item.isDeleted || item.sourceAction === 'delete' || /निरस्त|विलोपित|DELETED/i.test(item.rawText || ''));
      if (isDeleted) {
        skipped.push({ voterSerial, voterId: rawEpic, reason: 'Ward voter card marked DELETED/विलोपित' });
        review += 1;
        processed += 1;
        setProgress(uploadId, { processed, imported: importedIds.length, skipped: review });
        continue;
      }
      const invalidRecord = !item.name || (!hasValidEpic && !voterSerial);
      if (invalidRecord) {
        const reason = !item.name
          ? 'Ward voter name missing or unreadable'
          : rawEpic ? 'Ward EPIC invalid' : 'Ward EPIC and serial both missing';
        const pending = await ImportReview.create({
          sourceType: 'pdf', sourceFile: file.filename, reason,
          rawData: { ...item, listType: 'municipal', municipality: header.municipality, wardNumber: header.wardNumber },
          suggestedData: item, createdBy: currentUser._id,
        });
        skipped.push({ voterSerial, voterId: rawEpic, reason, reviewId: pending._id });
        review += 1;
        processed += 1;
        setProgress(uploadId, { processed, imported: importedIds.length, skipped: review });
        continue;
      }
      if (item.photo) {
        item.photo = await persistLocalImage(item.photo, currentUser._id, true);
      }
      if (item.cardImage) {
        item.cardImage = await persistLocalImage(item.cardImage, currentUser._id, true);
      }
      const sourceRecordKey = hasValidEpic
        ? `epic:${epic}`
        : `serial:${header.municipality}:${header.wardNumber}:${header.partNumber || ''}:${voterSerial}`;
      const previousMembership = await ElectoralMembership.findOne({
        electoralList: electoralList._id,
        sourceRecordKey,
      }).lean();
      let member = hasValidEpic
        ? await Member.findOne({ voterId: epic })
        : previousMembership ? await Member.findById(previousMembership.member) : null;
      const matchedAssembly = Boolean(member && (member.hasAssemblyMembership || member.assemblyNumber || member.partNumber));
      if (member) {
        member.hasAssemblyMembership = matchedAssembly;
        member.hasMunicipalMembership = true;
        member.municipality = header.municipality;
        member.municipalWardNumbers = [...new Set([...(member.municipalWardNumbers || []), header.wardNumber])];
        // Assembly is the primary voter profile. Ward OCR may only enrich a
        // municipal-only record; it must never overwrite Assembly fields.
        if (!matchedAssembly) {
          if (item.name) member.name = item.name;
          if (item.guardianName) member.guardianName = item.guardianName;
          if (item.relationType) member.relationType = item.relationType;
          if (item.houseNumber) member.houseNumber = item.houseNumber;
          if (item.age) {
            member.age = item.age;
            member.estimatedDob = estimateDobFromAge(item.age);
          }
          if (item.gender) member.gender = item.gender;
          if (item.photo) member.photo = item.photo;
          member.verificationStatus = item.ocrNeedsReview || !hasValidEpic ? 'needs_review' : member.verificationStatus;
          member.ocrReviewReasons = item.ocrReviewReasons || member.ocrReviewReasons || [];
        } else {
          if (!member.photo && item.photo) member.photo = item.photo;
        }
        member.updatedBy = currentUser._id;
        await member.save();
        if (matchedAssembly) matched += 1;
        else wardOnly += 1;
      } else {
        member = await Member.create({
          contactType: 'voter', voterId: hasValidEpic ? epic : undefined, name: item.name,
          guardianName: item.guardianName || '', relationType: item.relationType || '',
          houseNumber: item.houseNumber || '', age: item.age, estimatedDob: estimateDobFromAge(item.age),
          gender: item.gender || '', photo: item.photo || '', municipality: header.municipality,
          hasAssemblyMembership: false, hasMunicipalMembership: true,
          municipalWardNumbers: [header.wardNumber],
          verificationStatus: item.ocrNeedsReview || !hasValidEpic ? 'needs_review' : 'pending',
          ocrReviewReasons: item.ocrReviewReasons || [],
          createdBy: currentUser._id, updatedBy: currentUser._id,
          sourceDocument: { type: 'pdf', file: `/uploads/${file.filename}`, rawText: item.rawText || '', imageExtractionStatus: item.photo ? 'Ward voter portrait cropped.' : 'Ward portrait unavailable.' },
        });
        wardOnly += 1;
      }
      await ElectoralMembership.findOneAndUpdate(
        { electoralList: electoralList._id, sourceRecordKey },
        { $set: {
          member: member._id, type: 'municipal', sourceRecordKey, epic: hasValidEpic ? epic : '',
          voterSerial: item.voterSerial || '', assemblyNumber: header.assemblyNumber || '',
          assemblyName: header.assemblyName || '', partNumber: header.partNumber || '',
          municipality: header.municipality, wardNumber: header.wardNumber,
          pollingStation: header.pollingStation || '',
          sourcePhoto: item.photo || '',
          sourceValues: {
            name: item.name, guardianName: item.guardianName || '', relationType: item.relationType || '',
            houseNumber: item.houseNumber || '', age: item.age, gender: item.gender || '', pageNumber: item.pageNumber,
          },
          confidence: item.ocrNeedsReview ? 60 : 90,
          status: matchedAssembly ? 'matched' : 'source_only',
        } },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      );
      importedIds.push(member._id);
      if (!hasValidEpic) review += 1;
      processed += 1;
      setProgress(uploadId, { processed, imported: importedIds.length, skipped: review });
    }
    electoralList.status = 'completed';
    electoralList.counts = { total: records.length, imported: importedIds.length, matched, wardOnly, review };
    await electoralList.save();
    const response = {
      listType: 'municipal', electoralListId: electoralList._id,
      municipality: header.municipality, wardNumber: header.wardNumber,
      partNumber: header.partNumber || '', total: records.length,
      imported: importedIds.length, matched, wardOnly, reviewRequired: review,
      skipped, importedIds, imageExtractionStatus: 'Ward PDF has no voter photos; matching Assembly photo remains primary.',
    };
    finishProgressSoon(uploadId, { status: 'completed', stage: 'Ward import complete', processed, total: records.length, imported: importedIds.length, skipped: review, result: response }, currentUser._id);
    invalidateMemberData();
    return response;
  } catch (error) {
    if (electoralList) await ElectoralList.updateOne({ _id: electoralList._id }, { $set: { status: 'failed' } }).catch(() => {});
    finishProgressSoon(uploadId, { status: 'failed', stage: error.message || 'Ward PDF import failed' }, currentUser?._id);
    throw error;
  } finally {
    if (file?.path) fs.rmSync(file.path, { force: true });
  }
};
const runPdfImport = async ({ file, body, currentUser }, uploadId) => {
  if (String(body?.listType || '').toLowerCase() === 'municipal') {
    return runWardPdfImport({ file, body, currentUser }, uploadId);
  }
  try {
    setProgress(uploadId, { status: 'processing', stage: 'Reading PDF/OCR text', imported: 0, skipped: 0, processed: 0, total: 0, ocrPagesProcessed: 0, ocrPagesTotal: 0, ocrCardsProcessed: 0, ocrCardsTotal: 0 }, currentUser._id);
    if (!file) {
      const err = new Error('PDF file required');
      err.status = 400;
      throw err;
    }
    assertReadablePdf(file.path);
    const onOcrProgress = ({ phase, processedPages, totalPages, processedCards = 0, totalCards = 0 }) => {
      setProgress(uploadId, {
        stage: phase === 'rendering'
          ? 'Preparing PDF pages for OCR'
          : totalCards > 0
            ? `Reading voter cards ${processedCards} / ${totalCards}`
            : `Reading PDF pages ${processedPages} / ${totalPages}`,
        ocrPagesProcessed: processedPages,
        ocrPagesTotal: totalPages,
        ocrCardsProcessed: processedCards,
        ocrCardsTotal: totalCards,
      });
    };
    let parsed = await parsePdfMembers(file.path, file.filename, onOcrProgress);
    const pdfVillageHint = pdfVillageHintFromName(file.originalname || file.filename);
    if (pdfVillageHint) {
      for (const member of parsed.members) applyPdfVillageHint(member, pdfVillageHint);
    }
    setProgress(uploadId, { stage: 'PDF records detected', total: parsed.members.length, processed: 0 });
    if (
      currentUser.role === 'admin'
      && !body.ward
      && !parsed.members[0]?.assemblyNumber
      && !parsed.ocr
    ) {
      const ocr = await ocrPdf(file.path, file.filename, { onProgress: onOcrProgress });
      parsed = {
        text: ocr.text,
        members: parseHindiVoterRoll(ocr.text),
        ocr,
      };
      if (pdfVillageHint) {
        for (const member of parsed.members) applyPdfVillageHint(member, pdfVillageHint);
      }
    }
    const shouldExtractImages = String(process.env.EXTRACT_PDF_IMAGES || '').toLowerCase() === 'true';
    const extractedImages = parsed.ocr?.images?.length
      ? { images: parsed.ocr.images, status: parsed.ocr.status }
      : shouldExtractImages
        ? await extractPdfImages(file.path, file.filename)
        : { images: [], status: 'Photo extraction skipped for faster import. Set EXTRACT_PDF_IMAGES=true to enable it.' };
    const detectedHeader = parseHeader(parsed.text);
    const firstMemberWithHeader = {
      ...detectedHeader,
      ...(parsed.members[0] || {}),
    };
    applyPdfVillageHint(firstMemberWithHeader, pdfVillageHint);
    const { ward, booth } = await getOrCreateImportScope({
      user: currentUser,
      body,
      firstMember: firstMemberWithHeader,
    });
    if (!booth || !ward) {
      const err = new Error('PDF se ward/booth detect nahi hua. Text-based voter PDF upload karein ya manual ward/booth select karein.');
      err.status = 400;
      throw err;
    }
    assertBoothAccess(currentUser, booth);
    assertWardAccess(currentUser, ward);
    if (!isValidAssemblyHeader(firstMemberWithHeader)) {
      await ImportReview.create({
        sourceType: 'pdf',
        sourceFile: file.filename,
        reason: 'Invalid or garbage header in OCR: Valid assembly number and Hindi text required',
        rawData: detectedHeader || {},
        suggestedData: {
          assemblyNumber: firstMemberWithHeader.assemblyNumber || '',
          assemblyName: firstMemberWithHeader.assemblyName || '',
          tehsil: firstMemberWithHeader.tehsil || '',
          gramPanchayat: firstMemberWithHeader.gramPanchayat || '',
          village: firstMemberWithHeader.village || '',
        },
        ward,
        booth,
        createdBy: currentUser._id,
      });
    }
    const assemblyArea = await ensureAreaHierarchy(firstMemberWithHeader, currentUser._id);
    const created = [];
    const skipped = [];
    let processed = 0;
    const party = await findPartyFromText(parsed.text);
    for (const item of parsed.members) {
      item.voterId = normalizeEpic(item.voterId);
      if (!item.name) {
        const review = await ImportReview.create({
          sourceType: 'pdf',
          sourceFile: file.filename,
          reason: 'Name missing or unreadable',
          rawData: item.ocrValues?.raw || {},
          suggestedData: item,
          ward,
          booth,
          createdBy: currentUser._id,
        });
        skipped.push({ item, reason: 'Name missing or unreadable', reviewId: review._id });
        processed += 1;
        setProgress(uploadId, { processed, imported: created.length, skipped: skipped.length });
        continue;
      }
      if (!isValidEpic(item.voterId)) {
        const review = await ImportReview.create({
          sourceType: 'pdf',
          sourceFile: file.filename,
          reason: 'EPIC missing or invalid',
          rawData: item.ocrValues?.raw || {},
          suggestedData: { ...item, voterId: item.voterId || '' },
          ward,
          booth,
          createdBy: currentUser._id,
        });
        skipped.push({ item, reason: 'EPIC missing or invalid', reviewId: review._id });
        processed += 1;
        setProgress(uploadId, { processed, imported: created.length, skipped: skipped.length });
        continue;
      }
      if (item.photo) {
        item.photo = await persistLocalImage(item.photo, currentUser._id, true);
      }
      if (item.cardImage) {
        item.cardImage = await persistLocalImage(item.cardImage, currentUser._id, true);
      }
      const docSectionMap = safeSectionMap(parsed.ocr?.header?.sectionMap || detectedHeader.sectionMap);
      const itemSectionHeader = sectionHeaderForRecord(item, detectedHeader, docSectionMap);
      if (itemSectionHeader.sectionNumber) item.sectionNumber = itemSectionHeader.sectionNumber;
      if (itemSectionHeader.sectionName) item.sectionName = itemSectionHeader.sectionName;
      if (item.sectionName) {
        item.location = item.sectionName;
        item.address = [item.sectionName, cleanValue(item.houseNumber)].filter(Boolean).join(', ');
      }

      const itemArea = await enrichPdfAreaHierarchy(item, assemblyArea);
      const locationNeedsReview = item.locationResolution?.status !== 'verified';
      if (locationNeedsReview) {
        item.ocrNeedsReview = true;
        item.ocrReviewReasons = [...new Set([
          ...(item.ocrReviewReasons || []),
          item.locationResolution?.status === 'suggested'
            ? 'location_match_review_required'
            : 'location_unmatched',
        ])];
      }
      const existing = await Member.findOne({ voterId: item.voterId });
      if (existing) {
        existing.hasAssemblyMembership = true;
        const currentOcrValues = existing.ocrValues?.toObject?.() || existing.ocrValues || {};
        const hasVerifiedOcr = ['verified', 'manual'].includes(currentOcrValues.status);
        // PDF/OCR is authoritative for roll-specific fields, but it must not
        // erase structured Excel enrichment such as mobile and village data.
        assignNonEmptyFields(existing, item, [
          'photo',
          ...(!hasVerifiedOcr ? ['voterSerial', 'houseNumber'] : []),
          'assemblyNumber',
          'assemblyName',
          'partNumber',
          'partName',
          'sectionNumber',
          'sectionName',
        ]);
        const cleanSerial = (val) => {
          const s = String(val || '').trim();
          return ['undefined', 'null', 'none', '-', 'n/a', ''].includes(s.toLowerCase()) ? '' : s;
        };
        if (item.voterSerial && (!cleanSerial(existing.voterSerial) || !hasVerifiedOcr)) {
          existing.voterSerial = cleanSerial(item.voterSerial);
        }
        if (item.sectionName) existing.sectionName = item.sectionName;
        else if (existing.sectionNumber && docSectionMap[existing.sectionNumber]) existing.sectionName = docSectionMap[existing.sectionNumber];
        else existing.sectionName = cleanSectionName(existing.sectionName);
        assignNonEmptyFields(existing, item, [
          'name',
          'surname',
          'guardianName',
          'relationType',
          'age',
          'estimatedDob',
          'gender',
          'address',
          'location',
        ].filter((field) => (
          existing[field] === undefined
          || existing[field] === null
          || String(existing[field]).trim() === ''
        )));
        existing.booth = booth;
        existing.ward = ward;
        existing.area = item.village ? itemArea : (existing.area || assemblyArea);
        assignNonEmptyFields(existing, item, ['tehsil', 'gramPanchayat', 'village', 'postOffice', 'policeStation', 'district', 'pinCode']);
        if (!existing.party && party?._id) existing.party = party._id;
        existing.ocrConfidence = item.ocrConfidence;
        existing.ocrValues = {
          raw: item.ocrValues?.raw || currentOcrValues.raw || {},
          suggested: item.ocrValues?.suggested || currentOcrValues.suggested || {},
          verified: currentOcrValues.verified || {},
          status: ['verified', 'manual'].includes(currentOcrValues.status)
            ? currentOcrValues.status
            : (item.ocrValues?.status || 'suggested'),
          verifiedBy: currentOcrValues.verifiedBy,
          verifiedAt: currentOcrValues.verifiedAt,
        };
        existing.houseNumberConfidence = item.houseNumberConfidence;
        existing.locationMatchConfidence = item.locationMatchConfidence;
        if (item.locationResolution) {
          const currentResolution = existing.locationResolution?.toObject?.() || existing.locationResolution || {};
          const incomingResolution = item.locationResolution;
          existing.locationResolution = {
            ...currentResolution,
            raw: currentResolution.raw?.village || currentResolution.raw?.sectionName
              ? currentResolution.raw
              : incomingResolution.raw,
            suggested: incomingResolution.suggested,
            confidence: incomingResolution.confidence,
            matchedAlias: incomingResolution.matchedAlias,
            reviewNote: incomingResolution.reviewNote || currentResolution.reviewNote || '',
            status: currentResolution.status === 'verified' ? 'verified' : incomingResolution.status,
          };
        }
        existing.ocrReviewReasons = item.ocrReviewReasons || [];
        existing.ocrValidationPassed = Boolean(item.ocrValidationPassed);
        existing.ocrFieldConfidence = item.ocrFieldConfidence || {};
        if (item.ocrNeedsReview && !hasVerifiedOcr && existing.verificationStatus !== 'duplicate') existing.verificationStatus = 'needs_review';
        existing.updatedBy = currentUser._id;
        existing.sourceDocument = {
          type: 'pdf',
          file: `/uploads/${file.filename}`,
          rawText: item.rawText || parsed.text.slice(0, 1000),
          imageExtractionStatus: extractedImages.status,
          ocrCardImage: item.cardImage || existing.sourceDocument?.ocrCardImage || '',
        };
        await existing.save();
        created.push(existing);
        processed += 1;
        setProgress(uploadId, { processed, imported: created.length, skipped: skipped.length });
        continue;
      }
      const duplicates = [];
      const member = await Member.create({
        photo: item.photo || '',
        hasAssemblyMembership: true,
        name: item.name,
        surname: item.surname,
        mobile: item.mobile,
        age: item.age,
        estimatedDob: item.estimatedDob,
        gender: item.gender,
        voterSerial: item.voterSerial,
        voterId: item.voterId,
        guardianName: item.guardianName,
        relationType: item.relationType,
        houseNumber: item.houseNumber,
        assemblyNumber: item.assemblyNumber,
        assemblyName: item.assemblyName,
        partNumber: item.partNumber,
        partName: item.partName,
        sectionNumber: item.sectionNumber,
        sectionName: item.sectionName,
        address: item.address,
        location: item.location,
        booth,
        ward,
        area: itemArea,
        tehsil: item.tehsil,
        postOffice: item.postOffice,
        policeStation: item.policeStation,
        district: item.district,
        pinCode: item.pinCode,
        gramPanchayat: item.gramPanchayat,
        village: item.village,
        party: party?._id,
        createdBy: currentUser._id,
        updatedBy: currentUser._id,
        ocrValues: item.ocrValues || { raw: {}, suggested: {}, verified: {}, status: 'raw' },
        ocrConfidence: item.ocrConfidence,
        houseNumberConfidence: item.houseNumberConfidence,
        locationMatchConfidence: item.locationMatchConfidence,
        locationResolution: item.locationResolution,
        ocrReviewReasons: item.ocrReviewReasons || [],
        ocrValidationPassed: Boolean(item.ocrValidationPassed),
        ocrFieldConfidence: item.ocrFieldConfidence || {},
        verificationStatus: duplicates.length ? 'duplicate' : item.ocrNeedsReview ? 'needs_review' : 'pending',
        duplicateWarnings: duplicates.map((d) => ({
          field: d.voterId === item.voterId ? 'voterId' : d.mobile === item.mobile ? 'mobile' : 'address',
          member: d._id,
          value: d.voterId === item.voterId ? item.voterId : d.mobile === item.mobile ? item.mobile : item.address,
        })),
        sourceDocument: {
          type: 'pdf',
          file: `/uploads/${file.filename}`,
          rawText: item.rawText || parsed.text.slice(0, 1000),
          imageExtractionStatus: extractedImages.status,
          ocrCardImage: item.cardImage || '',
        },
      });
      created.push(member);
      processed += 1;
      setProgress(uploadId, { processed, imported: created.length, skipped: skipped.length });
    }
    setProgress(uploadId, {
      stage: 'Building family records',
      processed,
      imported: created.length,
      skipped: skipped.length,
    });
    const families = await rebuildFamiliesForMembers(created, currentUser._id);
    const result = {
      imported: created.length,
      reviewRequired: skipped.filter((entry) => entry.reviewId).length,
      skipped,
      families,
      imageExtractionStatus: extractedImages.status,
      extractedImages: extractedImages.images.length,
      extractedTextPreview: parsed.text.slice(0, 1500),
      extractionMode: parsed.ocr ? 'ocr-coordinate' : 'text-embedded',
      importedIds: created.map((member) => member._id),
    };
    finishProgressSoon(uploadId, {
      status: 'completed',
      stage: 'Import complete',
      processed,
      total: parsed.members.length,
      imported: created.length,
      skipped: skipped.length,
      result,
    }, currentUser._id);
    invalidateMemberData();
    return result;
  } catch (e) {
    finishProgressSoon(uploadId, {
      status: 'failed',
      stage: e.message || 'PDF import failed',
    }, currentUser?._id);
    throw e;
  } finally {
    if (file?.path) fs.rmSync(file.path, { force: true });
  }
};

exports.importPdfMembers = async (req, res, next) => {
  const uploadId = progressId(req);
  try {
    if (!req.file) return res.status(400).json({ message: 'PDF file required' });
    assertReadablePdf(req.file.path);
    const context = {
      file: req.file,
      body: { ...req.body },
      currentUser: req.currentUser,
    };
    const useBackgroundImport = req.body?.asyncImport === true
      || String(req.body?.asyncImport || req.query?.asyncImport || '').toLowerCase() === 'true'
      || Boolean(uploadId);
    if (!useBackgroundImport) {
      const result = await runPdfImport(context, uploadId);
      return res.json(result);
    }

    setProgress(uploadId, {
      status: 'processing',
      stage: 'Upload received. PDF/OCR import running in background',
      imported: 0,
      skipped: 0,
      processed: 0,
      total: 0,
    });

    setImmediate(() => {
      runPdfImport(context, uploadId).catch((error) => {
        console.error('Background PDF import failed:', error);
      });
    });

    return res.status(202).json({
      processing: true,
      uploadId,
      message: 'PDF upload complete. Server OCR/import background me chal raha hai.',
    });
  } catch (e) {
    finishProgressSoon(uploadId, {
      status: 'failed',
      stage: e.message || 'PDF import failed',
    });
    return next(e);
  }
};

exports.cleanSectionName = cleanSectionName;
exports.safeSectionMap = safeSectionMap;
exports.sectionHeaderForRecord = sectionHeaderForRecord;
exports.parseHeader = parseHeader;

































