const fs = require('fs');
const PDFDocument = require('pdfkit');
const XLSX = require('xlsx');
const path = require('path');
const Member = require('../models/Member');
const Booth = require('../models/Booth');
const Ward = require('../models/Ward');
const Party = require('../models/Party');
const { resolveUploadPublicPath } = require('../utils/uploadPath');
const Activity = require('../models/Activity');
const Family = require('../models/Family');
const { applyMemberScope, assertBoothAccess } = require('../utils/boothAccess');

const regularFont = path.join(__dirname, '../assets/fonts/Nirmala.ttf');
const boldFont = path.join(__dirname, '../assets/fonts/Nirmala-Bold.ttf');

const preparePdf = (doc) => {
  doc.registerFont('Hindi', regularFont);
  doc.registerFont('HindiBold', boldFont);
  doc.font('Hindi');
};

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const hindiFlexibleRegex = (value) => {
  if (!value) return undefined;
  const clean = String(value).trim().normalize('NFC');
  const tokens = [];
  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    if (/[ँं़]/.test(char)) continue;
    if (/[डड़ड़]/.test(char)) {
      tokens.push('[डड़ड़]ा?[ँं़]?');
    } else if (/[ढढ़ढ़]/.test(char)) {
      tokens.push('[ढढ़ढ़]ा?[ँं़]?');
    } else if (/[नण]/.test(char)) {
      tokens.push('[नण]ा?[ँं़]?');
    } else if (/[शषस]/.test(char)) {
      tokens.push('[शषस]ा?[ँं़]?');
    } else if (/[बव]/.test(char)) {
      tokens.push('[बव]ा?[ँं़]?');
    } else if (/[इईिी]/.test(char)) {
      tokens.push('[इईिी]?[ँं़]?');
    } else if (/[उऊुू]/.test(char)) {
      tokens.push('[उऊुू]?[ँं़]?');
    } else if (/[एऐेै]/.test(char)) {
      tokens.push('[एऐेै]?[ँं़]?');
    } else if (/[दधथ]/.test(char)) {
      tokens.push('[दधथ]ा?[ँं़]?');
    } else if (char === 'ा') {
      tokens.push('ा?');
    } else if (char === ' ') {
      // space handled between tokens
    } else {
      tokens.push(char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + 'ा?[ँं़]?');
    }
  }
  return new RegExp(tokens.join('\\s*'), 'i');
};

const labels = {
  gender: { male: 'पुरुष', female: 'महिला', other: 'अन्य' },
  relation: { father: 'पिता', husband: 'पति', mother: 'माता', other: 'अन्य' },
  support: { supporter: 'समर्थक', opposite: 'विरोधी', neutral: 'तटस्थ', undecided: 'अनिर्णीत' },
};

