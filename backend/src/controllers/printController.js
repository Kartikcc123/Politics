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
  const query = { ...(req.query || {}), ...(req.body || {}) };
  const q = String(query.q || '').trim();
  if (q) filter.$or = [
    'name', 'surname', 'mobile', 'altMobile', 'voterId', 'guardianName',
    'houseNumber', 'address', 'location', 'village', 'gramPanchayat',
    'tehsil', 'municipality', 'caste', 'organizationPost', 'sectionName',
    'assemblyName', 'partNumber',
  ].map((key) => ({ [key]: new RegExp(escapeRegex(q), 'i') }));

  const vilParam = query.village || query.gaon || query.gav;
  if (vilParam) {
    const vRegex = hindiFlexibleRegex(vilParam);
    filter.$and = [...(filter.$and || []), {
      $or: [
        { village: vRegex },
        { mukhyaGram: vRegex }
      ]
    }];
  }

  const gpParam = query.gramPanchayat || query.panchayat;
  if (gpParam) {
    filter.gramPanchayat = hindiFlexibleRegex(gpParam);
  }

  const samitiWardParam = query.samitiWard || query.panchayatSamitiWard;
  if (samitiWardParam) {
    filter.panchayatSamitiWard = hindiFlexibleRegex(samitiWardParam);
  }

  for (const key of [
    'tehsil', 'municipality', 'caste',
    'organizationPost', 'location', 'sectionName', 'assemblyName',
  ]) {
    if (query[key]) filter[key] = new RegExp(escapeRegex(query[key]), 'i');
  }
  const samitiParam = query.tehsil || query.samiti || query.simiti || query.panchayatSamiti;
  if (samitiParam) {
    filter.tehsil = hindiFlexibleRegex(samitiParam);
  }
  for (const key of [
    'supportLevel', 'area', 'gender', 'verificationStatus', 'assemblyNumber',
    'sectionNumber',
  ]) {
    if (query[key]) filter[key] = query[key];
  }
  if (query.partNumber) {
    const parts = String(query.partNumber).split(',').map((p) => p.trim()).filter(Boolean);
    if (parts.length > 1) {
      filter.partNumber = { $in: parts };
    } else if (parts.length === 1) {
      filter.partNumber = parts[0];
    }
  }
  const wardParam = query.wardNumber || query.ward || query.municipalWard;
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
  if (query.letter) {
    filter.name = new RegExp(`^${escapeRegex(String(query.letter).trim())}`, 'i');
  }
  if (query.isDeleted === 'true' || query.vilopan === 'true') {
    filter.isDeleted = true;
  } else if (query.isDeleted === 'false') {
    filter.isDeleted = { $ne: true };
  }
  if (query.supplementType) {
    filter.supplementType = query.supplementType;
  }
  if (query.hasMobile === 'true' || query.withMobileOnly === 'true') {
    filter.mobile = { $nin: ['', null], $exists: true };
  }
  if (query.favorite === 'true' || query.favoritesOnly === 'true' || query.isFavorite === 'true') {
    filter.isFavorite = true;
  }
  if (query.verified === 'true' || query.verifiedOnly === 'true') {
    filter.verificationStatus = 'verified';
  }
  if (query.missingMobile === 'true') {
    filter.$and = [...(filter.$and || []), { $or: [{ mobile: '' }, { mobile: null }, { mobile: { $exists: false } }] }];
  }
  if (query.missingHouse === 'true') {
    filter.$and = [...(filter.$and || []), { $or: [{ houseNumber: '' }, { houseNumber: null }, { houseNumber: { $exists: false } }] }];
  }

  const partyPref = query.partyPreference || query.party;
  if (partyPref && partyPref !== 'all') {
    filter.partyPreference = partyPref;
  }

  const ids = String(query.ids || '').split(',').map((id) => id.trim()).filter(Boolean);
  const excluded = String(query.excludedIds || '').split(',').map((id) => id.trim()).filter(Boolean);
  if (ids.length && query.selectAll !== 'true') filter._id = { $in: ids };
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
    const params = { ...(req.query || {}), ...(req.body || {}) };
    const limit = Math.min(Math.max(Number(params.limit) || 10000, 1), 10000);
    const isWardPrint = Boolean(
      params.wardNumber ||
      params.gramPanchayat ||
      params.panchayat ||
      params.scope === 'specific_ward' ||
      params.scope === 'all_wards' ||
      params.scope === 'all_gp' ||
      params.electoralListType === 'municipal' ||
      params.sortBy === 'wardVoterSerial' ||
      params.rollType === 'municipal' ||
      params.rollType === 'ward' ||
      req.currentUser?.allowedRollType === 'municipal' ||
      (Array.isArray(req.currentUser?.assignedWards) && req.currentUser.assignedWards.length > 0)
    );

    const sortObj = isWardPrint
      ? { wardNumber: 1, wardVoterSerial: 1, voterSerial: 1 }
      : { partNumber: 1, voterSerial: 1, wardVoterSerial: 1 };

    let membersQuery = Member.find(filter)
      .populate('booth ward')
      .collation({ locale: 'en_US', numericOrdering: true })
      .sort(sortObj);

    if (limit && limit < 10000) {
      membersQuery = membersQuery.limit(limit);
    }
    const members = await membersQuery.lean();

    const parseNum = (v) => {
      if (v === null || v === undefined || v === '') return 99999999;
      const parsed = parseInt(String(v).replace(/[^\d]/g, ''), 10);
      return isNaN(parsed) ? 99999999 : parsed;
    };

    if (isWardPrint) {
      // Sort strictly by Ward Number (1, 2, 3...) then numeric Ward Voter Serial (1, 2, 3...)
      members.sort((a, b) => {
        // Ward Number (1, 2, 3, ...)
        const wA = parseNum(a.wardNumber || (Array.isArray(a.municipalWardNumbers) && a.municipalWardNumbers[0]));
        const wB = parseNum(b.wardNumber || (Array.isArray(b.municipalWardNumbers) && b.municipalWardNumbers[0]));
        if (wA !== wB) return wA - wB;

        // Ward Voter Serial Number 1, 2, 3...
        const sA = parseNum(a.wardVoterSerial);
        const sB = parseNum(b.wardVoterSerial);
        if (sA !== sB) return sA - sB;

        // Assembly Serial fallback
        const vA = parseNum(a.voterSerial);
        const vB = parseNum(b.voterSerial);
        if (vA !== vB) return vA - vB;

        const hA = parseNum(a.houseNumber);
        const hB = parseNum(b.houseNumber);
        if (hA !== hB) return hA - hB;
        return (a.name || '').localeCompare(b.name || '', 'hi');
      });
    } else {
      // Sort strictly by Part/Booth Number then Vidhan Sabha Serial Number 1, 2, 3, 4, 5...
      members.sort((a, b) => {
        const pA = parseNum(a.partNumber);
        const pB = parseNum(b.partNumber);
        if (pA !== pB) return pA - pB;

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

    const getPhotoSource = await loadPhotoSources(members, params.photo !== 'false');

    const selected = [...new Set(String(params.fields || 'name,voterId,voterSerial,wardNumber,partNumber,guardianName,houseNumber,age,gender,mobile,village,gramPanchayat')
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
      if (typeof imgInput === 'string') {
        const trimmed = imgInput.trim();
        if (trimmed.startsWith('data:image')) {
          try {
            const base64Data = trimmed.split(',')[1] || trimmed;
            return Buffer.from(base64Data, 'base64');
          } catch (_) { return null; }
        }
        if (trimmed.length > 200 && !trimmed.startsWith('/') && !trimmed.startsWith('http')) {
          try {
            return Buffer.from(trimmed, 'base64');
          } catch (_) { return null; }
        }
        if (fs.existsSync(trimmed)) {
          try {
            return fs.readFileSync(trimmed);
          } catch (_) { return null; }
        }
        const localPath = trimmed.startsWith('/uploads/')
          ? path.join(__dirname, '../../', trimmed)
          : path.join(__dirname, '../../uploads', trimmed);
        if (fs.existsSync(localPath)) {
          try {
            return fs.readFileSync(localPath);
          } catch (_) { return null; }
        }
      }
      return null;
    }

    const margin = isCampaignSlip ? 15 : 20;
    const doc = new PDFDocument({ size: paperSize, layout: orientation, margin, bufferPages: true });
    doc.registerFont('Hindi', regularFont).registerFont('HindiBold', boldFont).font('Hindi');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="voter-list.pdf"');
    doc.pipe(res);

    // Pre-resolve and pre-compile Image Objects ONCE (reduces server RAM and CPU load by 99% across 1,000s of cards)
    const bannerBuffer = resolveImageBuffer(params.banner || params.bannerImage || params.bannerUrl);
    const candidatePhotoBuffer = resolveImageBuffer(params.candidatePhoto || params.candidatePhotoUrl);
    const leaderPhotoBuffer = resolveImageBuffer(params.leaderPhoto || params.leaderPhotoUrl);
    const symbolBuffer = resolveImageBuffer(params.symbol || params.symbolImage || params.symbolUrl);

    let bannerImageObj = null;
    let candidatePhotoImageObj = null;
    let leaderPhotoImageObj = null;
    let symbolImageObj = null;
    let votingFingerImageObj = null;
    let defaultPartySymbolImageObj = null;

    if (bannerBuffer) {
      try { bannerImageObj = doc.openImage(bannerBuffer); } catch (e) { console.error('Banner image parse error:', e.message); }
    }
    if (candidatePhotoBuffer) {
      try { candidatePhotoImageObj = doc.openImage(candidatePhotoBuffer); } catch (e) { console.error('Candidate photo parse error:', e.message); }
    }
    if (leaderPhotoBuffer) {
      try { leaderPhotoImageObj = doc.openImage(leaderPhotoBuffer); } catch (e) { console.error('Leader photo parse error:', e.message); }
    }
    if (symbolBuffer) {
      try { symbolImageObj = doc.openImage(symbolBuffer); } catch (e) { console.error('Symbol image parse error:', e.message); }
    }

    try {
      const vPath = path.join(__dirname, '../assets/voting_finger_emblem.png');
      if (fs.existsSync(vPath)) votingFingerImageObj = doc.openImage(fs.readFileSync(vPath));
    } catch (e) { console.error('Voting finger load error:', e.message); }

    try {
      const pPath = path.join(__dirname, '../assets/default_party_symbol.png');
      if (fs.existsSync(pPath)) defaultPartySymbolImageObj = doc.openImage(fs.readFileSync(pPath));
    } catch (e) { console.error('Default party symbol load error:', e.message); }

    let bannerTemplateCleanImageObj = null;
    try {
      const btcPath = path.join(__dirname, '../assets/banner_template_clean.png');
      if (fs.existsSync(btcPath)) bannerTemplateCleanImageObj = doc.openImage(fs.readFileSync(btcPath));
    } catch (e) { console.error('Banner template clean load error:', e.message); }

    const effectiveSymbolImageObj = symbolImageObj || defaultPartySymbolImageObj;

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

    // 5 Professional Color Themes (Harmoniously curated) + 1 Custom Theme
    const THEMES = {
      saffron_crimson: {
        bannerBg: '#fffdf6',
        bannerBorder: '#f59e0b',
        bannerRing2: '#b45309',
        bannerRing3: '#78350f',
        cardBorder: '#b91c1c',
        cardInnerBorder: '#f59e0b',
        photoRing: '#d4af37',
        photoRing2: '#f59e0b',
        photoRing3: '#b45309',
        headerL1: '#9a3412',
        headerL2: '#b45309',
        candName: '#1d4ed8',
        tagline: '#1e40af',
        slogan: '#b91c1c',
        phone: '#0f172a',
        serialBorder: '#2563eb',
        serialBg: '#eff6ff',
        serialText: '#1e40af',
        wardBoxBg: '#b91c1c',
        wardBoxText: '#ffffff',
        wardDivider: '#fef08a',
        footerBg: '#dc2626',
        footerText: '#ffffff',
      },
      royal_blue: {
        bannerBg: '#f0f7ff',
        bannerBorder: '#d97706',
        bannerRing2: '#b45309',
        bannerRing3: '#78350f',
        cardBorder: '#1d4ed8',
        cardInnerBorder: '#d97706',
        photoRing: '#d4af37',
        photoRing2: '#f59e0b',
        photoRing3: '#b45309',
        headerL1: '#1e40af',
        headerL2: '#2563eb',
        candName: '#1e3a8a',
        tagline: '#1d4ed8',
        slogan: '#1e40af',
        phone: '#0f172a',
        serialBorder: '#d97706',
        serialBg: '#fef3c7',
        serialText: '#92400e',
        wardBoxBg: '#1d4ed8',
        wardBoxText: '#ffffff',
        wardDivider: '#93c5fd',
        footerBg: '#1e40af',
        footerText: '#ffffff',
      },
      tiranga_green: {
        bannerBg: '#fffdf8',
        bannerBorder: '#15803d',
        bannerRing2: '#d97706',
        bannerRing3: '#b45309',
        cardBorder: '#166534',
        cardInnerBorder: '#ca8a04',
        photoRing: '#d4af37',
        photoRing2: '#f59e0b',
        photoRing3: '#b45309',
        headerL1: '#c2410c',
        headerL2: '#1e293b',
        candName: '#15803d',
        tagline: '#c2410c',
        slogan: '#881337',
        phone: '#334155',
        serialBorder: '#16a34a',
        serialBg: '#f0fdf4',
        serialText: '#15803d',
        wardBoxBg: '#15803d',
        wardBoxText: '#ffffff',
        wardDivider: '#fef08a',
        footerBg: '#0f5132',
        footerText: '#ffffff',
      },
      imperial_maroon: {
        bannerBg: '#fff7ed',
        bannerBorder: '#ca8a04',
        bannerRing2: '#a16207',
        bannerRing3: '#713f12',
        cardBorder: '#881337',
        cardInnerBorder: '#ca8a04',
        photoRing: '#d4af37',
        photoRing2: '#f59e0b',
        photoRing3: '#b45309',
        headerL1: '#9a3412',
        headerL2: '#881337',
        candName: '#881337',
        tagline: '#9f1239',
        slogan: '#881337',
        phone: '#0f172a',
        serialBorder: '#be185d',
        serialBg: '#fdf2f8',
        serialText: '#881337',
        wardBoxBg: '#881337',
        wardBoxText: '#ffffff',
        wardDivider: '#fef08a',
        footerBg: '#9f1239',
        footerText: '#ffffff',
      },
      slate_dark: {
        bannerBg: '#f8fafc',
        bannerBorder: '#475569',
        bannerRing2: '#334155',
        bannerRing3: '#1e293b',
        cardBorder: '#1e293b',
        cardInnerBorder: '#64748b',
        photoRing: '#d4af37',
        photoRing2: '#f59e0b',
        photoRing3: '#b45309',
        headerL1: '#334155',
        headerL2: '#0f172a',
        candName: '#0f172a',
        tagline: '#334155',
        slogan: '#0f172a',
        phone: '#334155',
        serialBorder: '#475569',
        serialBg: '#f1f5f9',
        serialText: '#0f172a',
        wardBoxBg: '#1e293b',
        wardBoxText: '#ffffff',
        wardDivider: '#94a3b8',
        footerBg: '#0f172a',
        footerText: '#ffffff',
      },
    };

    const selectedThemeKey = params.colorTheme || params.theme || 'saffron_crimson';
    const baseTheme = THEMES[selectedThemeKey] || THEMES.saffron_crimson;

    function isColorLight(hex) {
      if (!hex) return false;
      const clean = String(hex).replace('#', '').trim();
      if (clean.length !== 6 && clean.length !== 3) return false;
      let r, g, b;
      if (clean.length === 6) {
        r = parseInt(clean.substring(0, 2), 16);
        g = parseInt(clean.substring(2, 4), 16);
        b = parseInt(clean.substring(4, 6), 16);
      } else {
        r = parseInt(clean[0] + clean[0], 16);
        g = parseInt(clean[1] + clean[1], 16);
        b = parseInt(clean[2] + clean[2], 16);
      }
      if (isNaN(r) || isNaN(g) || isNaN(b)) return false;
      return (r * 299 + g * 587 + b * 114) / 1000 > 155;
    }

    const wardBoxBgColor = params.customPrimaryColor || (selectedThemeKey === 'custom' ? (params.primaryColor || '#b91c1c') : baseTheme.wardBoxBg);
    const isWardLight = isColorLight(wardBoxBgColor);
    const wardBoxTextColor = isWardLight ? '#0f172a' : (baseTheme.wardBoxText || '#ffffff');
    const wardDividerColor = isWardLight ? '#94a3b8' : (baseTheme.wardDivider || '#fef08a');
    const customBorder = params.customBorderColor;
    const isBorderLight = isColorLight(customBorder);
    const wardBoxBorderColor = isWardLight
      ? ((customBorder && !isBorderLight) ? customBorder : '#475569')
      : (customBorder && !isBorderLight ? customBorder : null);

    const footerBgColor = params.customPrimaryColor || (selectedThemeKey === 'custom' ? (params.footerColor || '#dc2626') : baseTheme.footerBg);
    const isFooterLight = isColorLight(footerBgColor);
    const footerTextColor = isFooterLight ? '#0f172a' : (params.customFooterTextColor || baseTheme.footerText || '#ffffff');
    const footerBorderColor = isFooterLight
      ? ((customBorder && !isBorderLight) ? customBorder : '#64748b')
      : null;

    const theme = {
      bannerBg: params.customBannerBg || (selectedThemeKey === 'custom' ? (params.bannerBg || '#fffdf6') : baseTheme.bannerBg),
      bannerBorder: params.customBorderColor || (selectedThemeKey === 'custom' ? (params.borderColor || '#f59e0b') : baseTheme.bannerBorder),
      bannerRing2: baseTheme.bannerRing2,
      bannerRing3: baseTheme.bannerRing3,
      headerL1: baseTheme.headerL1,
      headerL2: baseTheme.headerL2,
      candName: params.customTextColor || (selectedThemeKey === 'custom' ? (params.candNameColor || '#1d4ed8') : baseTheme.candName),
      tagline: baseTheme.tagline,
      slogan: params.customSloganColor || (selectedThemeKey === 'custom' ? (params.sloganColor || '#b91c1c') : baseTheme.slogan),
      phone: baseTheme.phone,
      serialBorder: baseTheme.serialBorder,
      serialBg: baseTheme.serialBg,
      serialText: baseTheme.serialText,
      wardBoxBg: wardBoxBgColor,
      wardBoxText: wardBoxTextColor,
      wardDivider: wardDividerColor,
      wardBoxBorder: wardBoxBorderColor,
      footerBg: footerBgColor,
      footerText: footerTextColor,
      footerBorder: footerBorderColor,
    };

    const textScale = Math.min(1.35, Math.max(0.60, Number(params.fontScale || params.textScaleFactor) || (params.textScale === 'extra_small' ? 0.70 : (params.textScale === 'small' ? 0.85 : (params.textScale === 'large' ? 1.10 : (params.textScale === 'extra_large' ? 1.20 : 1.0))))));

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
      let coverBoothName = '';
      if (params.pollingStation && params.pollingStation.trim()) {
        coverBoothName = params.pollingStation.trim();
      } else if (isWardPrint || uniqueGps) {
        coverBoothName = `राजकीय उच्च माध्यमिक विद्यालय, ${uniqueGps || sampleMember.gramPanchayat || 'ग्राम पंचायत भवन'}`;
      } else {
        const cleanPartName = (sampleMember.partName || '').replace(/^भाग\s*सं(?:ख्या)?\.?\s*\d+\s*[-:]?\s*/i, '').trim();
        coverBoothName = cleanPartName || 'राजकीय उच्च माध्यमिक विद्यालय';
      }
      doc.text(`मतदान केंद्र भवन: ${coverBoothName}`, margin + 35, coverY + 28);
      doc.text(`थाना / डाकघर: ${sampleMember.policeStation || 'रायपुर'} / ${sampleMember.postOffice || 'रायपुर'}  |  पिन कोड: ${sampleMember.pinCode || '311803'}`, margin + 35, coverY + 48);

      doc.addPage();
    }

    // Helper to draw clean vector scissors on tear-off line
    function drawVectorScissors(doc, cx, cy, size = 3.2) {
      doc.save();
      doc.lineWidth(0.7).strokeColor('#475569');
      doc.circle(cx, cy, 0.5).fillColor('#475569').fill();
      doc.moveTo(cx - size * 0.8, cy - size * 0.6).lineTo(cx + size * 1.2, cy + size * 0.6).stroke();
      doc.moveTo(cx - size * 0.8, cy + size * 0.6).lineTo(cx + size * 1.2, cy - size * 0.6).stroke();
      doc.circle(cx - size * 0.8 - 1.0, cy - size * 0.6 - 0.8, 1.3).stroke();
      doc.circle(cx - size * 0.8 - 1.0, cy + size * 0.6 + 0.8, 1.3).stroke();
      doc.restore();
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

        const isCompactCard = cardHeight < 170;
        const isDeletedVoter = Boolean(
          m.isDeleted === true ||
          m.deletionReason ||
          m.deletionSupplement ||
          (m.supplementType && /del|vilop|विलोपित|निरस्त/i.test(String(m.supplementType))) ||
          (params.isDeleted === 'true' || params.vilopan === 'true')
        );

        // 0. Double Tiranga Luxury Border (Outer Green + Inner Saffron)
        doc.roundedRect(x, y, cardWidth, cardHeight, 4.5).lineWidth(1.2).strokeColor('#0e8742').stroke();
        doc.roundedRect(x + 1.8, y + 1.8, cardWidth - 3.6, cardHeight - 3.6, 3.0).lineWidth(0.9).strokeColor('#f37021').stroke();



        // 1. TOP SECTION: Campaign Banner (Dynamically scaled & Auto-Balanced)
        const gpName = m.gramPanchayat || params.gramPanchayat || sampleMember.gramPanchayat || '';
        const postName = params.candidatePost || '';
        let candName = (params.candidateName || '').trim();
        const candTagline = (params.candidateTagline || params.tagline || '').trim();
        const candPhone = (params.candidatePhone || '').trim();
        const candSlogan = (params.candidateSlogan || '').trim();

        const hasCampaignDetails = Boolean(
          candName ||
          candidatePhotoImageObj ||
          leaderPhotoImageObj ||
          effectiveSymbolImageObj ||
          postName ||
          candSlogan ||
          bannerImageObj ||
          params.campaignSlip === 'true' ||
          params.layout === 'campaign' ||
          params.densityPreset === 'campaign_8'
        );

        let bannerLineCount = 0;
        if (gpName && postName) bannerLineCount += 2;
        else if (gpName || postName) bannerLineCount += 1;
        if (candName || hasCampaignDetails) bannerLineCount += 1;
        if (candTagline) bannerLineCount += 1;
        if (candSlogan) bannerLineCount += 1;
        if (candPhone) bannerLineCount += 1;

        // Intelligent Auto-Balance Banner Height:
        // Allocates 40% of card height when 5-6 lines are present, leaving 60% for voter details (zero overlap!).
        const bannerFraction = bannerLineCount >= 5 ? 0.40 : (bannerLineCount >= 4 ? 0.36 : 0.33);
        const bannerH = Math.max(50, Math.min(76, Math.round(cardHeight * bannerFraction)));
        const scaleX = (cardWidth - 4) / 1024;
        const scaleY = (bannerH - 2) / 280;

        const leftCX = x + 2 + 105 * scaleX;
        const rightCX = x + 2 + 919 * scaleX;
        const photoCY = y + 2 + 140 * scaleY;
        const photoR = 101 * scaleY;

        if (bannerImageObj) {
          try {
            doc.roundedRect(x + 2, y + 2, cardWidth - 4, bannerH - 2, 2).fillColor('#ffffff').fill();
            doc.image(bannerImageObj, x + 2, y + 2, { fit: [cardWidth - 4, bannerH - 2], align: 'center', valign: 'center' });
          } catch (_) {
            drawDefaultBanner();
          }
        } else {
          drawDefaultBanner();
        }

        function drawDefaultBanner() {
          if (hasCampaignDetails) {
            if (!candName) {
              candName = postName ? '' : 'कर्मठ प्रत्याशी';
            }

            // Draw Clean Tiranga Wave Banner Header Background
            if (bannerTemplateCleanImageObj) {
              try {
                doc.save();
                doc.roundedRect(x + 2, y + 2, cardWidth - 4, bannerH - 2, 2.0).clip();
                doc.image(bannerTemplateCleanImageObj, x + 2, y + 2, {
                  width: cardWidth - 4,
                  height: bannerH - 2,
                });
                doc.restore();
              } catch (_) {
                doc.roundedRect(x + 2, y + 2, cardWidth - 4, bannerH - 2, 2).fillColor(theme.bannerBg).fill();
              }
            } else {
              doc.roundedRect(x + 2, y + 2, cardWidth - 4, bannerH - 2, 2).fillColor(theme.bannerBg).fill();
            }

            // Candidate Photo in Left Circular Golden Frame
            if (candidatePhotoImageObj) {
              try {
                doc.save();
                doc.circle(leftCX, photoCY, photoR).clip();
                doc.image(candidatePhotoImageObj, leftCX - photoR, photoCY - photoR, {
                  width: photoR * 2,
                  height: photoR * 2,
                  fit: [photoR * 2, photoR * 2],
                  align: 'center',
                  valign: 'center',
                });
                doc.restore();
              } catch (_) {}
            }
            doc.circle(leftCX, photoCY, photoR).lineWidth(1.2).strokeColor('#d4af37').stroke();

            // Right Side: Leader Photo in Golden Ring
            if (leaderPhotoImageObj) {
              try {
                doc.save();
                doc.circle(rightCX, photoCY, photoR).clip();
                doc.image(leaderPhotoImageObj, rightCX - photoR, photoCY - photoR, {
                  width: photoR * 2,
                  height: photoR * 2,
                  fit: [photoR * 2, photoR * 2],
                  align: 'center',
                  valign: 'center',
                });
                doc.restore();
              } catch (_) {}
            }
            doc.circle(rightCX, photoCY, photoR).lineWidth(1.2).strokeColor('#d4af37').stroke();

            // Custom Party Symbol (if user passed specific custom symbol, overlay it cleanly inside top circle)
            if (symbolImageObj) {
              const centerCX = x + cardWidth / 2;
              const centerCY = y + 2 + 38 * scaleY;
              const centerR = 31 * scaleY;
              try {
                doc.save();
                doc.circle(centerCX, centerCY, centerR).fillColor('#ffffff').fill();
                doc.circle(centerCX, centerCY, centerR).clip();
                doc.image(symbolImageObj, centerCX - centerR, centerCY - centerR, {
                  width: centerR * 2,
                  height: centerR * 2,
                  fit: [centerR * 2, centerR * 2],
                  align: 'center',
                  valign: 'center',
                });
                doc.restore();
                doc.circle(centerCX, centerCY, centerR).lineWidth(0.8).strokeColor('#16a34a').stroke();
              } catch (_) {}
            }

            // Center Text Typography with intelligent Auto-Balancing
            const textLeft = leftCX + photoR + 4;
            const textRight = rightCX - photoR - 4;
            const textWidth = Math.max(70, textRight - textLeft);

            // Separate Appeal (Line 4) and Slogan (Line 5 directly above mobile)
            const isAppealStr = (str) => /मत|विजयी|बनावें|बनाएं|अमूल्य|बहुमूल्य|समर्थन/i.test(str || '');
            let appealText = '';
            let sloganText = '';

            const rawTagline = (params.candidateTagline || params.tagline || '').trim();
            const rawSlogan = (params.candidateSlogan || '').trim();

            if (rawTagline && rawSlogan) {
              if (isAppealStr(rawSlogan) && !isAppealStr(rawTagline)) {
                appealText = rawSlogan;
                sloganText = rawTagline;
              } else if (isAppealStr(rawTagline) && !isAppealStr(rawSlogan)) {
                appealText = rawTagline;
                sloganText = rawSlogan;
              } else {
                appealText = rawSlogan;
                sloganText = rawTagline;
              }
            } else if (rawTagline && !rawSlogan) {
              if (isAppealStr(rawTagline)) {
                appealText = rawTagline;
              } else {
                sloganText = rawTagline;
                appealText = 'को अपना बहुमूल्य मत देकर भारी मतों से विजयी बनाएं।';
              }
            } else if (rawSlogan && !rawTagline) {
              if (isAppealStr(rawSlogan)) {
                appealText = rawSlogan;
              } else {
                sloganText = rawSlogan;
                appealText = 'को अपना बहुमूल्य मत देकर भारी मतों से विजयी बनाएं।';
              }
            } else if (hasCampaignDetails) {
              appealText = 'को अपना बहुमूल्य मत देकर भारी मतों से विजयी बनाएं।';
            }

            if (sloganText) {
              if (!sloganText.startsWith('"') && !sloganText.startsWith('“') && !sloganText.startsWith('\'')) {
                sloganText = `"${sloganText}"`;
              }
            }

            const h1Size = isCompactCard ? 5.8 : 7.0;
            const h2Size = isCompactCard ? 5.4 : 6.5;
            const nameSize = isCompactCard ? 9.5 : 11.5;
            const appealSize = isCompactCard ? 4.8 : 5.8;
            const slogSize = isCompactCard ? 4.8 : 5.8;
            const phoneSize = isCompactCard ? 5.2 : 6.4;

            const h1H = h1Size * 1.15;
            const h2H = h2Size * 1.15;
            const nameBoxH = isCompactCard ? 12.5 : 14.5;
            const appealH = appealSize * 1.15;
            const slogH = slogSize * 1.15;
            const phoneH = phoneSize * 1.15;

            // Start text safely below top center circular emblem
            const emblemBottomY = y + 2 + 71 * scaleY;
            const startTextY = Math.max(y + (isCompactCard ? 17.5 : 19.5), emblemBottomY + (isCompactCard ? 2.0 : 3.0));

            let totalContentH = 0;
            if (gpName) totalContentH += h1H;
            if (postName) totalContentH += h2H;
            if (candName) totalContentH += nameBoxH;
            if (appealText) totalContentH += appealH;
            if (sloganText) totalContentH += slogH;
            if (candPhone) totalContentH += phoneH;

            const availBannerH = Math.max(10, bannerH - (startTextY - y) - 2.0);
            const autoFitScale = totalContentH > availBannerH ? (availBannerH / totalContentH) : 1.0;
            const activeLineCount = [gpName, postName, candName, appealText, sloganText, candPhone].filter(Boolean).length;
            const extraGap = Math.max(0.2, Math.min(2.5, (availBannerH - totalContentH * autoFitScale) / Math.max(1, activeLineCount - 1)));

            let curY = startTextY;
            const mainTextColor = '#091431';

            // Line 1: Gram Panchayat
            if (gpName) {
              const line1 = `ग्राम पंचायत ${gpName}`;
              let s1 = h1Size * textScale * autoFitScale;
              doc.font('HindiBold').fontSize(s1);
              while (s1 > 4.2 && doc.widthOfString(line1) > textWidth) { s1 -= 0.3; doc.fontSize(s1); }
              doc.fillColor(mainTextColor).text(line1, textLeft, curY, { width: textWidth, align: 'center', lineBreak: false });
              curY += (h1H * autoFitScale) + extraGap;
            }

            // Line 2: Post Name
            if (postName) {
              const line2 = `${postName}`;
              let s2 = h2Size * textScale * autoFitScale;
              doc.font('HindiBold').fontSize(s2);
              while (s2 > 4.2 && doc.widthOfString(line2) > textWidth) { s2 -= 0.3; doc.fontSize(s2); }
              doc.fillColor(mainTextColor).text(line2, textLeft, curY, { width: textWidth, align: 'center', lineBreak: false });
              curY += (h2H * autoFitScale) + extraGap;
            }

            // Line 3: Candidate Name inside Trapezoid Ribbon Box
            if (candName) {
              const slant = isCompactCard ? 5.5 : 7.0;
              const boxW = Math.min(textWidth, 126);
              const boxX = textLeft + (textWidth - boxW) / 2;
              const actualBoxH = nameBoxH * autoFitScale;

              doc.save();
              doc.polygon(
                [boxX + slant, curY],
                [boxX + boxW - slant, curY],
                [boxX + boxW, curY + actualBoxH],
                [boxX, curY + actualBoxH]
              ).fillColor('#091f42').fill();
              doc.restore();

              let sN = nameSize * textScale * autoFitScale;
              doc.font('HindiBold').fontSize(sN);
              while (sN > 6.5 && doc.widthOfString(candName) > (boxW - slant * 2 - 4)) { sN -= 0.4; doc.fontSize(sN); }
              doc.fillColor('#ffffff').text(candName, boxX, curY + (actualBoxH - sN) / 2 - 0.5, { width: boxW, align: 'center', lineBreak: false });
              curY += actualBoxH + extraGap + 0.3;
            }

            // Line 4: Appeal ("को अपना बहुमूल्य मत देकर भारी मतों से विजयी बनाएं")
            if (appealText) {
              let sA = appealSize * textScale * autoFitScale;
              doc.font('HindiBold').fontSize(sA);
              while (sA > 3.8 && doc.widthOfString(appealText) > textWidth) { sA -= 0.3; doc.fontSize(sA); }
              doc.fillColor(mainTextColor).text(appealText, textLeft, curY, { width: textWidth, align: 'center', lineBreak: false });
              curY += (appealH * autoFitScale) + extraGap;
            }

            // Line 5: Slogan ("मु आपको आप मारा वोट दिजो हाथ पे सारा" - Directly Above Mobile Number)
            if (sloganText) {
              let sS = slogSize * textScale * autoFitScale;
              doc.font('HindiBold').fontSize(sS);
              while (sS > 3.8 && doc.widthOfString(sloganText) > textWidth) { sS -= 0.3; doc.fontSize(sS); }
              doc.fillColor(mainTextColor).text(sloganText, textLeft, curY, { width: textWidth, align: 'center', lineBreak: false });
              curY += (slogH * autoFitScale) + extraGap;
            }

            // Line 6: Phone Number flanked by tricolor accent lines
            if (candPhone) {
              const phoneText = `मो. ${candPhone}`;
              let sP = phoneSize * textScale * autoFitScale;
              doc.font('HindiBold').fontSize(sP);
              while (sP > 4.2 && doc.widthOfString(phoneText) > textWidth) { sP -= 0.3; doc.fontSize(sP); }
              const phoneW = doc.widthOfString(phoneText);
              const safePhoneY = Math.min(curY, y + bannerH - phoneH * autoFitScale - 1.5);
              const phoneX = textLeft + (textWidth - phoneW) / 2;

              const stripeW = 20;
              const leftStripeX = phoneX - stripeW - 5;
              const rightStripeX = phoneX + phoneW + 5;
              const stripeY = safePhoneY + (phoneH * autoFitScale) * 0.45;

              if (stripeW > 10) {
                doc.moveTo(leftStripeX, stripeY - 1.2).lineTo(leftStripeX + stripeW, stripeY - 1.2).lineWidth(0.8).strokeColor('#f37021').stroke();
                doc.moveTo(rightStripeX, stripeY - 1.2).lineTo(rightStripeX + stripeW, stripeY - 1.2).lineWidth(0.8).strokeColor('#f37021').stroke();
                doc.moveTo(leftStripeX, stripeY + 1.2).lineTo(leftStripeX + stripeW, stripeY + 1.2).lineWidth(0.8).strokeColor('#0e8742').stroke();
                doc.moveTo(rightStripeX, stripeY + 1.2).lineTo(rightStripeX + stripeW, stripeY + 1.2).lineWidth(0.8).strokeColor('#0e8742').stroke();
              }

              doc.fillColor(mainTextColor).text(phoneText, textLeft, safePhoneY, { width: textWidth, align: 'center', lineBreak: false });
            }
          } else {
            // Elegant Official Voter Information Header (Fallback when no campaign details)
            doc.roundedRect(x + 2, y + 2, cardWidth - 4, bannerH - 2, 2).fillColor('#f8fafc').fill();
            doc.rect(x + 2, y + 2, cardWidth - 4, 3.0).fillColor('#1e40af').fill();

            const wardNum = m.wardNumber || (Array.isArray(m.municipalWardNumbers) && m.municipalWardNumbers[0]) || params.wardNumber || '';
            const asmNum = m.assemblyNumber || sampleMember.assemblyNumber || '';
            const partNo = m.partNumber || sampleMember.partNumber || '';

            const h1 = isCompactCard ? 7.5 : 8.5;
            const h2 = isCompactCard ? 10.5 : 12.5;
            const h3 = isCompactCard ? 7.0 : 8.0;

            doc.font('HindiBold').fontSize(h1).fillColor('#1e40af').text('राजस्थान राज्य निर्वाचन आयोग | मतदाता सूचना पर्ची', x + 4, y + (isCompactCard ? 4 : 6), { width: cardWidth - 8, align: 'center' });
            const titlePanchayat = gpName ? (wardNum ? `ग्राम पंचायत : ${gpName} (वार्ड संख्या : ${wardNum})` : `ग्राम पंचायत : ${gpName}`) : 'मतदाता सूचना पर्ची 2026';
            doc.font('HindiBold').fontSize(h2).fillColor('#0f172a').text(titlePanchayat, x + 4, y + (isCompactCard ? 15 : 20), { width: cardWidth - 8, align: 'center' });
            const subTitle = asmNum ? `विधानसभा क्षेत्र सं. ${asmNum}  |  भाग संख्या : ${partNo || '-'}` : 'मतदाता पर्ची - निःशुल्क वितरण';
            doc.font('Hindi').fontSize(h3).fillColor('#475569').text(subTitle, x + 4, y + (isCompactCard ? 32 : 42), { width: cardWidth - 8, align: 'center' });
          }
        }

        // 2. TEAR-OFF SCISSOR LINE (Clean integration with vector scissors)
        const dividerY = y + bannerH + 1.2;
        doc.save();
        doc.dash(2.5, { space: 2.0 }).moveTo(x + 4, dividerY).lineTo(x + cardWidth - 4, dividerY).lineWidth(0.5).strokeColor('#64748b').stroke();
        doc.restore();

        const tearOffText = 'मतदान तिथि से पूर्व बांटी गयी पर्ची, ऊपर का हिस्सा फाड़ दें';
        const tearSize = isCompactCard ? 4.8 : 5.4;
        doc.font('HindiBold').fontSize(tearSize);
        const textW = doc.widthOfString(tearOffText);
        const scissorIconW = 12;
        const totalPillW = textW + scissorIconW + 10;
        const pillX = x + (cardWidth - totalPillW) / 2;

        // White backdrop clears dashes under the scissor & text
        doc.rect(pillX, dividerY - 3.2, totalPillW, 6.4).fillColor('#ffffff').fill();
        drawVectorScissors(doc, pillX + 5, dividerY, isCompactCard ? 2.6 : 3.0);
        doc.fillColor('#475569').text(tearOffText, pillX + scissorIconW + 2, dividerY - (isCompactCard ? 2.6 : 3.0), { width: textW + 4, align: 'left', lineBreak: false });

        // 3. VOTER DATA AREA (Dynamically fills available height with zero bottom dead space)
        const footerH = Math.max(12, Math.min(16, Math.round(cardHeight * 0.08)));
        const footerY = y + cardHeight - footerH;
        const contentY = dividerY + (isCompactCard ? 4.0 : 5.5);

        const col1W = 138;
        const col2W = isCompactCard ? 46 : 52;
        const col3W = cardWidth - col1W - col2W - 10;
        const col1X = x + 4;
        const col2X = col1X + col1W + 2;
        const col3X = col2X + col2W + 2;

        const pillH = isCompactCard ? 13 : 15;

        // Row 0: Serial Pill & EPIC Pill
        const serialNum = isWardPrint
          ? (m.wardVoterSerial ? String(m.wardVoterSerial) : (m.voterSerial ? String(m.voterSerial) : String(i + 1)))
          : (m.voterSerial ? String(m.voterSerial) : (m.wardVoterSerial ? String(m.wardVoterSerial) : String(i + 1)));

        doc.roundedRect(col1X, contentY, 30, pillH, 2.5).lineWidth(0.8).strokeColor(theme.serialBorder).fillColor(theme.serialBg).fillAndStroke();
        doc.font('HindiBold').fontSize(Math.max(7.5, (isCompactCard ? 9.5 : 11.0) * textScale)).fillColor(theme.serialText).text(serialNum, col1X, contentY + (isCompactCard ? 1.5 : 2.0), { width: 30, align: 'center' });

        // EPIC Box with dedicated "EPIC" badge and number
        const rawEpic = String(m.voterId || m.epic || '').trim();
        const displayEpic = (rawEpic.startsWith('WARD_') || !rawEpic)
          ? (m.assemblyVoterId && !m.assemblyVoterId.startsWith('WARD_') ? m.assemblyVoterId : (m.epic || '-'))
          : rawEpic;

        const epicW = col1W - 34;
        const epicBadgeW = isCompactCard ? 24 : 28;
        const epicNumW = epicW - epicBadgeW;
        const epicBoxX = col1X + 34;

        doc.roundedRect(epicBoxX, contentY, epicBadgeW, pillH, 2).fillColor('#15803d').fill();
        doc.font('HindiBold').fontSize(isCompactCard ? 6.8 : 7.5).fillColor('#ffffff').text('EPIC', epicBoxX, contentY + (isCompactCard ? 2.5 : 3.0), { width: epicBadgeW, align: 'center', lineBreak: false });

        doc.roundedRect(epicBoxX + epicBadgeW, contentY, epicNumW, pillH, 2).lineWidth(0.8).strokeColor('#334155').fillColor('#f8fafc').fillAndStroke();
        let epicFontSize = Math.max(6.5, (isCompactCard ? 8.0 : 9.0) * textScale);
        doc.font('HindiBold').fontSize(epicFontSize);
        while (epicFontSize > 5.5 && doc.widthOfString(displayEpic) > (epicNumW - 4)) {
          epicFontSize -= 0.3;
          doc.fontSize(epicFontSize);
        }
        doc.fillColor('#0f172a').text(displayEpic, epicBoxX + epicBadgeW, contentY + (pillH - epicFontSize) / 2, { width: epicNumW, align: 'center', lineBreak: false });

        // Selected Fields Check
        const hasExplicitFields = Boolean(params.fields);
        const showGuardian = !hasExplicitFields || selected.includes('guardianName') || selected.includes('relativeName');
        const showHouse = !hasExplicitFields || selected.includes('houseNumber');
        const showAgeGender = !hasExplicitFields || selected.includes('age') || selected.includes('gender');
        const showMobile = selected.includes('mobile') || params.withMobileOnly === 'true';
        const showCaste = selected.includes('caste');
        const showVillage = selected.includes('village');

        let lineCount = 1; // name always
        if (showGuardian) lineCount++;
        if (showHouse) lineCount++;
        if (showAgeGender) lineCount++;
        const mobNum = m.mobile || m.phone || m.mobileNumber || '';
        if ((mobNum && (showMobile || params.withMobileOnly === 'true')) || (showCaste && m.caste) || (showVillage && m.village && m.village !== 'गाँव उपलब्ध नहीं')) {
          lineCount++;
        }

        const voterStartY = contentY + pillH + (isCompactCard ? 2.5 : 3.5);
        const availVoterH = footerY - 2.0 - voterStartY;
        const lineGap = availVoterH / Math.max(4, lineCount);
        let voterLineY = voterStartY;

        const lblSize = Math.max(5.5, Math.min(9.2, lineGap * 0.58 * textScale));
        const valSize = Math.max(6.0, Math.min(10.5, lineGap * 0.68 * textScale));

        // Line 1: Voter Name
        const name = ((m.name || '') + ' ' + (m.surname || '')).trim() || '-';
        const availNameW = col1W - 28;
        let vNameSize = valSize;
        doc.font('HindiBold').fontSize(vNameSize);
        while (vNameSize > 6.5 && doc.widthOfString(name) > availNameW) {
          vNameSize -= 0.4;
          doc.fontSize(vNameSize);
        }
        doc.font('HindiBold').fontSize(lblSize).fillColor('#1e293b').text('नाम : ', col1X, voterLineY, { continued: true });
        doc.font('HindiBold').fontSize(vNameSize).fillColor('#000000').text(name, { lineBreak: false });
        voterLineY += lineGap;

        // Line 2: Guardian
        if (showGuardian) {
          const guardian = m.guardianName || m.relativeName || '-';
          const relationLabel = m.gender === 'female' && m.relativeName ? 'पति का नाम' : 'पिता का नाम';
          const availGuardW = col1W - 44;
          let vGuardSize = valSize;
          doc.font('HindiBold').fontSize(vGuardSize);
          while (vGuardSize > 6.2 && doc.widthOfString(guardian) > availGuardW) {
            vGuardSize -= 0.4;
            doc.fontSize(vGuardSize);
          }
          doc.font('HindiBold').fontSize(lblSize).fillColor('#1e293b').text(`${relationLabel} : `, col1X, voterLineY, { continued: true });
          doc.font('HindiBold').fontSize(vGuardSize).fillColor('#000000').text(guardian, { lineBreak: false });
          voterLineY += lineGap;
        }

        // Line 3: House
        if (showHouse) {
          const house = m.houseNumber || '-';
          doc.font('HindiBold').fontSize(lblSize).fillColor('#1e293b').text('मकान संख्या : ', col1X, voterLineY, { continued: true });
          doc.font('HindiBold').fontSize(valSize).fillColor('#000000').text(house, { lineBreak: false });
          voterLineY += lineGap;
        }

        // Line 4: Age & Gender
        if (showAgeGender) {
          const gender = labels.gender[m.gender] ? (m.gender === 'male' ? 'पुरुष' : (m.gender === 'female' ? 'महिला' : labels.gender[m.gender])) : (m.gender || '-');
          const age = m.age ? String(m.age) : '-';
          doc.font('HindiBold').fontSize(lblSize).fillColor('#1e293b').text('आयु : ', col1X, voterLineY, { continued: true });
          doc.font('HindiBold').fontSize(valSize).fillColor('#000000').text(`${age}      `, { continued: true });
          doc.font('HindiBold').fontSize(lblSize).fillColor('#1e293b').text('लिंग : ', { continued: true });
          doc.font('HindiBold').fontSize(valSize).fillColor('#000000').text(gender, { lineBreak: false });
          voterLineY += lineGap;
        }

        // Line 5: Mobile / Caste / Village
        if (mobNum && (showMobile || params.withMobileOnly === 'true')) {
          doc.font('HindiBold').fontSize(lblSize).fillColor('#15803d').text(`📱 ${mobNum}`, col1X, voterLineY, { lineBreak: false });
          voterLineY += lineGap;
        } else if (showCaste && m.caste) {
          doc.font('HindiBold').fontSize(lblSize).fillColor('#4338ca').text(`जाति : ${m.caste}`, col1X, voterLineY, { lineBreak: false });
          voterLineY += lineGap;
        } else if (showVillage && m.village && m.village !== 'गाँव उपलब्ध नहीं') {
          doc.font('HindiBold').fontSize(lblSize).fillColor('#1e293b').text('गाँव : ', col1X, voterLineY, { continued: true });
          doc.font('HindiBold').fontSize(valSize).fillColor('#000000').text(m.village, { lineBreak: false });
          voterLineY += lineGap;
        }

        // Col 2: Voter Photo Box
        const photoBoxH = footerY - contentY - 3;
        doc.roundedRect(col2X, contentY, col2W, photoBoxH, 2.5).lineWidth(0.7).strokeColor('#64748b').stroke();
        if (includePhoto) {
          const voterImg = getPhotoSource(m);
          if (voterImg) {
            try {
              doc.image(voterImg, col2X + 1, contentY + 1, { fit: [col2W - 2, photoBoxH - 2], align: 'center', valign: 'center' });
            } catch (_) {
              doc.font('HindiBold').fontSize(isCompactCard ? 6.0 : 7.0).fillColor('#94a3b8').text('वोटर\nफोटो', col2X, contentY + photoBoxH / 2 - 8, { width: col2W, align: 'center' });
            }
          } else {
            doc.font('HindiBold').fontSize(isCompactCard ? 6.0 : 7.0).fillColor('#94a3b8').text('वोटर\nफोटो', col2X, contentY + photoBoxH / 2 - 8, { width: col2W, align: 'center' });
          }
        }

        // IF DELETED VOTER: Draw Rotated Red Rubber Stamp on Photo Box!
        if (isDeletedVoter) {
          doc.save();
          const stampW = col2W * 0.92;
          const stampH = isCompactCard ? 19.0 : 21.0;
          const stampCX = col2X + col2W / 2;
          const stampCY = contentY + photoBoxH * 0.68;

          // Rotate around center
          doc.translate(stampCX, stampCY);
          doc.rotate(-18);

          // Translucent white stamp backdrop
          doc.roundedRect(-stampW / 2, -stampH / 2, stampW, stampH, 2.5).fillColor('#ffffff', 0.92).fill();

          // Outer thick red border
          doc.roundedRect(-stampW / 2, -stampH / 2, stampW, stampH, 2.5).lineWidth(1.4).strokeColor('#dc2626').stroke();
          // Inner thin red border
          doc.roundedRect(-stampW / 2 + 1.8, -stampH / 2 + 1.8, stampW - 3.6, stampH - 3.6, 1.8).lineWidth(0.6).strokeColor('#dc2626').stroke();

          // Stamp text: विलोपित / (DELETED) - strictly no मृतक per user instruction
          doc.font('HindiBold').fontSize(isCompactCard ? 6.8 : 7.6).fillColor('#dc2626').text('विलोपित', -stampW / 2, -stampH / 2 + 2.0, { width: stampW, align: 'center', lineBreak: false });
          doc.font('HindiBold').fontSize(isCompactCard ? 4.8 : 5.4).fillColor('#dc2626').text('(DELETED)', -stampW / 2, -stampH / 2 + (isCompactCard ? 9.8 : 11.2), { width: stampW, align: 'center', lineBreak: false });

          doc.restore();
        }

        // Col 3: Booth, Ward & Polling Station Box (Proportional distribution)
        const wardBoxH = footerY - contentY - 2.5;
        doc.roundedRect(col3X, contentY, col3W, wardBoxH, 3.5).fillColor(theme.wardBoxBg).fill();
        if (theme.wardBoxBorder) {
          doc.roundedRect(col3X, contentY, col3W, wardBoxH, 3.5).lineWidth(0.8).strokeColor(theme.wardBoxBorder).stroke();
        }

        // WARD HEADER
        doc.font('HindiBold').fontSize(Math.max(6.0, (isCompactCard ? 7.2 : 8.5) * textScale)).fillColor(theme.wardBoxText).text('वार्ड नंबर', col3X, contentY + wardBoxH * 0.05, { width: col3W, align: 'center', lineBreak: false });

        // WARD NUMBER (LARGE BOLD)
        const wardNum = m.wardNumber || (Array.isArray(m.municipalWardNumbers) && m.municipalWardNumbers[0]) || params.wardNumber || '-';
        doc.font('HindiBold').fontSize(Math.max(12.0, (isCompactCard ? 16.0 : 22.0) * textScale)).fillColor(theme.wardBoxText).text(String(wardNum), col3X, contentY + wardBoxH * 0.16, { width: col3W, align: 'center', lineBreak: false });

        // SEPARATOR LINE
        doc.moveTo(col3X + 5, contentY + wardBoxH * 0.44).lineTo(col3X + col3W - 5, contentY + wardBoxH * 0.44).lineWidth(0.8).strokeColor(theme.wardDivider).stroke();

        // POLLING STATION LABEL
        doc.font('HindiBold').fontSize(Math.max(5.2, (isCompactCard ? 6.2 : 7.5) * textScale)).fillColor(theme.wardDivider).text('मतदान केंद्र', col3X, contentY + wardBoxH * 0.48, { width: col3W, align: 'center', lineBreak: false });

        // Polling Station Building Name
        let boothDesc = '';
        const currentWardNum = String(wardNum).replace(/\D/g, '').trim();
        if (params[`pollingStation_ward_${currentWardNum}`]) {
          boothDesc = params[`pollingStation_ward_${currentWardNum}`].trim();
        } else if (params.wardPollingStations) {
          try {
            const wardMap = typeof params.wardPollingStations === 'string' ? JSON.parse(params.wardPollingStations) : params.wardPollingStations;
            if (wardMap && (wardMap[currentWardNum] || wardMap[String(wardNum)])) {
              boothDesc = String(wardMap[currentWardNum] || wardMap[String(wardNum)]).trim();
            }
          } catch (_) {}
        }
        if (!boothDesc && params.pollingStation && params.pollingStation.trim()) {
          boothDesc = params.pollingStation.trim();
        }
        if (!boothDesc) {
          if (isWardPrint) {
            const gpName = m.gramPanchayat || params.gramPanchayat || sampleMember.gramPanchayat || '';
            const vilName = (m.village && m.village !== gpName) ? m.village : '';
            if (vilName && vilName !== 'गाँव उपलब्ध नहीं') {
              boothDesc = `राजकीय विद्यालय,\n${vilName}`;
            } else if (gpName) {
              boothDesc = `रा.उ.मा.वि.,\n${gpName}`;
            } else {
              boothDesc = 'ग्राम पंचायत भवन';
            }
          } else {
            const cleanPartName = (m.partName || '').replace(/^भाग\s*सं(?:ख्या)?\.?\s*\d+\s*[-:]?\s*/i, '').trim();
            boothDesc = cleanPartName || (m.gramPanchayat ? `राजकीय विद्यालय,\n${m.gramPanchayat}` : 'मतदान केंद्र');
          }
        }

        let bSize = Math.max(4.8, (isCompactCard ? 6.5 : 7.8) * textScale);
        doc.font('HindiBold').fontSize(bSize);
        const maxBoothH = wardBoxH * 0.35;
        while (bSize > 4.2 && doc.heightOfString(boothDesc, { width: col3W - 2 }) > maxBoothH) {
          bSize -= 0.3;
          doc.fontSize(bSize);
        }
        doc.fillColor(theme.wardBoxText).text(boothDesc, col3X + 1, contentY + wardBoxH * 0.62, { width: col3W - 2, align: 'center', height: maxBoothH });

        // 4. BOTTOM FOOTER STRIP
        if (isDeletedVoter) {
          // DELETED VOTER FOOTER (Dark bar with red pill badge [✕ विलोपित] and deletion notice)
          doc.rect(x + 1.8, footerY, cardWidth - 3.6, footerH).fillColor('#091b36').fill();

          const badgeW = isCompactCard ? 44 : 48;
          const badgeH = footerH - 3.2;
          const badgeX = x + 4;
          const badgeY = footerY + 1.6;

          // Red Pill Badge
          doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 2.5).fillColor('#dc2626').fill();

          // Draw crisp vector white 'X' in circle
          const iconR = badgeH * 0.32;
          const iconCX = badgeX + 7;
          const iconCY = badgeY + badgeH / 2;
          doc.circle(iconCX, iconCY, iconR).fillColor('#ffffff').fill();
          doc.save();
          doc.lineWidth(1.2).strokeColor('#dc2626');
          const d = iconR * 0.55;
          doc.moveTo(iconCX - d, iconCY - d).lineTo(iconCX + d, iconCY + d).stroke();
          doc.moveTo(iconCX - d, iconCY + d).lineTo(iconCX + d, iconCY - d).stroke();
          doc.restore();

          doc.font('HindiBold').fontSize(isCompactCard ? 5.8 : 6.8).fillColor('#ffffff').text('विलोपित', badgeX + 13, badgeY + (isCompactCard ? 1.6 : 2.2), { width: badgeW - 14, align: 'center', lineBreak: false });

          // White divider
          doc.moveTo(badgeX + badgeW + 4, footerY + 2.5).lineTo(badgeX + badgeW + 4, footerY + footerH - 2.5).lineWidth(0.7).strokeColor('#94a3b8').stroke();

          // Deletion notice in Hindi
          const noticeText = 'मतदाता का नाम अब सूची से विलोपित (Deleted) कर दिया गया है';
          doc.font('HindiBold').fontSize(isCompactCard ? 5.4 : 6.2).fillColor('#ffffff').text(noticeText, badgeX + badgeW + 8, footerY + (isCompactCard ? 2.4 : 3.0), { width: cardWidth - badgeW - 26, align: 'left', lineBreak: false });

          // Serial index
          doc.font('Hindi').fontSize(isCompactCard ? 6.5 : 7.5).fillColor('#ffffff').text(String(i + 1), x, footerY + (isCompactCard ? 2.4 : 3.0), { width: cardWidth - 6, align: 'right' });
        } else {
          // Standard Polling Hours Footer
          doc.rect(x + 1.8, footerY, cardWidth - 3.6, footerH).fillColor(theme.footerBg).fill();
          if (theme.footerBorder) {
            doc.moveTo(x + 1.8, footerY).lineTo(x + cardWidth - 1.8, footerY).lineWidth(0.8).strokeColor(theme.footerBorder).stroke();
          }
          const votingTime = params.pollingTime || 'मतदान समय : प्रातः 7:00 से सायं 6:00 बजे तक';
          doc.font('HindiBold').fontSize(Math.max(6.2, (isCompactCard ? 7.0 : 8.2) * textScale)).fillColor(theme.footerText).text(votingTime, x, footerY + (isCompactCard ? 2.2 : 2.8), { width: cardWidth, align: 'center' });
          doc.font('Hindi').fontSize(Math.max(5.5, (isCompactCard ? 6.5 : 7.5) * textScale)).fillColor(theme.footerText).text(String(i + 1), x, footerY + (isCompactCard ? 2.4 : 3.0), { width: cardWidth - 6, align: 'right' });
        }
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
          const availPhotoH = cardHeight - headerH - 6;
          if (columns <= 2) {
            photoW = Math.min(58, Math.max(44, Math.round(cardWidth * 0.22)));
            const photoH = Math.min(availPhotoH, Math.round(photoW * 1.28));
            const photoX = x + cardWidth - photoW - 5;
            const photoY = y + headerH + Math.max(2, Math.round((cardHeight - headerH - photoH) / 2));

            const img = getPhotoSource(m);
            doc.roundedRect(photoX, photoY, photoW, photoH, 2).lineWidth(0.6).strokeColor('#64748b').stroke();
            if (img) {
              try {
                doc.image(img, photoX, photoY, { fit: [photoW, photoH], align: 'center', valign: 'center' });
              } catch (_) {
                doc.font('HindiBold').fontSize(6.5).fillColor('#94a3b8').text('फोटो', photoX, photoY + (photoH / 2) - 4, { width: photoW, align: 'center' });
              }
            } else {
              doc.font('HindiBold').fontSize(6.5).fillColor('#94a3b8').text('फोटो', photoX, photoY + (photoH / 2) - 4, { width: photoW, align: 'center' });
            }
          } else {
            photoW = Math.min(38, Math.max(28, Math.round(cardWidth * 0.22)));
            const photoH = Math.min(availPhotoH, Math.round(photoW * 1.28));
            const photoX = x + cardWidth - photoW - 4;
            const photoY = y + headerH + Math.max(2, Math.round((cardHeight - headerH - photoH) / 2));

            const img = getPhotoSource(m);
            doc.roundedRect(photoX, photoY, photoW, photoH, 0.5).lineWidth(0.5).strokeColor('#94a3b8').stroke();
            if (img) {
              try {
                doc.image(img, photoX, photoY, { fit: [photoW, photoH], align: 'center', valign: 'center' });
              } catch (_) {
                doc.font('HindiBold').fontSize(5.5).fillColor('#94a3b8').text('फोटो', photoX, photoY + (photoH / 2) - 3, { width: photoW, align: 'center' });
              }
            } else {
              doc.font('HindiBold').fontSize(5.5).fillColor('#94a3b8').text('फोटो', photoX, photoY + (photoH / 2) - 3, { width: photoW, align: 'center' });
            }
          }
        }

        // Text lines with uniform bold typography filling the card
        const textX = x + (columns <= 2 ? 6 : 4);
        const textW = cardWidth - (includePhoto ? photoW + (columns <= 2 ? 12 : 8) : (columns <= 2 ? 10 : 6));
        let textY = y + headerH + (cardHeight >= 85 ? 4.5 : 3);

        const name = ((m.name || '') + ' ' + (m.surname || '')).trim() || '-';
        const guardian = m.guardianName || m.relativeName || '-';
        const house = m.houseNumber || '-';
        const gender = labels.gender[m.gender] ? (m.gender === 'male' ? 'पु.' : (m.gender === 'female' ? 'म.' : labels.gender[m.gender])) : (m.gender || '-');
        const age = m.age ? String(m.age) : '-';

        let extraLine = '';
        const castePart = m.caste ? (m.subCaste ? `${m.caste} (${m.subCaste})` : m.caste) : (m.subCaste || '');
        if (castePart) extraLine += 'जाति: ' + castePart;
        const wardStr = m.wardNumber ? `वार्ड ${m.wardNumber}` : '';
        const locParts = [m.village, wardStr].filter(Boolean);
        if (locParts.length) extraLine += (extraLine ? ' | ' : '') + locParts.join(' - ');

        if (columns <= 2) {
          // 2-Column Layout (e.g. 16 or 20 per page): Large, uniform bold, dark, perfectly filling the box
          const isTall = cardHeight >= 85;
          const nameSize = isTall ? 10.5 : 9.5;
          const line1Step = isTall ? 13.5 : 12.0;
          const detailSize = isTall ? 8.8 : 8.0;
          const lineStep = isTall ? 12.0 : 10.8;
          const subDetailSize = isTall ? 8.0 : 7.2;

          // Line 1: Name
          doc.font('HindiBold').fontSize(nameSize).fillColor('#000000').text(name, textX, textY, { width: textW, lineBreak: false });
          textY += line1Step;

          // Line 2: Guardian
          doc.font('HindiBold').fontSize(detailSize).fillColor('#0f172a').text('पिता/पति: ' + guardian, textX, textY, { width: textW, lineBreak: false });
          textY += lineStep;

          // Line 3: House
          doc.font('HindiBold').fontSize(detailSize).fillColor('#0f172a').text('मकान सं.: ' + house, textX, textY, { width: textW, lineBreak: false });
          textY += lineStep;

          // Line 4: Age, Gender, Mobile
          let ageLine = 'उम्र: ' + age + '  |  लिंग: ' + gender;
          if (m.mobile) ageLine += '  |  मो.: ' + m.mobile;
          doc.font('HindiBold').fontSize(detailSize).fillColor('#0f172a').text(ageLine, textX, textY, { width: textW, lineBreak: false });
          textY += lineStep;

          // Line 5: Caste, SubCaste & Ward/Village
          if (extraLine) {
            doc.font('HindiBold').fontSize(subDetailSize).fillColor('#1e293b').text(extraLine, textX, textY, { width: textW, lineBreak: false });
          }
        } else {
          // 3-Column Layout (e.g. 30 per page): Crisp, compact, uniform bold
          const nameSize = cardHeight >= 70 ? 8.5 : 7.6;
          const line1Step = cardHeight >= 70 ? 10.8 : 9.8;
          const detailSize = cardHeight >= 70 ? 7.6 : 6.8;
          const lineStep = cardHeight >= 70 ? 10.0 : 9.0;
          const subDetailSize = cardHeight >= 70 ? 6.8 : 6.0;

          // Line 1: Name
          doc.font('HindiBold').fontSize(nameSize).fillColor('#000000').text(name, textX, textY, { width: textW, lineBreak: false });
          textY += line1Step;

          // Line 2: Guardian
          doc.font('HindiBold').fontSize(detailSize).fillColor('#0f172a').text('पिता/पति: ' + guardian, textX, textY, { width: textW, lineBreak: false });
          textY += lineStep;

          // Line 3: House
          doc.font('HindiBold').fontSize(detailSize).fillColor('#0f172a').text('मकान सं.: ' + house, textX, textY, { width: textW, lineBreak: false });
          textY += lineStep;

          // Line 4: Age & Gender
          let ageLine = 'उम्र: ' + age + '  |  लिंग: ' + gender;
          if (m.mobile) ageLine += '  |  मो.: ' + m.mobile;
          doc.font('HindiBold').fontSize(detailSize).fillColor('#0f172a').text(ageLine, textX, textY, { width: textW, lineBreak: false });
          textY += lineStep;

          // Line 5: Caste, SubCaste & Ward/Village
          if (extraLine && cardHeight >= 66) {
            doc.font('HindiBold').fontSize(subDetailSize).fillColor('#1e293b').text(extraLine, textX, textY, { width: textW, lineBreak: false });
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

