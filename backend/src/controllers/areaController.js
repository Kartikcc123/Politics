const Area = require('../models/Area');
const Member = require('../models/Member');
const XLSX = require('xlsx');
const raipurMaster = require('../config/raipurLocationMaster');
const { invalidateAreaData } = require('../utils/dataCache');

exports.list = async (req, res, next) => {
  try {
    const filter = { active: true };
    if (req.query.parent === 'root') filter.parent = null;
    else if (req.query.parent) filter.parent = req.query.parent;
    if (req.query.type) filter.type = req.query.type;
    res.json(await Area.find(filter).populate('parent', 'name type').sort({ name: 1 }));
  } catch (error) { next(error); }
};

exports.tree = async (req, res, next) => {
  try {
    const areas = await Area.find({ active: true }).sort({ name: 1 }).lean();
    const directCounts = await Member.aggregate([
      { $match: { area: { $ne: null } } },
      { $group: {
        _id: '$area',
        count: { $sum: 1 },
        partNumbers: { $addToSet: '$partNumber' },
        boothIds: { $addToSet: '$booth' },
      } },
    ]);
    const counts = new Map(directCounts.map((item) => [String(item._id), item]));
    const grouped = new Map();
    for (const area of areas) {
      const direct = counts.get(String(area._id)) || {};
      area.voterCount = direct.count || 0;
      area.partNumbers = (direct.partNumbers || []).map(String).filter(Boolean);
      area.boothIds = (direct.boothIds || []).map(String).filter(Boolean);
      const key = String(area.parent || 'root');
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(area);
    }
    const build = (parent = 'root') => (grouped.get(parent) || []).map((area) => {
      const children = build(String(area._id));
      area.voterCount += children.reduce((sum, child) => sum + child.voterCount, 0);
      area.partNumbers = [...new Set([
        ...area.partNumbers,
        ...children.flatMap((child) => child.partNumbers || []),
      ])].sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
      area.boothIds = [...new Set([
        ...area.boothIds,
        ...children.flatMap((child) => child.boothIds || []),
      ])];
      area.boothCount = area.boothIds.length;
      delete area.boothIds;
      return { ...area, children };
    });
    res.json(build());
  } catch (error) { next(error); }
};

exports.create = async (req, res, next) => {
  try {
    const area = await Area.create({ ...req.body, createdBy: req.currentUser._id });
    invalidateAreaData();
    res.status(201).json(area);
  } catch (error) { next(error); }
};

exports.update = async (req, res, next) => {
  try {
    const area = await Area.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    invalidateAreaData();
    res.json(area);
  } catch (error) { next(error); }
};

exports.removeAll = async (req, res, next) => {
  try {
    const result = await Area.updateMany({ active: true }, { active: false });
    invalidateAreaData();
    res.json({ message: 'All areas removed', deletedCount: result.modifiedCount });
  } catch (error) { next(error); }
};
exports.remove = async (req, res, next) => {
  try {
    if (await Area.exists({ parent: req.params.id, active: true })) {
      return res.status(400).json({ message: 'पहले इसके अंदर के क्षेत्र हटाएँ या स्थानांतरित करें।' });
    }
    await Area.findByIdAndUpdate(req.params.id, { active: false });
    invalidateAreaData();
    res.json({ message: 'Area removed' });
  } catch (error) { next(error); }
};


const cleanMasterValue = (value) => String(value ?? '').trim();
const masterNumber = (value) => {
  const normalized = cleanMasterValue(value).replace(/,/g, '');
  if (!/^\d+$/.test(normalized)) return 0;
  return Number(normalized);
};
const masterAliases = (value) => cleanMasterValue(value).split(/[|,;]/).map((item) => item.trim()).filter(Boolean);
const rowValue = (row, ...keys) => {
  for (const key of keys) {
    if (row[key] !== undefined && cleanMasterValue(row[key])) return row[key];
  }
  return '';
};

