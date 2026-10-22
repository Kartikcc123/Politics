const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const Member = require('../models/Member');
const Booth = require('../models/Booth');
const Ward = require('../models/Ward');
const MediaAsset = require('../models/MediaAsset');
const { applyMemberScope, hindiFlexibleRegex } = require('../utils/boothAccess');
const { resolveUploadPublicPath } = require('../utils/uploadPath');

const regularFont = path.join(__dirname, '../assets/fonts/Nirmala.ttf');
const boldFont = path.join(__dirname, '../assets/fonts/Nirmala-Bold.ttf');

const labels = {
  gender: { male: 'पुरुष', female: 'महिला', other: 'अन्य' },
  relation: { father: 'पिता', husband: 'पति', mother: 'माता', other: 'अन्य' },
  support: { supporter: 'समर्थक', opposite: 'विरोधी', neutral: 'तटस्थ', undecided: 'अनिर्णीत' },
};

const https = require('https');
const http = require('http');

const fields = {
  name: ['नाम', (m) => `${m.name || ''} ${m.surname || ''}`.trim()],
  voterId: ['EPIC (वोटर ID)', (m) => m.voterId],
  voterSerial: ['वि.स. क्रमांक', (m) => m.voterSerial || '-'],
  partNumber: ['भाग #', (m) => m.partNumber || '-'],
  wardNumber: ['वार्ड #', (m) => m.wardNumber || (Array.isArray(m.municipalWardNumbers) && m.municipalWardNumbers[0]) || '-'],
  wardVoterSerial: ['वार्ड क्रमांक', (m) => m.wardVoterSerial || '-'],
  guardianName: ['पिता/पति', (m) => m.guardianName || m.relativeName || '-'],
  mobile: ['मोबाइल', (m) => m.mobile],
  altMobile: ['वैकल्पिक मोबाइल', (m) => m.altMobile],
  relationType: ['संबंध', (m) => labels.relation[m.relationType] || m.relationType],
  age: ['उम्र', (m) => m.age],
  gender: ['लिंग', (m) => labels.gender[m.gender] || m.gender],
  houseNumber: ['घर संख्या', (m) => m.houseNumber],
  address: ['पता', (m) => m.address],
  village: ['गाँव', (m) => m.village || m.location],
  gramPanchayat: ['ग्राम पंचायत', (m) => m.gramPanchayat],
  tehsil: ['तहसील', (m) => m.tehsil],
  municipality: ['नगर पालिका', (m) => m.municipality],
  caste: ['जाति', (m) => m.caste],
  subCaste: ['उपजाति', (m) => m.subCaste],
  occupation: ['व्यवसाय', (m) => m.occupation],
  education: ['शिक्षा', (m) => m.education],
  organizationPost: ['पद', (m) => m.organizationPost],
  supportLevel: ['समर्थन', (m) => labels.support[m.supportLevel] || m.supportLevel],
  partyPreference: ['पार्टी रुझान', (m) => m.partyPreference || '-'],
  assembly: ['विधानसभा', (m) => [m.assemblyNumber, m.assemblyName].filter(Boolean).join(' - ')],
  section: ['अनुभाग', (m) => [m.sectionNumber, m.sectionName].filter(Boolean).join(' - ')],
  booth: ['बूथ', (m) => m.booth?.number || m.partNumber],
  ward: ['वार्ड', (m) => m.ward?.number || m.ward?.name],
};

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function applyPrintFilters(req, filter) {
  const q = String(req.query.q || '').trim();
  if (q) filter.$or = [
    'name', 'surname', 'mobile', 'altMobile', 'voterId', 'guardianName',
    'houseNumber', 'address', 'location', 'village', 'gramPanchayat',
    'tehsil', 'municipality', 'caste', 'organizationPost', 'sectionName',
    'assemblyName', 'partNumber',
  ].map((key) => ({ [key]: new RegExp(escapeRegex(q), 'i') }));

  const vilParam = req.query.village || req.query.gaon || req.query.gav;
  if (vilParam) {
    const vRegex = hindiFlexibleRegex(vilParam);
    filter.$and = [...(filter.$and || []), {
      $or: [
        { village: vRegex },
        { mukhyaGram: vRegex }
      ]
    }];
  }

  const gpParam = req.query.gramPanchayat || req.query.panchayat;
  if (gpParam) {
    filter.gramPanchayat = hindiFlexibleRegex(gpParam);
  }

  const samitiWardParam = req.query.samitiWard || req.query.panchayatSamitiWard;
  if (samitiWardParam) {
    filter.panchayatSamitiWard = hindiFlexibleRegex(samitiWardParam);
  }

  for (const key of [
    'tehsil', 'municipality', 'caste',
    'organizationPost', 'location', 'sectionName', 'assemblyName',
  ]) {
    if (req.query[key]) filter[key] = new RegExp(escapeRegex(req.query[key]), 'i');
  }
  const samitiParam = req.query.tehsil || req.query.samiti || req.query.simiti || req.query.panchayatSamiti;
  if (samitiParam) {
    filter.tehsil = hindiFlexibleRegex(samitiParam);
  }
  for (const key of [
    'supportLevel', 'area', 'gender', 'verificationStatus', 'assemblyNumber',
    'sectionNumber',
  ]) {
    if (req.query[key]) filter[key] = req.query[key];
  }
  if (req.query.partNumber) {
    const parts = String(req.query.partNumber).split(',').map((p) => p.trim()).filter(Boolean);
    if (parts.length > 1) {
      filter.partNumber = { $in: parts };
    } else if (parts.length === 1) {
      filter.partNumber = parts[0];
    }
  }
  const wardParam = req.query.wardNumber || req.query.ward || req.query.municipalWard;
  if (wardParam) {
    const w = String(wardParam).replace(/\D/g, '').trim();
    if (w) {
      const wardRegex = new RegExp(`^(वॉर्ड|वार्ड)\\s*0*${w}$`, 'i');
      filter.$and = [...(filter.$and || []), {
        $or: [
          { wardNumber: w },
          { wardNumber: wardRegex },
          { municipalWardNumbers: w },
          { municipalWardNumbers: wardRegex }
        ]
      }];
    }
  }
  if (req.query.letter) {
    filter.name = new RegExp(`^${escapeRegex(String(req.query.letter).trim())}`, 'i');
  }
  if (req.query.hasMobile === 'true' || req.query.withMobileOnly === 'true') {
    filter.mobile = { $nin: ['', null], $exists: true };
  }
  if (req.query.favorite === 'true' || req.query.favoritesOnly === 'true' || req.query.isFavorite === 'true') {
    filter.isFavorite = true;
  }
  if (req.query.verified === 'true' || req.query.verifiedOnly === 'true') {
    filter.verificationStatus = 'verified';
  }
  if (req.query.missingMobile === 'true') {
    filter.$and = [...(filter.$and || []), { $or: [{ mobile: '' }, { mobile: null }, { mobile: { $exists: false } }] }];
  }
  if (req.query.missingHouse === 'true') {
    filter.$and = [...(filter.$and || []), { $or: [{ houseNumber: '' }, { houseNumber: null }, { houseNumber: { $exists: false } }] }];
  }

  const partyPref = req.query.partyPreference || req.query.party;
  if (partyPref && partyPref !== 'all') {
    filter.partyPreference = partyPref;
  }

  const ids = String(req.query.ids || '').split(',').map((id) => id.trim()).filter(Boolean);
  const excluded = String(req.query.excludedIds || '').split(',').map((id) => id.trim()).filter(Boolean);
  if (ids.length && req.query.selectAll !== 'true') filter._id = { $in: ids };
  if (excluded.length) {
    filter._id = filter._id || {};
    filter._id.$nin = excluded;
  }
}