const FIELD_DEFINITIONS = {
  voterSerial: {
    header: 'वि.स. क्रमांक (Serial)',
    extract: (m) => (m.voterSerial != null ? Number(m.voterSerial) || m.voterSerial : ''),
    width: 14,
  },
  wardVoterSerial: {
    header: 'वार्ड क्रमांक (Ward Serial)',
    extract: (m) => (m.wardVoterSerial != null ? Number(m.wardVoterSerial) || m.wardVoterSerial : ''),
    width: 16,
  },
  voterId: {
    header: 'मतदाता पहचान पत्र (EPIC)',
    extract: (m) => m.voterId || '',
    width: 18,
  },
  name: {
    header: 'मतदाता का नाम (Name)',
    extract: (m) => `${m.name || ''} ${m.surname || ''}`.trim(),
    width: 24,
  },
  guardianName: {
    header: 'पिता / पति का नाम (Father/Husband)',
    extract: (m) => m.guardianName || m.relativeName || '',
    width: 24,
  },
  relationType: {
    header: 'संबंध (Relation)',
    extract: (m) => labels.relation[m.relationType] || m.relationType || '',
    width: 14,
  },
  age: {
    header: 'उम्र (Age)',
    extract: (m) => (m.age != null ? Number(m.age) || m.age : ''),
    width: 10,
  },
  gender: {
    header: 'लिंग (Gender)',
    extract: (m) => labels.gender[m.gender] || m.gender || '',
    width: 12,
  },
  mobile: {
    header: 'मोबाइल नंबर (Mobile)',
    extract: (m) => (m.mobile ? String(m.mobile).trim() : ''),
    width: 15,
  },
  altMobile: {
    header: 'अन्य मोबाइल (Alt Mobile)',
    extract: (m) => (m.altMobile ? String(m.altMobile).trim() : ''),
    width: 15,
  },
  houseNumber: {
    header: 'मकान संख्या (House No)',
    extract: (m) => (m.houseNumber != null ? String(m.houseNumber).trim() : ''),
    width: 14,
  },
  village: {
    header: 'गाँव / मजरा (Village)',
    extract: (m) => m.village || m.location || '',
    width: 20,
  },
  wardNumber: {
    header: 'वार्ड संख्या (Ward No)',
    extract: (m) => m.wardNumber || (Array.isArray(m.municipalWardNumbers) && m.municipalWardNumbers[0]) || m.ward?.number || '',
    width: 14,
  },
  partNumber: {
    header: 'भाग संख्या (Booth/Part)',
    extract: (m) => m.partNumber || m.booth?.number || '',
    width: 14,
  },
  gramPanchayat: {
    header: 'ग्राम पंचायत (Gram Panchayat)',
    extract: (m) => m.gramPanchayat || '',
    width: 20,
  },
  tehsil: {
    header: 'तहसील / समिति (Tehsil)',
    extract: (m) => m.tehsil || '',
    width: 16,
  },
  municipality: {
    header: 'नगर पालिका (Municipality)',
    extract: (m) => m.municipality || '',
    width: 18,
  },
  caste: {
    header: 'जाति (Caste)',
    extract: (m) => m.caste || '',
    width: 16,
  },
  subCaste: {
    header: 'उपजाति (Sub-Caste)',
    extract: (m) => m.subCaste || '',
    width: 16,
  },
  address: {
    header: 'पता (Address)',
    extract: (m) => m.address || '',
    width: 28,
  },
  sectionName: {
    header: 'अनुभाग (Section)',
    extract: (m) => [m.sectionNumber, m.sectionName].filter(Boolean).join(' - ') || '',
    width: 22,
  },
  assemblyNumber: {
    header: 'विधानसभा (Assembly)',
    extract: (m) => [m.assemblyNumber, m.assemblyName].filter(Boolean).join(' - ') || '',
    width: 18,
  },
  occupation: {
    header: 'व्यवसाय (Occupation)',
    extract: (m) => m.occupation || '',
    width: 16,
  },
  education: {
    header: 'शिक्षा (Education)',
    extract: (m) => m.education || '',
    width: 14,
  },
  organizationPost: {
    header: 'संगठन पद (Designation)',
    extract: (m) => m.organizationPost || '',
    width: 18,
  },
  supportLevel: {
    header: 'समर्थन स्तर (Support)',
    extract: (m) => labels.support[m.supportLevel] || m.supportLevel || '',
    width: 14,
  },
  partyPreference: {
    header: 'पार्टी (Party)',
    extract: (m) => m.partyPreference || m.party?.name || '',
    width: 14,
  },
};

const ALIAS_MAP = {
  serial: 'voterSerial',
  wardserial: 'wardVoterSerial',
  epic: 'voterId',
  voter_id: 'voterId',
  father: 'guardianName',
  husband: 'guardianName',
  guardian: 'guardianName',
  relation: 'relationType',
  houseno: 'houseNumber',
  house: 'houseNumber',
  ward: 'wardNumber',
  wardno: 'wardNumber',
  booth: 'partNumber',
  part: 'partNumber',
  boothnumber: 'partNumber',
  gp: 'gramPanchayat',
  panchayat: 'gramPanchayat',
  phone: 'mobile',
  party: 'partyPreference',
  section: 'sectionName',
};

const DEFAULT_COLUMNS = [
  'voterSerial',
  'wardVoterSerial',
  'voterId',
  'name',
  'guardianName',
  'relationType',
  'age',
  'gender',
  'houseNumber',
  'village',
  'wardNumber',
  'partNumber',
  'gramPanchayat',
  'mobile',
  'caste',
  'supportLevel',
];

