const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const Member = require('../models/Member');
const Booth = require('../models/Booth');
const Ward = require('../models/Ward');
const MediaAsset = require('../models/MediaAsset');
const { applyMemberScope } = require('../utils/boothAccess');
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

  for (const key of [
    'village', 'gramPanchayat', 'tehsil', 'municipality', 'caste',
    'organizationPost', 'location', 'sectionName', 'assemblyName',
  ]) {
    if (req.query[key]) filter[key] = new RegExp(escapeRegex(req.query[key]), 'i');
  }
  const samitiParam = req.query.tehsil || req.query.samiti || req.query.simiti;
  if (samitiParam) {
    filter.tehsil = new RegExp(`^${escapeRegex(String(samitiParam).trim())}$`, 'i');
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
  if (req.query.missingMobile === 'true') {
    filter.$and = [...(filter.$and || []), { $or: [{ mobile: '' }, { mobile: null }, { mobile: { $exists: false } }] }];
  }
  if (req.query.missingHouse === 'true') {
    filter.$and = [...(filter.$and || []), { $or: [{ houseNumber: '' }, { houseNumber: null }, { houseNumber: { $exists: false } }] }];
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
      req.query.sortBy === 'wardVoterSerial'
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

    const getPhotoSource = await loadPhotoSources(members, req.query.photo !== 'false');

    const selected = [...new Set(String(req.query.fields || 'name,voterId,voterSerial,wardNumber,partNumber,guardianName,mobile,village,gramPanchayat')
      .split(',').map((key) => key.trim()).filter((key) => fields[key]))];
    const columns = Math.max(1, Math.min(3, Number(req.query.columns || 2)));
    const includePhoto = req.query.photo !== 'false';
    const paperSize = ['A4', 'A3', 'LETTER', 'LEGAL'].includes(String(req.query.paperSize).toUpperCase())
      ? String(req.query.paperSize).toUpperCase() : 'A4';
    const orientation = req.query.orientation === 'landscape' ? 'landscape' : 'portrait';
    const title = String(req.query.title || 'मतदाता सूची 2026').slice(0, 100);

    const doc = new PDFDocument({ size: paperSize, layout: orientation, margin: 28, bufferPages: true });
    doc.registerFont('Hindi', regularFont).registerFont('HindiBold', boldFont).font('Hindi');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="voter-list.pdf"');
    doc.pipe(res);

    const margin = 28;
    const gap = 10;
    const usableWidth = doc.page.width - margin * 2;
    const cardWidth = (usableWidth - gap * (columns - 1)) / columns;
    const photoWidth = includePhoto ? 58 : 0;
    const textWidth = cardWidth - 18 - photoWidth;
    const topY = 64;
    const bottomY = doc.page.height - 38;

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
      doc.font('HindiBold').fontSize(13).fillColor('#071b4b').text(title, margin, 24, { width: usableWidth - 150 });
      let subHeader = `विधानसभा: ${uniqueAssembly}`;
      if (uniqueGps) subHeader += ` | पं.: ${uniqueGps}`;
      if (uniqueWards.length === 1) subHeader += ` | वार्ड ${uniqueWards[0]}`;
      if (uniqueParts.length === 1) subHeader += ` | भाग #${uniqueParts[0]}`;
      doc.font('Hindi').fontSize(8).fillColor('#475569').text(subHeader, margin, 40, { width: usableWidth - 150 });

      doc.font('HindiBold').fontSize(8.5).fillColor('#1e40af').text(`कुल मतदाता: ${members.length}`, doc.page.width - margin - 140, 26, { width: 140, align: 'right' });
      doc.moveTo(margin, 54).lineTo(doc.page.width - margin, 54).strokeColor('#cbd5e1').stroke();
      doc.fillColor('#111827');
    };

    // 1. Draw Official Cover Page (Like Official Election Commission Voter List)
    if (req.query.includeCoverPage !== 'false') {
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

    // 2. Draw Voter Cards
    drawHeader();
    let y = topY;
    for (let index = 0; index < members.length; index += columns) {
      const rowMembers = members.slice(index, index + columns);
      const prepared = rowMembers.map((member) => {
        const rows = fieldRows(doc, member, selected, textWidth);
        const contentHeight = rows.reduce((sum, row) => sum + row.height, 0);
        return { member, rows, height: Math.max(includePhoto ? 84 : 48, contentHeight + 18) };
      });
      const rowHeight = Math.max(...prepared.map((item) => item.height));
      if (y + rowHeight > bottomY && y > topY) {
        doc.addPage();
        drawHeader();
        y = topY;
      }

      prepared.forEach((item, column) => {
        const x = margin + column * (cardWidth + gap);
        doc.roundedRect(x, y, cardWidth, rowHeight, 8).lineWidth(.8).strokeColor('#cbd5e1').stroke();
        doc.roundedRect(x, y, cardWidth, Math.min(22, rowHeight), 8).fillOpacity(0.05).fillAndStroke('#2563eb', '#cbd5e1').fillOpacity(1);
        let textX = x + 9;
        if (includePhoto) {
          const image = getPhotoSource(item.member);
          if (image) {
            try {
              doc.roundedRect(x + 9, y + 10, 48, 62, 3).strokeColor('#dbe4f2').stroke();
              doc.image(image, x + 9, y + 10, { fit: [48, 62], align: 'center', valign: 'center' });
            }
            catch (error) {
              doc.roundedRect(x + 9, y + 10, 48, 62, 3).strokeColor('#dbe4f2').stroke();
              doc.font('Hindi').fontSize(6).fillColor('#94a3b8').text('Photo', x + 9, y + 36, { width: 48, align: 'center' });
            }
          } else {
            doc.roundedRect(x + 9, y + 10, 48, 62, 3).strokeColor('#dbe4f2').stroke();
            doc.font('Hindi').fontSize(6).fillColor('#94a3b8').text('Photo', x + 9, y + 36, { width: 48, align: 'center' });
          }
          textX += photoWidth;
        }
        let lineY = y + 9;
        for (const row of item.rows) {
          const isName = row.key === 'name';
          doc.font(isName ? 'HindiBold' : 'Hindi')
            .fontSize(isName ? 10 : 8.5)
            .fillColor(isName ? '#071b4b' : '#1f2937')
            .text(row.text, textX, lineY, { width: textWidth, lineGap: 1 });
          lineY += row.height;
        }
      });
      y += rowHeight + gap;
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