function rowsToMaster(rows, defaults = {}) {
  const grouped = new Map();
  for (const row of rows) {
    const panchayat = cleanMasterValue(rowValue(row, 'gramPanchayat', 'gram panchayat', 'panchayat', 'ग्राम पंचायत'));
    const village = cleanMasterValue(rowValue(row, 'village', 'ग्राम', 'गाँव', 'गांव'));
    if (!panchayat || !village) continue;
    if (!grouped.has(panchayat)) grouped.set(panchayat, {
      name: panchayat,
      population: masterNumber(rowValue(row, 'panchayatPopulation', 'gramPanchayatPopulation', 'पंचायत जनसंख्या')),
      wardCount: masterNumber(rowValue(row, 'wardCount', 'wards', 'वार्ड संख्या')),
      pinCode: cleanMasterValue(rowValue(row, 'pinCode', 'pincode', 'pin', 'पिन कोड')),
      aliases: masterAliases(rowValue(row, 'panchayatAliases', 'panchayat aliases', 'पंचायत उपनाम')),
      villages: [],
    });
    const item = grouped.get(panchayat);
    item.population ||= masterNumber(rowValue(row, 'panchayatPopulation', 'gramPanchayatPopulation', 'पंचायत जनसंख्या'));
    item.wardCount ||= masterNumber(rowValue(row, 'wardCount', 'wards', 'वार्ड संख्या'));
    item.pinCode ||= cleanMasterValue(rowValue(row, 'pinCode', 'pincode', 'pin', 'पिन कोड'));
    item.villages.push({
      name: village,
      population: masterNumber(rowValue(row, 'villagePopulation', 'population', 'ग्राम जनसंख्या')),
      pinCode: cleanMasterValue(rowValue(row, 'villagePinCode', 'pinCode', 'pincode', 'pin', 'पिन कोड')),
      aliases: masterAliases(rowValue(row, 'villageAliases', 'village aliases', 'ग्राम उपनाम')),
    });
  }
  return {
    name: cleanMasterValue(defaults.name || 'Location master'),
    assemblyNumber: cleanMasterValue(defaults.assemblyNumber),
    assemblyName: cleanMasterValue(defaults.assemblyName),
    district: cleanMasterValue(defaults.district),
    tehsil: cleanMasterValue(defaults.tehsil),
    source: cleanMasterValue(defaults.source || 'Uploaded master file'),
    panchayats: [...grouped.values()],
  };
}

async function upsertArea(parent, type, name, fields, userId) {
  return Area.findOneAndUpdate(
    { parent: parent || null, type, name },
    { $set: { ...fields, active: true, masterImportedAt: new Date() }, $setOnInsert: { createdBy: userId } },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
  );
}

async function saveMaster(master, userId) {
  if (!master.tehsil || !master.district || !Array.isArray(master.panchayats) || !master.panchayats.length) {
    const error = new Error('District, tehsil and at least one gram panchayat are required.');
    error.status = 400;
    throw error;
  }
  const names = new Set();
  let wards = 0;
  let population = 0;
  for (const panchayat of master.panchayats) {
    if (!panchayat.name || names.has(panchayat.name)) {
      const error = new Error(`Duplicate or blank gram panchayat: ${panchayat.name || '-'}`);
      error.status = 400;
      throw error;
    }
    names.add(panchayat.name);
    wards += masterNumber(panchayat.wardCount);
    population += masterNumber(panchayat.population);
  }
  if (master.expected && (wards !== master.expected.wards || population !== master.expected.population || names.size !== master.expected.panchayats)) {
    const error = new Error('Master totals do not match the verified source totals.');
    error.status = 400;
    throw error;
  }
  const common = { district: master.district, masterSource: master.source };
  let root = null;
  if (master.assemblyName) {
    root = await upsertArea(null, 'assembly', master.assemblyName, { ...common, assemblyNumber: master.assemblyNumber, code: master.assemblyNumber }, userId);
  }
  const tehsil = await upsertArea(root?._id || null, 'tehsil', master.tehsil, common, userId);
  let villageCount = 0;
  for (const panchayat of master.panchayats) {
    const gp = await upsertArea(tehsil._id, 'gram_panchayat', panchayat.name, {
      ...common, population: masterNumber(panchayat.population), wardCount: masterNumber(panchayat.wardCount), pinCode: cleanMasterValue(panchayat.pinCode), ...(panchayat.aliases?.length ? { aliases: panchayat.aliases } : {}),
    }, userId);
    const villageNames = new Set();
    for (const village of panchayat.villages || []) {
      if (!village.name || villageNames.has(village.name)) continue;
      villageNames.add(village.name);
      await upsertArea(gp._id, 'village', village.name, {
        ...common, population: masterNumber(village.population), pinCode: cleanMasterValue(village.pinCode || panchayat.pinCode), ...(village.aliases?.length ? { aliases: village.aliases } : {}),
      }, userId);
      villageCount += 1;
    }
  }
  return { panchayats: names.size, villages: villageCount, wards, population, district: master.district, tehsil: master.tehsil };
}