const buildFilter = (req) => {
  const filter = applyMemberScope(req.currentUser, {});
  const params = { ...(req.query || {}), ...(req.body || {}) };
  const andConditions = [];

  const {
    ward,
    booth,
    party,
    supportLevel,
    dobMonth,
    anniversaryMonth,
    ids,
    memberIds,
    excludedIds,
    gramPanchayat,
    wardNumber,
    municipalWard,
    municipalWardNumber,
    village,
    partNumber,
    boothNumber,
    tehsil,
    municipality,
    caste,
    gender,
    q,
    search,
  } = params;

  if (req.currentUser.role === 'admin') {
    if (ward && /^[0-9a-fA-F]{24}$/.test(ward)) filter.ward = ward;
    if (booth && /^[0-9a-fA-F]{24}$/.test(booth)) filter.booth = booth;
  }

  if (gramPanchayat) {
    const gpRegex = hindiFlexibleRegex(gramPanchayat);
    andConditions.push({
      $or: [
        { gramPanchayat: gpRegex },
        { gramPanchayat: { $in: ['', null] }, village: gpRegex },
      ],
    });
  }

  const wardNum = String(wardNumber || municipalWardNumber || municipalWard || (typeof ward === 'string' && !/^[0-9a-fA-F]{24}$/.test(ward) ? ward : '')).trim();
  if (wardNum && !wardNum.startsWith('all')) {
    const rawW = wardNum.replace(/\D/g, '').trim();
    const wardRegex = rawW ? new RegExp(`^(वॉर्ड|वार्ड)\\s*0*${rawW}$`, 'i') : null;
    andConditions.push({
      $or: [
        { wardNumber: wardNum },
        ...(rawW ? [{ wardNumber: rawW }] : []),
        ...(wardRegex ? [{ wardNumber: wardRegex }] : []),
        { municipalWardNumbers: wardNum },
        ...(rawW ? [{ municipalWardNumbers: rawW }] : []),
        ...(wardRegex ? [{ municipalWardNumbers: wardRegex }] : []),
      ],
    });
  }

  const samitiVal = String(params.samiti || params.tehsil || params.simiti || '').trim();
  if (samitiVal && samitiVal !== 'all') {
    andConditions.push({ tehsil: hindiFlexibleRegex(samitiVal) });
  }

  if (village) {
    const vRegex = hindiFlexibleRegex(village);
    if (gramPanchayat) {
      andConditions.push({ village: vRegex });
    } else {
      andConditions.push({
        $or: [
          { village: vRegex },
          { village: { $in: ['', null] }, sectionName: vRegex },
        ],
      });
    }
  }

  const partNum = String(partNumber || boothNumber || (typeof booth === 'string' && !/^[0-9a-fA-F]{24}$/.test(booth) ? booth : '')).trim();
  if (partNum && partNum !== 'all') {
    const parts = partNum.split(',').map((p) => p.trim()).filter(Boolean);
    if (parts.length > 1) {
      andConditions.push({ partNumber: { $in: parts } });
    } else if (parts.length === 1) {
      andConditions.push({ partNumber: parts[0] });
    }
  }

  if (tehsil) filter.tehsil = hindiFlexibleRegex(tehsil);
  if (municipality) filter.municipality = hindiFlexibleRegex(municipality);
  if (caste && caste !== 'all') filter.caste = hindiFlexibleRegex(caste);

  if (gender && gender !== 'all') {
    const genderMap = { m: 'male', f: 'female', o: 'other' };
    const normalizedGender = genderMap[String(gender).toLowerCase()] || String(gender).toLowerCase();
    filter.gender = new RegExp(`^${escapeRegex(normalizedGender)}`, 'i');
  }

  if (party) filter.party = party;
  if (supportLevel && supportLevel !== 'all') filter.supportLevel = supportLevel;

  const searchQuery = String(q || search || '').trim();
  if (searchQuery) {
    const qRegex = new RegExp(escapeRegex(searchQuery), 'i');
    andConditions.push({
      $or: [
        { name: qRegex },
        { surname: qRegex },
        { voterId: qRegex },
        { mobile: qRegex },
        { guardianName: qRegex },
        { relativeName: qRegex },
        { houseNumber: qRegex },
        { village: qRegex },
        { caste: qRegex },
      ],
    });
  }

  const idInput = ids || memberIds;
  if (idInput) {
    const idList = (Array.isArray(idInput) ? idInput : String(idInput).split(',')).map((id) => id.trim()).filter(Boolean);
    if (idList.length && params.selectAll !== 'true') filter._id = { $in: idList };
  }

  if (excludedIds) {
    const exclList = (Array.isArray(excludedIds) ? excludedIds : String(excludedIds).split(',')).map((id) => id.trim()).filter(Boolean);
    if (exclList.length) {
      filter._id = filter._id || {};
      filter._id.$nin = exclList;
    }
  }

  if (dobMonth) filter.$expr = { $eq: [{ $month: '$dob' }, Number(dobMonth)] };
  if (anniversaryMonth) filter.$expr = { $eq: [{ $month: '$anniversary' }, Number(anniversaryMonth)] };

  if (andConditions.length > 0) {
    if (filter.$and) {
      filter.$and.push(...andConditions);
    } else {
      filter.$and = andConditions;
    }
  }

  return filter;
};