const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 50, maxFreeSockets: 20, timeout: 12000 });
const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 50, maxFreeSockets: 20, timeout: 12000 });
const crypto = require('crypto');
const photoCacheDir = path.join(__dirname, '../../uploads/.photo_cache');
try {
  if (!fs.existsSync(photoCacheDir)) {
    fs.mkdirSync(photoCacheDir, { recursive: true });
  }
} catch (_) {}

function fetchHttpBuffer(url, retries = 2) {
  if (!url) return Promise.resolve(null);
  const cacheKey = crypto.createHash('md5').update(url).digest('hex');
  const cacheFilePath = path.join(photoCacheDir, `${cacheKey}.bin`);

  if (fs.existsSync(cacheFilePath)) {
    try {
      const cached = fs.readFileSync(cacheFilePath);
      const normalized = normalizeImageBuffer(cached);
      if (normalized) return Promise.resolve(normalized);
    } catch (_) {}
  }

  return new Promise((resolve) => {
    try {
      const isHttps = url.startsWith('https');
      const client = isHttps ? https : http;
      const agent = isHttps ? httpsAgent : httpAgent;

      const req = client.get(url, { agent, timeout: 12000 }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume();
          return fetchHttpBuffer(res.headers.location, retries).then(resolve);
        }
        if (res.statusCode !== 200) {
          res.resume();
          if (retries > 0) {
            return setTimeout(() => {
              fetchHttpBuffer(url, retries - 1).then(resolve);
            }, 300);
          }
          return resolve(null);
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const buf = Buffer.concat(chunks);
          const normalized = normalizeImageBuffer(buf);
          if (normalized) {
            try {
              fs.writeFileSync(cacheFilePath, normalized);
            } catch (_) {}
            resolve(normalized);
          } else {
            resolve(null);
          }
        });
      });
      req.on('error', () => {
        if (retries > 0) {
          setTimeout(() => {
            fetchHttpBuffer(url, retries - 1).then(resolve);
          }, 300);
        } else {
          resolve(null);
        }
      });
      req.on('timeout', () => {
        req.destroy();
        if (retries > 0) {
          setTimeout(() => {
            fetchHttpBuffer(url, retries - 1).then(resolve);
          }, 300);
        } else {
          resolve(null);
        }
      });
    } catch (_) {
      resolve(null);
    }
  });
}

function mediaIdFromPhoto(photo) {
  if (!photo) return null;
  const str = String(photo).trim();
  const match = str.match(/(?:(?:\/|^)(?:api\/)?media\/|^)([a-fA-F0-9]{24})(?:\/|$|\?)/);
  return match ? match[1] : null;
}