exports.saveMasterData = saveMaster;

exports.importMaster = async (req, res, next) => {
  try {
    let master;
    if (req.body.source === 'raipur') {
      master = { ...raipurMaster, assemblyNumber: '179', assemblyName: 'सहाड़ा' };
    } else {
      if (!req.file?.buffer) return res.status(400).json({ message: 'Master Excel, CSV or JSON file is required.' });
      const extension = String(req.file.originalname || '').split('.').pop().toLowerCase();
      let rows;
      if (extension === 'json') {
        const parsed = JSON.parse(req.file.buffer.toString('utf8'));
        rows = Array.isArray(parsed) ? parsed : parsed.rows;
      } else {
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: '' });
      }
      if (!Array.isArray(rows)) return res.status(400).json({ message: 'No master rows found.' });
      master = rowsToMaster(rows, { ...req.body, source: req.file.originalname });
    }
    const summary = await saveMaster(master, req.currentUser._id);
    invalidateAreaData();
    res.json({ message: 'Location master imported', ...summary });
  } catch (error) { next(error); }
};

function isValidHindiText(text) {
  if (!text || typeof text !== 'string') return false;
  const cleaned = text.trim();
  if (cleaned.length < 2) return false;
  const devanagariCount = (cleaned.match(/[\u0900-\u097F]/g) || []).length;
  if (devanagariCount < 2) return false;
  if (/(?:fetst|tetst|\btst\b| भाग aaa|aaa:|\btest\b|\bdemo\b|\bdummy\b)/i.test(cleaned)) return false;
  return true;
}

function isValidAssemblyHeader(data = {}) {
  const num = String(data?.assemblyNumber || '').trim();
  const name = String(data?.assemblyName || '').trim();
  if (!num || !/^\d{1,3}$/.test(num)) return false;
  if (!isValidHindiText(name)) return false;
  return true;
}

async function cleanGarbageAreas() {
  const garbageRegex = /(?:fetst|tetst|\btst\b| भाग aaa|aaa:|\btest\b|\bdemo\b|\bdummy\b)/i;
  const allAreas = await Area.find({}).lean();
  const invalidAreaIds = [];
  for (const area of allAreas) {
    const name = String(area.name || '').trim();
    const devanagariCount = (name.match(/[\u0900-\u097F]/g) || []).length;
    const isGarbage = garbageRegex.test(name);
    const isAssemblyWithoutHindi = area.type === 'assembly' && devanagariCount < 2;
    const isFallbackName = /^assembly\s*\d+/i.test(name);
    if (isGarbage || isAssemblyWithoutHindi || isFallbackName || !name) {
      invalidAreaIds.push(area._id);
    }
  }

  if (invalidAreaIds.length) {
    await Member.updateMany(
      { area: { $in: invalidAreaIds } },
      { $unset: { area: '' } }
    );
    await Area.deleteMany({ _id: { $in: invalidAreaIds } });
    invalidateAreaData();
  }
  return { cleanedCount: invalidAreaIds.length, invalidAreaIds };
}

exports.cleanInvalid = async (req, res, next) => {
  try {
    const summary = await cleanGarbageAreas();
    res.json({ message: 'Invalid garbage area entries cleaned successfully', ...summary });
  } catch (error) { next(error); }
};

exports.isValidHindiText = isValidHindiText;
exports.isValidAssemblyHeader = isValidAssemblyHeader;
exports.cleanGarbageAreas = cleanGarbageAreas;