const drawMemberProfile = (doc, member, index = 0) => {
  if (index > 0) doc.addPage();
  doc.rect(28, 28, 539, 785).stroke('#d1d5db');
  doc.font('HindiBold').fontSize(18).fillColor('#111827').text('Political Booth Management CRM', 45, 42);
  doc.font('Hindi').fontSize(10).fillColor('#6b7280').text('मतदाता सदस्य प्रोफाइल', 45, 66);
  if (member.party?.logo?.endsWith('.svg')) {
    doc.font('Hindi').fontSize(9).fillColor(member.party?.color || '#111827').text(member.party?.code || member.party?.name || '-', 485, 45, { align: 'right' });
  }
  if (member.photo) {
    try { const image = resolveUploadPublicPath(member.photo); if (fs.existsSync(image)) doc.image(image, 45, 95, { width: 90, height: 100, fit: [90, 100] }); else doc.rect(45, 95, 90, 100).stroke(); } catch (e) { doc.rect(45, 95, 90, 100).stroke(); }
  } else {
    doc.rect(45, 95, 90, 100).stroke().font('Hindi').fontSize(9).fillColor('#6b7280').text('फोटो', 77, 140);
  }
  doc.font('HindiBold').fontSize(16).fillColor('#111827').text(`${member.name} ${member.surname || ''}`, 155, 95);
  doc.font('Hindi').fontSize(10).fillColor('#374151');
  const rows = [
    ['मोबाइल', member.mobile],
    ['वैकल्पिक मोबाइल', member.altMobile],
    ['जन्म तिथि', member.dob ? member.dob.toLocaleDateString('hi-IN') : '-'],
    ['वर्षगांठ', member.anniversary ? member.anniversary.toLocaleDateString('hi-IN') : '-'],
    ['लिंग', member.gender],
    ['वार्ड', member.ward?.number || member.ward?.name],
    ['बूथ', member.booth?.number || member.booth?.name],
    ['मतदाता आईडी', member.voterId],
    ['घर संख्या', member.houseNumber],
    ['अनुभाग', member.sectionName || member.sectionNumber],
    ['समर्थन', member.supportLevel],
    ['व्यवसाय', member.occupation],
    ['शिक्षा', member.education],
    ['पता', member.address],
    ['स्थान', member.location],
  ];
  let y = 125;
  for (const [label, value] of rows) {
    doc.fillColor('#6b7280').text(`${label}:`, 155, y, { width: 80 });
    doc.fillColor('#111827').text(value || '-', 240, y, { width: 290 });
    y += 18;
  }
  doc.font('HindiBold').moveDown().fillColor('#111827').text('परिवार', 45, 250);
  y = 270;
  (member.family || []).slice(0, 8).forEach((f) => {
    doc.font('Hindi').fontSize(9).text(`${f.name || '-'} | ${f.relation || '-'} | ${f.mobile || '-'}`, 55, y);
    y += 15;
  });
  doc.font('HindiBold').fontSize(10).text('अतिरिक्त जानकारी', 45, 410);
  y = 430;
  (member.extraDetails || []).slice(0, 12).forEach((d) => {
    doc.font('Hindi').fontSize(9).text(`${d.label || '-'}: ${d.value || '-'}`, 55, y);
    y += 15;
  });
  doc.font('HindiBold').fontSize(10).text('टिप्पणी', 45, 625);
  doc.font('Hindi').fontSize(9).text(member.notes || '-', 55, 645, { width: 470, height: 80 });
  if (member.qrCode) {
    try { doc.image(Buffer.from(member.qrCode.split(',')[1], 'base64'), 455, 690, { width: 75 }); } catch (e) {}
  }
};