function photoPath(member) {
  if (!member.photo || mediaIdFromPhoto(member.photo)) return null;
  const raw = String(member.photo).trim();
  let value = raw;
  try { value = new URL(raw).pathname; } catch (_) {}
  if (/^https?:/i.test(value)) return null;
  const relative = String(value).replace(/^[/\\]+/, '');
  const candidates = [
    resolveUploadPublicPath(value),
    path.resolve(process.cwd(), relative),
    path.resolve(__dirname, '../../', relative),
    path.resolve(__dirname, '../', relative),
    path.resolve(__dirname, '../../../', relative),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

function normalizeImageBuffer(value) {
  if (!value) return null;
  const buffer = Buffer.isBuffer(value)
    ? value
    : value?.buffer
      ? Buffer.from(value.buffer)
      : Buffer.from(value);
  if (buffer.length < 8) return null;
  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8;
  const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
  return isJpeg || isPng ? buffer : null;
}

async function loadPhotoSources(members, includePhoto = true) {
  if (!includePhoto) return () => null;
  const media = new Map();

  // Tier 1: For members without a photo, resolve candidate photo from MongoDB
  const missingPhotoMembers = members.filter(m => !m.photo || m.photo === '');
  if (missingPhotoMembers.length) {
    const missingVoterIds = missingPhotoMembers.map(m => m.voterId).filter(Boolean);
    if (missingVoterIds.length) {
      try {
        const candidates = await Member.find({
          voterId: { $in: missingVoterIds },
          photo: { $exists: true, $ne: '', $ne: null }
        }).select('voterId photo').lean();

        const voterIdToPhoto = new Map();
        for (const c of candidates) {
          if (c.photo) voterIdToPhoto.set(c.voterId, c.photo);
        }
        for (const m of missingPhotoMembers) {
          if (!m.photo && voterIdToPhoto.has(m.voterId)) {
            m.photo = voterIdToPhoto.get(m.voterId);
          }
        }
      } catch (_) {}
    }

    // Tier 1b: For any still missing, match by village + name / father / houseNumber
    const stillMissing = members.filter(m => !m.photo || m.photo === '');
    for (const m of stillMissing) {
      if (!m.village && !m.gramPanchayat) continue;
      try {
        const villageFilter = m.village
          ? { village: new RegExp(`^${escapeRegex(m.village.trim())}$`, 'i') }
          : { gramPanchayat: new RegExp(`^${escapeRegex(m.gramPanchayat.trim())}$`, 'i') };

        const orConditions = [];
        const gName = m.guardianName || m.relativeName;
        if (m.name && gName) {
          const nPrefix = m.name.trim().slice(0, 3);
          const gPrefix = gName.trim().slice(0, 2);
          orConditions.push({
            name: new RegExp(`^${escapeRegex(nPrefix)}`, 'i'),
            $or: [
              { guardianName: new RegExp(`^${escapeRegex(gPrefix)}`, 'i') },
              { relativeName: new RegExp(`^${escapeRegex(gPrefix)}`, 'i') }
            ]
          });
        }
        if (m.name && m.houseNumber) {
          const nPrefix = m.name.trim().slice(0, 3);
          orConditions.push({
            name: new RegExp(`^${escapeRegex(nPrefix)}`, 'i'),
            houseNumber: m.houseNumber
          });
        }

        if (orConditions.length) {
          const candidate = await Member.findOne({
            ...villageFilter,
            photo: { $exists: true, $ne: '', $ne: null },
            $or: orConditions
          }).select('photo').lean();
          if (candidate && candidate.photo) {
            m.photo = candidate.photo;
          }
        }
      } catch (_) {}
    }
  }

  // 1. Check MongoDB MediaAssets
  const mediaIds = [...new Set(members.map((m) => mediaIdFromPhoto(m.photo)).filter(Boolean))];
  if (mediaIds.length) {
    const assets = await MediaAsset.find({ _id: { $in: mediaIds } }).select('+data contentType').lean();
    for (const asset of assets) {
      const buffer = normalizeImageBuffer(asset.data);
      if (buffer) media.set(String(asset._id), buffer);
    }
  }

  // 2. Fetch all S3/HTTP photos in parallel concurrency batches of 40 with local disk caching
  const httpPhotos = [...new Set(members.map(m => m.photo).filter(p => p && /^https?:\/\//i.test(p)))];
  const concurrency = 40;
  for (let i = 0; i < httpPhotos.length; i += concurrency) {
    const batch = httpPhotos.slice(i, i + concurrency);
    await Promise.all(batch.map(async (url) => {
      try {
        const buf = await fetchHttpBuffer(url);
        if (buf) media.set(url, buf);
      } catch (_) {}
    }));
  }

  return (member) => {
    if (!member.photo) return null;
    if (media.has(member.photo)) return media.get(member.photo);
    const mediaId = mediaIdFromPhoto(member.photo);
    if (mediaId && media.has(mediaId)) return media.get(mediaId);
    return photoPath(member);
  };
}

function fieldRows(doc, member, selected, width) {
  return selected.map((key) => {
    const [label, getter] = fields[key];
    const value = getter(member);
    const text = `${label}: ${value === undefined || value === null || value === '' ? '-' : value}`;
    const name = key === 'name';
    doc.font(name ? 'HindiBold' : 'Hindi').fontSize(name ? 10 : 8.5);
    return {
      key,
      text,
      height: Math.max(name ? 17 : 14, doc.heightOfString(text, { width, lineGap: 1 }) + 3),
    };
  });
}

exports.printMembers = async (req, res, next) => {
  try {
    const filter = applyMemberScope(req.currentUser, {});
    applyPrintFilters(req, filter);
    const limit = Math.min(Math.max(Number(req.query.limit) || 10000, 1), 10000);
    const isWardPrint = Boolean(
      req.query.wardNumber ||
      req.query.scope === 'specific_ward' ||
      req.query.electoralListType === 'municipal' ||
      req.query.sortBy === 'wardVoterSerial' ||
      req.query.rollType === 'municipal' ||
      req.query.rollType === 'ward' ||
      req.currentUser?.allowedRollType === 'municipal' ||
      (Array.isArray(req.currentUser?.assignedWards) && req.currentUser.assignedWards.length > 0)
    );

    const members = await Member.find(filter)
      .populate('booth ward')
      .limit(limit)
      .lean();

    const parseNum = (v) => {
      if (v === null || v === undefined || v === '') return 99999999;
      const parsed = parseInt(String(v).replace(/[^\d]/g, ''), 10);
      return isNaN(parsed) ? 99999999 : parsed;
    };

    if (isWardPrint) {
      // Sort strictly by Ward Serial Number 1, 2, 3, 4, 5...
      members.sort((a, b) => {
        const sA = parseNum(a.wardVoterSerial);
        const sB = parseNum(b.wardVoterSerial);
        if (sA !== sB) return sA - sB;
        const vA = parseNum(a.voterSerial);
        const vB = parseNum(b.voterSerial);
        if (vA !== vB) return vA - vB;
        const hA = parseNum(a.houseNumber);
        const hB = parseNum(b.houseNumber);
        if (hA !== hB) return hA - hB;
        return (a.name || '').localeCompare(b.name || '', 'hi');
      });
    } else {
      // Sort strictly by Vidhan Sabha Serial Number 1, 2, 3, 4, 5...
      members.sort((a, b) => {
        const sA = parseNum(a.voterSerial);
        const sB = parseNum(b.voterSerial);
        if (sA !== sB) return sA - sB;
        const wA = parseNum(a.wardVoterSerial);
        const wB = parseNum(b.wardVoterSerial);
        if (wA !== wB) return wA - wB;
        const hA = parseNum(a.houseNumber);
        const hB = parseNum(b.houseNumber);
        if (hA !== hB) return hA - hB;
        return (a.name || '').localeCompare(b.name || '', 'hi');
      });
    }

    const params = { ...(req.query || {}), ...(req.body || {}) };
    const getPhotoSource = await loadPhotoSources(members, params.photo !== 'false');

    const selected = [...new Set(String(params.fields || 'name,voterId,voterSerial,wardNumber,partNumber,guardianName,mobile,village,gramPanchayat')
      .split(',').map((key) => key.trim()).filter((key) => fields[key]))];

    // Check if Campaign Voter Slip format is requested (8 per page: 2 columns x 4 rows)
    const isCampaignSlip = params.layout === 'campaign' ||
      params.campaignSlip === 'true' ||
      params.densityPreset === 'campaign_8' ||
      Number(params.votersPerPage) === 8;

    // Configurable Rows & Columns per Page (Admin control for 30 voters per page, etc.)
    let columns = Number(params.columns);
    let rowsPerPage = Number(params.rowsPerPage);
    const votersPerPage = Number(params.votersPerPage);

    if (isCampaignSlip) {
      if (votersPerPage === 4) {
        columns = 2; rowsPerPage = 2;
      } else if (votersPerPage === 6) {
        columns = 2; rowsPerPage = 3;
      } else if (votersPerPage === 10) {
        columns = 2; rowsPerPage = 5;
      } else if (votersPerPage === 12) {
        columns = 2; rowsPerPage = 6;
      } else {
        columns = 2; rowsPerPage = 4;
      }
    } else if (votersPerPage && (!columns || !rowsPerPage)) {
      if (votersPerPage >= 30) { columns = 3; rowsPerPage = 10; }
      else if (votersPerPage === 24) { columns = 3; rowsPerPage = 8; }
      else if (votersPerPage === 20) { columns = 2; rowsPerPage = 10; }
      else if (votersPerPage === 16) { columns = 2; rowsPerPage = 8; }
      else if (votersPerPage === 15) { columns = 3; rowsPerPage = 5; }
      else if (votersPerPage === 12) { columns = 2; rowsPerPage = 6; }
      else if (votersPerPage === 10) { columns = 2; rowsPerPage = 5; }
      else { columns = 3; rowsPerPage = Math.max(2, Math.ceil(votersPerPage / 3)); }
    } else {
      columns = Math.max(1, Math.min(4, columns || 3));
      rowsPerPage = Math.max(2, Math.min(15, rowsPerPage || (columns === 3 ? 10 : 8)));
    }

    const includePhoto = params.photo !== 'false';
    const paperSize = ['A4', 'A3', 'LETTER', 'LEGAL'].includes(String(params.paperSize).toUpperCase())
      ? String(params.paperSize).toUpperCase() : 'A4';
    const orientation = params.orientation === 'landscape' ? 'landscape' : 'portrait';
    const title = String(params.title || 'मतदाता सूची 2026').slice(0, 100);

    // Resolve Campaign Banner Image if provided
    // Resolve Image Buffers for Campaign Banner, Candidate Photo, Leader Photo, and Election Symbol
    function resolveImageBuffer(imgInput) {
      if (!imgInput) return null;
      if (typeof imgInput === 'string' && imgInput.startsWith('data:image')) {
        try {
          const base64Data = imgInput.split(',')[1] || imgInput;
          return Buffer.from(base64Data, 'base64');
        } catch (_) { return null; }
      }
      if (typeof imgInput === 'string') {
        const localPath = imgInput.startsWith('/uploads/')
          ? path.join(__dirname, '../../', imgInput)
          : path.join(__dirname, '../../uploads', imgInput);
        if (fs.existsSync(localPath)) {
          try {
            return fs.readFileSync(localPath);
          } catch (_) { return null; }
        }
      }
      return null;
    }

    const bannerBuffer = resolveImageBuffer(params.bannerImage || params.bannerUrl);
    const candidatePhotoBuffer = resolveImageBuffer(params.candidatePhoto || params.candidatePhotoUrl);
    const leaderPhotoBuffer = resolveImageBuffer(params.leaderPhoto || params.leaderPhotoUrl);
    const symbolBuffer = resolveImageBuffer(params.symbolImage || params.symbolUrl);

    const margin = isCampaignSlip ? 15 : 20;
    const doc = new PDFDocument({ size: paperSize, layout: orientation, margin, bufferPages: true });
    doc.registerFont('Hindi', regularFont).registerFont('HindiBold', boldFont).font('Hindi');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="voter-list.pdf"');
    doc.pipe(res);

    const isCompact = rowsPerPage >= 8 || columns >= 3;
    const gapX = isCampaignSlip ? 9 : (columns >= 3 ? 5 : 8);
    const gapY = isCampaignSlip ? 8 : (rowsPerPage >= 8 ? 4 : 8);
    const topY = isCampaignSlip ? margin : (isCompact ? 38 : 50);
    const bottomY = isCampaignSlip ? (doc.page.height - margin) : (doc.page.height - 22);
    const usableWidth = doc.page.width - margin * 2;
    const usableHeight = bottomY - topY;
    const cardWidth = (usableWidth - gapX * (columns - 1)) / columns;
    const cardHeight = (usableHeight - gapY * (rowsPerPage - 1)) / rowsPerPage;
    const pageSize = columns * rowsPerPage;

    // Aggregate metadata for official cover and headers
    const sampleMember = members[0] || {};
    const uniqueAssembly = [...new Set(members.map(m => m.assemblyName || (m.assemblyNumber ? `${m.assemblyNumber} - ${m.assemblyName}` : '')).filter(Boolean))].join(', ') || '179 - सहाड़ा (सामान्य)';
    const uniqueGps = [...new Set(members.map(m => m.gramPanchayat).filter(Boolean))].join(', ');
    const uniqueVillages = [...new Set(members.map(m => m.village || m.location).filter(Boolean))].slice(0, 12).join(', ');
    const uniqueWards = [...new Set(members.map(m => m.wardNumber || (Array.isArray(m.municipalWardNumbers) && m.municipalWardNumbers[0])).filter(Boolean))].sort((a, b) => (parseInt(a) || 0) - (parseInt(b) || 0));
    const uniqueParts = [...new Set(members.map(m => m.partNumber).filter(Boolean))].sort((a, b) => (parseInt(a) || 0) - (parseInt(b) || 0));
    const uniqueSections = [...new Set(members.map(m => m.sectionName || (m.sectionNumber ? `अनुभाग ${m.sectionNumber}: ${m.sectionName || ''}` : '')).filter(Boolean))];

    const maleCount = members.filter(m => m.gender === 'male').length;
    const femaleCount = members.filter(m => m.gender === 'female').length;
    const otherCount = members.length - (maleCount + femaleCount);

    const drawHeader = () => {
      const headerTitleSize = isCompact ? 10.5 : 12;
      doc.font('HindiBold').fontSize(headerTitleSize).fillColor('#071b4b').text(title, margin, isCompact ? 14 : 20, { width: usableWidth - 120 });
      let subHeader = `विधानसभा: ${uniqueAssembly}`;
      if (uniqueGps) subHeader += ` | पं.: ${uniqueGps}`;
      if (uniqueWards.length === 1) subHeader += ` | वार्ड ${uniqueWards[0]}`;
      if (uniqueParts.length === 1) subHeader += ` | भाग #${uniqueParts[0]}`;
      doc.font('Hindi').fontSize(isCompact ? 7 : 8).fillColor('#475569').text(subHeader, margin, isCompact ? 26 : 34, { width: usableWidth - 120 });

      doc.font('HindiBold').fontSize(isCompact ? 7.5 : 8.5).fillColor('#1e40af').text(`कुल मतदाता: ${members.length}`, doc.page.width - margin - 110, isCompact ? 16 : 22, { width: 110, align: 'right' });
      doc.moveTo(margin, isCompact ? 34 : 46).lineTo(doc.page.width - margin, isCompact ? 34 : 46).strokeColor('#cbd5e1').stroke();
      doc.fillColor('#111827');
    };

    // 1. Draw Official Cover Page (Like Official Election Commission Voter List) - only if explicitly requested
    if (req.query.includeCoverPage === 'true') {
      doc.rect(margin, margin, usableWidth, doc.page.height - margin * 2).lineWidth(2).strokeColor('#071b4b').stroke();

      // Official Title Header
      doc.font('HindiBold').fontSize(18).fillColor('#071b4b').text('निर्वाचन नामावली - 2026', margin + 15, margin + 18, { align: 'center', width: usableWidth - 30 });
      doc.font('HindiBold').fontSize(12).fillColor('#2563eb').text(`विधानसभा निर्वाचन क्षेत्र: ${uniqueAssembly}`, margin + 15, margin + 44, { align: 'center', width: usableWidth - 30 });

      let coverY = margin + 74;

      // Box 1: Administrative & Hierarchy Details (Ward & Part & GP)
      doc.roundedRect(margin + 15, coverY, usableWidth - 30, 95, 6).fillOpacity(0.04).fillAndStroke('#2563eb', '#cbd5e1').fillOpacity(1);
      doc.font('HindiBold').fontSize(11).fillColor('#1e40af').text('1. क्षेत्र एवं प्रशासनिक विवरण (Area & Administrative Details):', margin + 25, coverY + 8);
      doc.font('Hindi').fontSize(9.5).fillColor('#0f172a');
      
      const partDisplay = uniqueParts.length > 0
        ? (uniqueParts.length <= 10 ? uniqueParts.map(p => `भाग #${p}`).join(', ') : `भाग #${uniqueParts[0]} से #${uniqueParts[uniqueParts.length - 1]} (${uniqueParts.length} भाग)`)
        : (req.query.partNumber ? `भाग #${req.query.partNumber}` : 'समस्त भाग');

      const wardDisplay = uniqueWards.length > 0
        ? (uniqueWards.length <= 12 ? uniqueWards.map(w => `वार्ड ${w}`).join(', ') : `वार्ड ${uniqueWards[0]} से ${uniqueWards[uniqueWards.length - 1]} (${uniqueWards.length} वार्ड)`)
        : (req.query.wardNumber ? `वार्ड ${req.query.wardNumber}` : 'समस्त वार्ड');

      doc.text(`ग्राम पंचायत / निकाय: ${uniqueGps || req.query.gramPanchayat || sampleMember.gramPanchayat || 'समस्त'}  |  तहसील: ${sampleMember.tehsil || req.query.tehsil || 'रायपुर'}`, margin + 35, coverY + 28);
      doc.text(`वार्ड संख्या: ${wardDisplay}`, margin + 35, coverY + 46);
      doc.text(`मतदान केंद्र / भाग संख्या: ${partDisplay}`, margin + 35, coverY + 64);
      doc.text(`सम्मिलित राजस्व गाँव: ${uniqueVillages || sampleMember.village || '-'}`, margin + 35, coverY + 80);

      coverY += 105;

      // Box 2: Sections List (भाग में आने वाले अनुभाग)
      doc.roundedRect(margin + 15, coverY, usableWidth - 30, 85, 6).fillOpacity(0.03).fillAndStroke('#071b4b', '#cbd5e1').fillOpacity(1);
      doc.font('HindiBold').fontSize(11).fillColor('#071b4b').text('2. अनुभागों की संख्या एवं नाम (Sections in this Part / Ward):', margin + 25, coverY + 8);
      doc.font('Hindi').fontSize(9.5).fillColor('#1f2937');
      let secText = uniqueSections.slice(0, 4).map((sec, idx) => `${idx + 1}. ${sec}`).join('\n');
      if (!secText) secText = '1. मुख्य भाग एवं समस्त सम्मिलित क्षेत्र';
      doc.text(secText, margin + 35, coverY + 28, { width: usableWidth - 50 });

      coverY += 95;

      // Box 3: Gender Breakdown Table (मतदाता संख्या का विवरण)
      doc.roundedRect(margin + 15, coverY, usableWidth - 30, 85, 6).strokeColor('#cbd5e1').stroke();
      doc.font('HindiBold').fontSize(11).fillColor('#071b4b').text('3. मतदाता संख्या का विवरण (Gender Breakdown Summary):', margin + 25, coverY + 8);

      const colW = (usableWidth - 50) / 4;
      doc.font('HindiBold').fontSize(9.5).fillColor('#1e293b');
      doc.text('पुरुष मतदाता', margin + 35, coverY + 28, { width: colW });
      doc.text('महिला मतदाता', margin + 35 + colW, coverY + 28, { width: colW });
      doc.text('तृतीय लिंग', margin + 35 + colW * 2, coverY + 28, { width: colW });
      doc.text('कुल मतदाता', margin + 35 + colW * 3, coverY + 28, { width: colW });

      doc.moveTo(margin + 25, coverY + 44).lineTo(margin + usableWidth - 25, coverY + 44).strokeColor('#cbd5e1').stroke();

      doc.font('Hindi').fontSize(11).fillColor('#0f172a');
      doc.text(String(maleCount), margin + 35, coverY + 52, { width: colW });
      doc.text(String(femaleCount), margin + 35 + colW, coverY + 52, { width: colW });
      doc.text(String(otherCount), margin + 35 + colW * 2, coverY + 52, { width: colW });
      doc.font('HindiBold').fillColor('#2563eb').text(String(members.length), margin + 35 + colW * 3, coverY + 52, { width: colW });

      coverY += 95;

      // Box 4: Polling Station & Address Details
      doc.roundedRect(margin + 15, coverY, usableWidth - 30, 75, 6).fillOpacity(0.03).fillAndStroke('#16a34a', '#bbf7d0').fillOpacity(1);
      doc.font('HindiBold').fontSize(11).fillColor('#15803d').text('4. मतदान केंद्र भवन व संपर्क विवरण (Polling Station Details):', margin + 25, coverY + 8);
      doc.font('Hindi').fontSize(9.5).fillColor('#1f2937');
      doc.text(`मतदान केंद्र भवन: ${sampleMember.sectionName || sampleMember.partName || (uniqueGps ? `राजकीय विद्यालय, ${uniqueGps}` : 'राजकीय उच्च प्राथमिक विद्यालय')}`, margin + 35, coverY + 28);
      doc.text(`थाना / डाकघर: ${sampleMember.policeStation || 'रायपुर'} / ${sampleMember.postOffice || 'रायपुर'}  |  पिन कोड: ${sampleMember.pinCode || '311803'}`, margin + 35, coverY + 48);

      doc.addPage();
    }

    // 2. Draw Voter Cards in Configured Grid
    if (!isCampaignSlip) drawHeader();
    for (let i = 0; i < members.length; i++) {
      if (i > 0 && i % pageSize === 0) {
        doc.addPage();
        if (!isCampaignSlip) drawHeader();
      }

      const m = members[i];
      const pageIndex = i % pageSize;
      const r = Math.floor(pageIndex / columns);
      const c = pageIndex % columns;
      const x = margin + c * (cardWidth + gapX);
      const y = topY + r * (cardHeight + gapY);

      if (isCampaignSlip) {
        // =========================================================================
        // CANDIDATE CAMPAIGN VOTER SLIP (8 Per Page: 2 Columns x 4 Rows)
        // With Banner Image, Scissor Tear-off Divider, Voter Info, Photo, Ward Box, & Voting Hours
        // =========================================================================

        // Outer Card Border
        doc.roundedRect(x, y, cardWidth, cardHeight, 3).lineWidth(0.8).strokeColor('#334155').stroke();

        // 1. TOP SECTION: Campaign Banner
        const bannerH = Math.min(130, Math.max(56, Math.round(cardHeight * 0.35)));
        if (bannerBuffer) {
          try {
            // Fill background white before placing banner image
            doc.rect(x + 0.5, y + 0.5, cardWidth - 1, bannerH).fillColor('#ffffff').fill();
            doc.image(bannerBuffer, x + 0.5, y + 0.5, { fit: [cardWidth - 1, bannerH], align: 'center', valign: 'center' });
          } catch (_) {
            drawDefaultBanner();
          }
        } else {
          drawDefaultBanner();
        }

        function drawDefaultBanner() {
          const gpName = m.gramPanchayat || params.gramPanchayat || sampleMember.gramPanchayat || '';
          const postName = params.candidatePost || '';
          const candName = (params.candidateName || '').trim();
          const candTagline = (params.candidateTagline || params.tagline || '').trim();
          const candPhone = (params.candidatePhone || '').trim();
          const candSlogan = (params.candidateSlogan || '').trim();

          if (candName) {
            // Rich Graphic Designer Election Campaign Banner with Golden Rings & Badges
            doc.rect(x + 0.5, y + 0.5, cardWidth - 1, bannerH).fillColor('#fffdf6').fill();
            doc.rect(x + 0.5, y + 0.5, cardWidth - 1, 3.5).fillColor('#f59e0b').fill();
            doc.moveTo(x + 2, y + bannerH).lineTo(x + cardWidth - 2, y + bannerH).lineWidth(0.6).strokeColor('#f59e0b').stroke();

            const photoR = Math.min(27, Math.max(18, Math.round((bannerH - 14) / 2)));
            const photoCY = y + bannerH / 2;

            // Candidate Photo in Ornate Golden Circular Frame (No BG removal needed!)
            const leftCX = x + 8 + photoR;
            if (candidatePhotoBuffer) {
              try {
                doc.save();
                doc.circle(leftCX, photoCY, photoR).clip();
                doc.image(candidatePhotoBuffer, leftCX - photoR, photoCY - photoR, {
                  width: photoR * 2,
                  height: photoR * 2,
                  fit: [photoR * 2, photoR * 2],
                  align: 'center',
                  valign: 'center',
                });
                doc.restore();

                // Multi-layered Golden Metallic Ring
                doc.circle(leftCX, photoCY, photoR + 1.8).lineWidth(2.2).strokeColor('#f59e0b').stroke();
                doc.circle(leftCX, photoCY, photoR + 3.2).lineWidth(1.0).strokeColor('#b45309').stroke();
                doc.circle(leftCX, photoCY, photoR).lineWidth(0.8).strokeColor('#78350f').stroke();
              } catch (_) {}
            }

            // Right Side: Leader Photo or Election Symbol in Golden Ring
            const rightCX = x + cardWidth - 8 - photoR;
            if (leaderPhotoBuffer) {
              try {
                doc.save();
                doc.circle(rightCX, photoCY, photoR).clip();
                doc.image(leaderPhotoBuffer, rightCX - photoR, photoCY - photoR, {
                  width: photoR * 2,
                  height: photoR * 2,
                  fit: [photoR * 2, photoR * 2],
                  align: 'center',
                  valign: 'center',
                });
                doc.restore();

                doc.circle(rightCX, photoCY, photoR + 1.8).lineWidth(2.2).strokeColor('#f59e0b').stroke();
                doc.circle(rightCX, photoCY, photoR + 3.2).lineWidth(1.0).strokeColor('#b45309').stroke();
                doc.circle(rightCX, photoCY, photoR).lineWidth(0.8).strokeColor('#78350f').stroke();
              } catch (_) {}
            } else if (symbolBuffer) {
              try {
                doc.save();
                doc.circle(rightCX, photoCY, photoR).fillColor('#ffffff').fill();
                doc.circle(rightCX, photoCY, photoR).clip();
                doc.image(symbolBuffer, rightCX - photoR + 2, photoCY - photoR + 2, {
                  width: (photoR - 2) * 2,
                  height: (photoR - 2) * 2,
                  fit: [(photoR - 2) * 2, (photoR - 2) * 2],
                  align: 'center',
                  valign: 'center',
                });
                doc.restore();

                doc.circle(rightCX, photoCY, photoR + 1.8).lineWidth(2.0).strokeColor('#f59e0b').stroke();
                doc.circle(rightCX, photoCY, photoR + 3.0).lineWidth(1.0).strokeColor('#b45309').stroke();
              } catch (_) {}
            }

            // Center Text Typography
            const textLeft = candidatePhotoBuffer ? (leftCX + photoR + 6) : (x + 8);
            const textRight = (leaderPhotoBuffer || symbolBuffer) ? (rightCX - photoR - 6) : (x + cardWidth - 8);
            const textWidth = Math.max(80, textRight - textLeft);

            let curY = y + 4;
            if (postName || gpName) {
              const headerText = postName
                ? (gpName ? `ग्राम पंचायत ${gpName} से ${postName} पद हेतु` : `${postName} पद हेतु`)
                : `ग्राम पंचायत ${gpName}`;
              doc.font('HindiBold').fontSize(8.5).fillColor('#9a3412').text(headerText, textLeft, curY, { width: textWidth, align: 'center' });
              curY += 12;
            }

            doc.font('HindiBold').fontSize(16.0).fillColor('#1d4ed8').text(candName, textLeft, curY, { width: textWidth, align: 'center' });
            curY += 18;

            if (candTagline) {
              doc.font('HindiBold').fontSize(7.5).fillColor('#1e40af').text(`"${candTagline}"`, textLeft, curY, { width: textWidth, align: 'center' });
              curY += 11;
            }

            const sloganText = candSlogan || 'को वोट देकर भारी मतों से विजयी बनावें।';
            doc.font('HindiBold').fontSize(8.5).fillColor('#b91c1c').text(sloganText, textLeft, curY, { width: textWidth, align: 'center' });
            curY += 12;

            if (candPhone) {
              doc.font('HindiBold').fontSize(8.0).fillColor('#0f172a').text(`मो. ${candPhone}`, textLeft, curY, { width: textWidth, align: 'center' });
            }
          } else {
            // Elegant Official Voter Information Header (No fake default name!)
            doc.rect(x + 0.5, y + 0.5, cardWidth - 1, bannerH).fillColor('#f8fafc').fill();
            doc.rect(x + 0.5, y + 0.5, cardWidth - 1, 3.5).fillColor('#1e40af').fill();

            const wardNum = m.wardNumber || (Array.isArray(m.municipalWardNumbers) && m.municipalWardNumbers[0]) || params.wardNumber || '';
            const asmNum = m.assemblyNumber || sampleMember.assemblyNumber || '';
            const partNo = m.partNumber || sampleMember.partNumber || '';

            doc.font('HindiBold').fontSize(9).fillColor('#1e40af').text('राजस्थान राज्य निर्वाचन आयोग | मतदाता सूचना पर्ची', x + 4, y + 8, { width: cardWidth - 8, align: 'center' });
            const titlePanchayat = gpName ? (wardNum ? `ग्राम पंचायत : ${gpName} (वार्ड संख्या : ${wardNum})` : `ग्राम पंचायत : ${gpName}`) : 'मतदाता सूचना पर्ची 2026';
            doc.font('HindiBold').fontSize(14).fillColor('#0f172a').text(titlePanchayat, x + 4, y + 24, { width: cardWidth - 8, align: 'center' });
            const subTitle = asmNum ? `विधानसभा क्षेत्र सं. ${asmNum}  |  भाग संख्या : ${partNo || '-'}` : 'मतदाता पर्ची - निःशुल्क वितरण';
            doc.font('Hindi').fontSize(8.5).fillColor('#475569').text(subTitle, x + 4, y + 46, { width: cardWidth - 8, align: 'center' });
          }
        }

        // 2. TEAR-OFF SCISSOR LINE
        const dividerY = y + bannerH + 1;
        doc.save();
        doc.dash(2.5, { space: 2.5 }).moveTo(x + 2, dividerY).lineTo(x + cardWidth - 2, dividerY).lineWidth(0.6).strokeColor('#64748b').stroke();
        doc.restore();

        const tearOffText = '✂ मतदान तिथि से पूर्व बांटी गयी पर्ची, मतदान केन्द्र में जाने से पहले ऊपर का हिस्सा फाड़ दें। ✂';
        doc.font('Hindi').fontSize(5.6).fillColor('#475569').text(tearOffText, x, dividerY + 1.5, { width: cardWidth, align: 'center' });

        // 3. VOTER DATA AREA
        const contentY = dividerY + 10;
        const contentH = cardHeight - bannerH - 12 - 16;
        const col1W = 136;
        const col2W = 54;
        const col3W = cardWidth - col1W - col2W - 8;
        const col1X = x + 4;
        const col2X = col1X + col1W + 2;
        const col3X = col2X + col2W + 2;

        // Serial Box (Highlighted in Blue)
        const serialNum = isWardPrint
          ? (m.wardVoterSerial ? String(m.wardVoterSerial) : (m.voterSerial ? String(m.voterSerial) : String(i + 1)))
          : (m.voterSerial ? String(m.voterSerial) : (m.wardVoterSerial ? String(m.wardVoterSerial) : String(i + 1)));

        doc.roundedRect(col1X, contentY, 36, 17, 2).lineWidth(0.8).strokeColor('#2563eb').fillColor('#eff6ff').fillAndStroke();
        doc.font('HindiBold').fontSize(12).fillColor('#1e40af').text(serialNum, col1X, contentY + 2.5, { width: 36, align: 'center' });

        // EPIC Box (Highlighted in Dark Slate)
        const epicBoxW = col1W - 40;
        doc.roundedRect(col1X + 40, contentY, epicBoxW, 17, 2).lineWidth(0.8).strokeColor('#334155').fillColor('#f8fafc').fillAndStroke();
        doc.font('HindiBold').fontSize(10.5).fillColor('#0f172a').text(m.voterId || '-', col1X + 40, contentY + 3, { width: epicBoxW, align: 'center' });

        // Voter Lines (Large, Bold, High-Contrast Typography)
        let voterLineY = contentY + 21;
        const name = ((m.name || '') + ' ' + (m.surname || '')).trim() || '-';
        const guardian = m.guardianName || m.relativeName || '-';
        const relationLabel = m.gender === 'female' && m.relativeName ? 'पति का नाम' : 'पिता का नाम';
        const house = m.houseNumber || '-';
        const gender = labels.gender[m.gender] ? (m.gender === 'male' ? 'पुरुष' : (m.gender === 'female' ? 'महिला' : labels.gender[m.gender])) : (m.gender || '-');
        const age = m.age ? String(m.age) : '-';

        // Voter Name: Extra Bold, 11.5pt
        doc.font('Hindi').fontSize(9.5).fillColor('#334155').text('नाम: ', col1X, voterLineY, { continued: true });
        doc.font('HindiBold').fontSize(11.5).fillColor('#000000').text(name, { lineBreak: false });
        voterLineY += 13.5;

        // Guardian: 9.5pt
        doc.font('Hindi').fontSize(9.0).fillColor('#334155').text(`${relationLabel}: `, col1X, voterLineY, { continued: true });
        doc.font('HindiBold').fontSize(9.5).fillColor('#0f172a').text(guardian, { lineBreak: false });
        voterLineY += 12.5;

        // House: 9.5pt
        doc.font('Hindi').fontSize(9.0).fillColor('#334155').text('मकान संख्या: ', col1X, voterLineY, { continued: true });
        doc.font('HindiBold').fontSize(9.5).fillColor('#0f172a').text(house, { lineBreak: false });
        voterLineY += 12.5;

        // Age & Gender: 9.5pt
        doc.font('Hindi').fontSize(9.0).fillColor('#334155').text('आयु: ', col1X, voterLineY, { continued: true });
        doc.font('HindiBold').fontSize(9.5).fillColor('#0f172a').text(`${age}   `, { continued: true });
        doc.font('Hindi').fontSize(9.0).fillColor('#334155').text('लिंग: ', { continued: true });
        doc.font('HindiBold').fontSize(9.5).fillColor('#0f172a').text(gender, { lineBreak: false });

        // Optional Mobile
        if (m.mobile) {
          voterLineY += 12.5;
          doc.font('HindiBold').fontSize(9.2).fillColor('#15803d').text(`📱 ${m.mobile}`, col1X, voterLineY, { lineBreak: false });
        }

        // Col 2: Voter Photo Box
        const photoBoxW = 52;
        const photoBoxH = 68;
        const photoBoxX = col2X + (col2W - photoBoxW) / 2;
        const photoBoxY = contentY + (contentH - photoBoxH) / 2 - 2;

        doc.roundedRect(photoBoxX, photoBoxY, photoBoxW, photoBoxH, 2).lineWidth(0.6).strokeColor('#64748b').stroke();
        if (includePhoto) {
          const voterImg = getPhotoSource(m);
          if (voterImg) {
            try {
              doc.image(voterImg, photoBoxX, photoBoxY, { fit: [photoBoxW, photoBoxH], align: 'center', valign: 'center' });
            } catch (_) {
              doc.font('Hindi').fontSize(6.5).fillColor('#94a3b8').text('फोटो', photoBoxX, photoBoxY + photoBoxH / 2 - 4, { width: photoBoxW, align: 'center' });
            }
          } else {
            doc.font('Hindi').fontSize(6.5).fillColor('#94a3b8').text('फोटो', photoBoxX, photoBoxY + photoBoxH / 2 - 4, { width: photoBoxW, align: 'center' });
          }
        }

        // Col 3: Booth, Ward & Polling Station Box (Vibrant Red Graphic Designer Finish Matching Sample)
        doc.roundedRect(col3X, contentY, col3W, contentH - 4, 4).fillColor('#b91c1c').fill();
        
        // WARD HEADER
        doc.font('HindiBold').fontSize(9.0).fillColor('#ffffff').text('वार्ड नंबर', col3X + 2, contentY + 3.5, { width: col3W - 4, align: 'center' });

        // WARD NUMBER (LARGE BOLD WHITE 20pt)
        const wardNum = m.wardNumber || (Array.isArray(m.municipalWardNumbers) && m.municipalWardNumbers[0]) || params.wardNumber || '-';
        doc.font('HindiBold').fontSize(20).fillColor('#ffffff').text(String(wardNum), col3X + 2, contentY + 15.5, { width: col3W - 4, align: 'center' });

        // GOLD / WHITE SEPARATOR LINE
        doc.moveTo(col3X + 6, contentY + 38).lineTo(col3X + col3W - 6, contentY + 38).lineWidth(0.8).strokeColor('#fef08a').stroke();

        // POLLING STATION LABEL
        doc.font('HindiBold').fontSize(8.2).fillColor('#ffffff').text('मतदान केंद्र', col3X + 2, contentY + 41, { width: col3W - 4, align: 'center' });

        // Polling Station Building Name
        const boothDesc = params.pollingStation || m.sectionName || m.partName || (m.gramPanchayat ? `राजकीय विद्यालय, ${m.gramPanchayat}` : 'मतदान केंद्र');
        doc.font('Hindi').fontSize(6.8).fillColor('#ffffff').text(boothDesc, col3X + 2, contentY + 53, { width: col3W - 4, align: 'center', height: 38, lineBreak: true });

        // 4. BOTTOM RED FOOTER STRIP
        const footerH = 16;
        const footerY = y + cardHeight - footerH;
        doc.rect(x + 0.5, footerY, cardWidth - 1, footerH).fillColor('#dc2626').fill();
        const votingTime = params.pollingTime || 'मतदान समय : प्रातः 7 से सायं 6 बजे तक';
        doc.font('HindiBold').fontSize(9.2).fillColor('#ffffff').text(votingTime, x, footerY + 3, { width: cardWidth, align: 'center' });
        doc.font('Hindi').fontSize(8.0).fillColor('#ffffff').text(String(i + 1), x, footerY + 3.5, { width: cardWidth - 8, align: 'right' });
      } else {
        // =========================================================================
        // STANDARD VOTER LIST CARD GRID
        // =========================================================================

        // Card border
        doc.roundedRect(x, y, cardWidth, cardHeight, 2.5).lineWidth(0.6).strokeColor('#94a3b8').stroke();

        // Header strip height dynamically scaled
        const headerH = Math.max(13, Math.min(17, cardHeight * 0.18));
        doc.rect(x, y, cardWidth, headerH).fillColor('#f1f5f9').fill();
        doc.rect(x, y + headerH, cardWidth, 0.5).fillColor('#cbd5e1').fill();

        // Serial
        const serialNum = isWardPrint
          ? (m.wardVoterSerial ? String(m.wardVoterSerial) : (m.voterSerial ? String(m.voterSerial) : String(i + 1)))
          : (m.voterSerial ? String(m.voterSerial) : (m.wardVoterSerial ? String(m.wardVoterSerial) : String(i + 1)));
        const serialSize = cardHeight >= 85 ? (columns <= 2 ? 10.5 : 9) : (cardHeight >= 70 ? 8.5 : 7.5);
        doc.font('HindiBold').fontSize(serialSize).fillColor('#1e40af').text(serialNum, x + 5, y + (headerH - serialSize) / 2 + 0.5);

        // EPIC / Voter ID
        if (m.voterId) {
          const epicSize = cardHeight >= 85 ? (columns <= 2 ? 9.5 : 8.2) : (cardHeight >= 70 ? 7.8 : 7.0);
          doc.font('HindiBold').fontSize(epicSize).fillColor('#0f172a').text(m.voterId, x, y + (headerH - epicSize) / 2 + 0.5, { width: cardWidth - 6, align: 'right' });
        }

        // Dynamic Photo sizing to fill card height proportionally
        let photoW = 0;
        if (includePhoto) {
          const availPhotoH = cardHeight - headerH - 8;
          if (columns <= 2) {
            photoW = Math.min(48, Math.max(36, cardWidth * 0.185));
            const photoH = Math.min(availPhotoH, Math.round(photoW * 1.3));
            const photoX = x + cardWidth - photoW - 5;
            const photoY = y + headerH + 4;

            const img = getPhotoSource(m);
            doc.roundedRect(photoX, photoY, photoW, photoH, 2).lineWidth(0.5).strokeColor('#94a3b8').stroke();
            if (img) {
              try {
                doc.image(img, photoX, photoY, { fit: [photoW, photoH], align: 'center', valign: 'center' });
              } catch (_) {
                doc.font('Hindi').fontSize(6).fillColor('#94a3b8').text('Photo', photoX, photoY + (photoH / 2) - 4, { width: photoW, align: 'center' });
              }
            } else {
              doc.font('Hindi').fontSize(6).fillColor('#94a3b8').text('Photo', photoX, photoY + (photoH / 2) - 4, { width: photoW, align: 'center' });
            }
          } else {
            photoW = Math.min(36, Math.max(26, cardWidth * 0.21));
            const photoH = Math.min(availPhotoH, Math.round(photoW * 1.3));
            const photoX = x + cardWidth - photoW - 4;
            const photoY = y + headerH + 3;

            const img = getPhotoSource(m);
            doc.roundedRect(photoX, photoY, photoW, photoH, 2).lineWidth(0.5).strokeColor('#94a3b8').stroke();
            if (img) {
              try {
                doc.image(img, photoX, photoY, { fit: [photoW, photoH], align: 'center', valign: 'center' });
              } catch (_) {
                doc.font('Hindi').fontSize(5.5).fillColor('#94a3b8').text('Photo', photoX, photoY + (photoH / 2) - 3, { width: photoW, align: 'center' });
              }
            } else {
              doc.font('Hindi').fontSize(5.5).fillColor('#94a3b8').text('Photo', photoX, photoY + (photoH / 2) - 3, { width: photoW, align: 'center' });
            }
          }
        }

        // Text lines with dynamic typography filling the card
        const textX = x + (columns <= 2 ? 6 : 4);
        const textW = cardWidth - (includePhoto ? photoW + (columns <= 2 ? 14 : 9) : (columns <= 2 ? 12 : 8));
        let textY = y + headerH + (cardHeight >= 85 ? 4.5 : 3);

        const name = ((m.name || '') + ' ' + (m.surname || '')).trim() || '-';
        const guardian = m.guardianName || m.relativeName || '-';
        const house = m.houseNumber || '-';
        const gender = labels.gender[m.gender] ? (m.gender === 'male' ? 'पु.' : (m.gender === 'female' ? 'म.' : labels.gender[m.gender])) : (m.gender || '-');
        const age = m.age ? String(m.age) : '-';

        if (columns <= 2) {
          // 2-Column Layout (e.g. 16 or 20 per page): Large, bold, dark, perfectly filling the box
          const isTall = cardHeight >= 85;
          const nameSize = isTall ? 11.0 : 9.5;
          const line1Step = isTall ? 14.0 : 12.0;
          const detailSize = isTall ? 9.0 : 8.0;
          const lineStep = isTall ? 12.8 : 11.0;
          const subDetailSize = isTall ? 8.2 : 7.2;

          // Line 1: Name
          doc.font('HindiBold').fontSize(nameSize).fillColor('#090d16').text(name, textX, textY, { width: textW, lineBreak: false });
          textY += line1Step;

          // Line 2: Guardian
          doc.font('Hindi').fontSize(detailSize).fillColor('#1e293b').text('पिता/पति: ' + guardian, textX, textY, { width: textW, lineBreak: false });
          textY += lineStep;

          // Line 3: House
          doc.font('Hindi').fontSize(detailSize).fillColor('#1e293b').text('मकान सं.: ' + house, textX, textY, { width: textW, lineBreak: false });
          textY += lineStep;

          // Line 4: Age, Gender, Mobile
          let ageLine = 'उम्र: ' + age + '  लिंग: ' + gender;
          if (m.mobile) ageLine += '   📱' + m.mobile;
          doc.font('Hindi').fontSize(detailSize).fillColor('#1e293b').text(ageLine, textX, textY, { width: textW, lineBreak: false });
          textY += lineStep;

          // Line 5: Caste & Location
          let extraLine = '';
          if (m.caste) extraLine += 'जाति: ' + m.caste;
          if (m.village) extraLine += (extraLine ? ' | ' : '') + m.village;
          else if (m.wardNumber) extraLine += (extraLine ? ' | ' : '') + 'वार्ड ' + m.wardNumber;
          if (extraLine) {
            doc.font('Hindi').fontSize(subDetailSize).fillColor('#334155').text(extraLine, textX, textY, { width: textW, lineBreak: false });
          }
        } else {
          // 3-Column Layout (e.g. 30 per page): Crisp, compact, filling height cleanly
          const nameSize = cardHeight >= 70 ? 8.8 : 7.5;
          const line1Step = cardHeight >= 70 ? 11.0 : 9.8;
          const detailSize = cardHeight >= 70 ? 7.5 : 6.6;
          const lineStep = cardHeight >= 70 ? 10.4 : 9.2;
          const subDetailSize = cardHeight >= 70 ? 6.8 : 6.0;

          // Line 1: Name
          doc.font('HindiBold').fontSize(nameSize).fillColor('#090d16').text(name, textX, textY, { width: textW, lineBreak: false });
          textY += line1Step;

          // Line 2: Guardian
          doc.font('Hindi').fontSize(detailSize).fillColor('#1e293b').text('पिता/पति: ' + guardian, textX, textY, { width: textW, lineBreak: false });
          textY += lineStep;

          // Line 3: House
          doc.font('Hindi').fontSize(detailSize).fillColor('#1e293b').text('मकान सं.: ' + house, textX, textY, { width: textW, lineBreak: false });
          textY += lineStep;

          // Line 4: Age & Gender
          let ageLine = 'उम्र: ' + age + '  लिंग: ' + gender;
          if (m.mobile) ageLine += '  📱' + m.mobile;
          doc.font('Hindi').fontSize(detailSize).fillColor('#1e293b').text(ageLine, textX, textY, { width: textW, lineBreak: false });
          textY += lineStep;

          // Line 5: Caste & Location
          let extraLine = '';
          if (m.caste) extraLine += 'जाति: ' + m.caste;
          if (m.village) extraLine += (extraLine ? ' | ' : '') + m.village;
          else if (m.wardNumber) extraLine += (extraLine ? ' | ' : '') + 'वार्ड ' + m.wardNumber;
          if (extraLine && cardHeight >= 66) {
            doc.font('Hindi').fontSize(subDetailSize).fillColor('#334155').text(extraLine, textX, textY, { width: textW, lineBreak: false });
          }
        }
      }
    }

    if (!members.length) {
      doc.font('Hindi').fontSize(14).fillColor('#667394').text('चुने गए फ़िल्टर में कोई मतदाता नहीं मिला।', margin, 90, { align: 'center', width: usableWidth });
    }

    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i += 1) {
      doc.switchToPage(pages.start + i);
      const oldBottom = doc.page.margins.bottom;
      doc.page.margins.bottom = 0;
      doc.font('Hindi').fontSize(8).fillColor('#667394')
        .text(`पृष्ठ ${i + 1} / ${pages.count}`, margin, doc.page.height - 18, {
          width: usableWidth,
          align: 'center',
          lineBreak: false,
        });
      doc.page.margins.bottom = oldBottom;
    }
    doc.end();
  } catch (error) { next(error); }
};

exports.uploadBanner = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'कृपया बैनर इमेज अपलोड करें' });
    }
    const relativePath = `/uploads/${req.file.filename}`;
    return res.json({
      success: true,
      url: relativePath,
      filename: req.file.filename,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