exports.profilePdf = async (req, res, next) => {
  try {
    const member = await Member.findById(req.params.id).populate('ward booth party createdBy updatedBy');
    if (!member) return res.status(404).json({ message: 'Member not found' });
    assertBoothAccess(req.currentUser, member.booth?._id || member.booth);
    if (req.currentUser.role === 'booth' && !req.currentUser.permissions?.canPrintProfiles) {
      return res.status(403).json({ message: 'Profile printing is disabled for this booth user' });
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="member-${member._id}.pdf"`);
    const doc = new PDFDocument({ size: 'A4', margin: 42 });
    preparePdf(doc);
    doc.pipe(res);
    drawMemberProfile(doc, member);
    doc.end();
  } catch (e) { next(e); }
};

exports.bulkProfilesPdf = async (req, res, next) => {
  try {
    const members = await Member.find(buildFilter(req)).populate('ward booth party createdBy updatedBy').sort({ ward: 1, booth: 1, name: 1 }).collation({ locale: 'en', numericOrdering: true, strength: 1 }).limit(500);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="member-profiles-bulk.pdf"');
    const doc = new PDFDocument({ size: 'A4', margin: 28 });
    preparePdf(doc);
    doc.pipe(res);
    members.forEach((member, index) => drawMemberProfile(doc, member, index));
    if (!members.length) doc.font('Hindi').fontSize(16).text('चुने गए फ़िल्टर में कोई सदस्य नहीं मिला।');
    doc.end();
  } catch (e) { next(e); }
};

exports.membersXlsx = async (req, res, next) => {
  try {
    const params = { ...(req.query || {}), ...(req.body || {}) };
    const filter = buildFilter(req);

    // Determine requested columns
    let colInput = params.columns || params.fields;
    let rawCols = [];
    if (Array.isArray(colInput)) {
      rawCols = colInput;
    } else if (typeof colInput === 'string' && colInput.trim()) {
      rawCols = colInput.split(',').map((c) => c.trim()).filter(Boolean);
    }

    const resolvedCols = [];
    for (const raw of rawCols) {
      const normalizedKey = raw.toLowerCase().replace(/[^a-z0-9]/g, '');
      const mappedKey = ALIAS_MAP[normalizedKey] || raw;
      if (FIELD_DEFINITIONS[mappedKey] && !resolvedCols.includes(mappedKey)) {
        resolvedCols.push(mappedKey);
      }
    }

    const finalCols = resolvedCols.length > 0 ? resolvedCols : DEFAULT_COLUMNS;

    // Sorting
    let sortQuery = { wardNumber: 1, wardVoterSerial: 1, voterSerial: 1, name: 1 };
    if (params.sortBy) {
      const dir = params.sortOrder === 'desc' || params.sortOrder === '-1' ? -1 : 1;
      sortQuery = { [params.sortBy]: dir, name: 1 };
    } else if (params.partNumber || params.boothNumber) {
      sortQuery = { voterSerial: 1, name: 1 };
    } else if (params.wardNumber || params.municipalWardNumber) {
      sortQuery = { wardVoterSerial: 1, voterSerial: 1, name: 1 };
    }

    const limit = Math.min(Math.max(Number(params.limit) || 50000, 1), 100000);

    const members = await Member.find(filter)
      .populate('ward booth party')
      .sort(sortQuery)
      .collation({ locale: 'en', numericOrdering: true, strength: 1 })
      .limit(limit)
      .lean();

    const rows = members.map((m) => {
      const row = {};
      for (const colKey of finalCols) {
        const def = FIELD_DEFINITIONS[colKey];
        if (def) {
          row[def.header] = def.extract(m);
        }
      }
      return row;
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);

    // Calculate column widths
    ws['!cols'] = finalCols.map((colKey) => {
      const def = FIELD_DEFINITIONS[colKey];
      let maxLen = Math.max(def.header.length, def.width || 12);
      for (let i = 0; i < Math.min(rows.length, 120); i++) {
        const val = String(rows[i][def.header] ?? '');
        if (val.length > maxLen) maxLen = val.length;
      }
      return { wch: Math.min(Math.max(maxLen + 3, def.width || 12), 42) };
    });

    if (ws['!ref']) {
      ws['!autofilter'] = { ref: ws['!ref'] };
    }

    const sheetName = String(params.title || 'मतदाता सूची').slice(0, 31).replace(/[\\/?*:[\]]/g, '_');
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });

    // Build dynamic filename
    const filenameParts = ['Voters'];
    if (params.gramPanchayat) filenameParts.push(String(params.gramPanchayat).trim().replace(/\s+/g, '_'));
    if (params.wardNumber || params.municipalWardNumber) filenameParts.push(`Ward_${params.wardNumber || params.municipalWardNumber}`);
    if (params.partNumber || params.boothNumber) filenameParts.push(`Part_${params.partNumber || params.boothNumber}`);
    if (params.village) filenameParts.push(String(params.village).trim().replace(/\s+/g, '_'));
    if (params.caste && params.caste !== 'all') filenameParts.push(String(params.caste).trim().replace(/\s+/g, '_'));
    const timestamp = new Date().toISOString().slice(0, 10);
    filenameParts.push(timestamp);

    const finalFilename = `${filenameParts.join('_')}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(finalFilename)}"; filename*=UTF-8''${encodeURIComponent(finalFilename)}`);
    res.send(buffer);
  } catch (e) {
    next(e);
  }
};

exports.backup = async (req, res, next) => {
  try {
    const members = await Member.find(applyMemberScope(req.currentUser, {})).lean();
    const activities = req.currentUser.role === 'admin' ? await Activity.find().lean() : [];
    res.json({ exportedAt: new Date(), members, activities });
  } catch (e) { next(e); }
};
