const mongoose = require('mongoose');
const QRCode = require('qrcode');
const Member = require('../models/Member');
const ElectoralMembership = require('../models/ElectoralMembership');
const Family = require('../models/Family');
const Booth = require('../models/Booth');
const { applyMemberScope, assertBoothAccess, assertWardAccess, requirePermission } = require('../utils/boothAccess');
const { writeActivity } = require('../middleware/activityLogger');
const { requireValidEpic } = require('../utils/epic');
const { syncMemberFamily, removeMemberFromFamilies } = require('../utils/familySync');
const { persistLocalImage } = require('../utils/persistentMedia');
const { matchingLocationNames } = require('../utils/locationMerge');
const { invalidateMemberData } = require('../utils/dataCache');
const {
  buildSearchConditions,
  buildFieldSearchConditions,
  buildStrictFieldSearchConditions,
  searchExactCandidates,
} = require('../utils/memberSearch');

const populate = 'party ward booth area createdBy updatedBy';
const maskMobile = (value) => {
  const text = String(value || '');
  return text.length >= 4 ? `${'*'.repeat(Math.max(0, text.length - 4))}${text.slice(-4)}` : text;
};
const maskMemberMobile = (member, user) => {
  if (user.role === 'admin' || user.permissions?.canViewFullMobile) return member;
  const value = member.toObject ? member.toObject() : { ...member };
  value.mobile = maskMobile(value.mobile);
  value.altMobile = maskMobile(value.altMobile);
  return value;
};

const searchRegex = (value) => new RegExp(String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const normalizeMonthDayDate = (value) => {
  const raw = String(value ?? '').trim();
  if (!raw) return undefined;
  const normalized = raw.replace(/\//g, '-');
  let match = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!match) match = normalized.match(/^(\d{1,2})-(\d{1,2})$/);
  if (!match) return value;
  const month = Number(match.length === 4 ? match[2] : match[1]);
  const day = Number(match.length === 4 ? match[3] : match[2]);
  if (!month || !day || month < 1 || month > 12 || day < 1 || day > 31) return undefined;
  return new Date(Date.UTC(2000, month - 1, day));
};

const normalizeMemberDates = (data) => {
  for (const key of ['dob', 'anniversary']) {
    if (!Object.prototype.hasOwnProperty.call(data, key)) continue;
    if (String(data[key] ?? '').trim() === '') {
      data[key] = undefined;
      continue;
    }
    data[key] = normalizeMonthDayDate(data[key]);
  }
};
const hindiEnglishCollator = new Intl.Collator(['en', 'hi'], {
  numeric: true,
  sensitivity: 'base',
  ignorePunctuation: true,
});

function compareLabels(a, b) {
  const left = String(a?.label ?? a?.value ?? '').trim();
  const right = String(b?.label ?? b?.value ?? '').trim();
  return hindiEnglishCollator.compare(left, right);
}

const isPersonalContact = (data) => data?.contactType === 'personal';

const assertPersonalContactAllowed = (user, data) => {
  if (!isPersonalContact(data)) return;
  if (user.role !== 'admin') {
    const err = new Error('Only admin can save personal contacts.');
    err.status = 403;
    throw err;
  }
};

const removeBlankObjectRefs = (data) => {
  for (const field of ['ward', 'booth', 'area', 'party']) {
    if (Object.prototype.hasOwnProperty.call(data, field) && !String(data[field] || '').trim()) {
      delete data[field];
    }
  }
};

const duplicateWarnings = async (data, excludeId) => {
  const or = [];
  if (data.mobile) or.push({ mobile: data.mobile });
  if (data.address) or.push({ address: data.address });
  if (!or.length) return [];
  const query = { $or: or };
  if (excludeId) query._id = { $ne: excludeId };
  const matches = await Member.find(query).select('mobile address name surname');
  return matches.flatMap((m) => {
    const warnings = [];
    if (data.mobile && m.mobile === data.mobile) warnings.push({ field: 'mobile', member: m._id, value: data.mobile });
    if (data.address && m.address === data.address) warnings.push({ field: 'address', member: m._id, value: data.address });
    return warnings;
  });
};

const attachBoothWard = async (data, user) => {
  if (user.role === 'booth') {
    data.booth = user.assignedBooth?._id || user.assignedBooth;
  }
  if (user.role === 'ward_head') {
    data.ward = user.assignedWard?._id || user.assignedWard;
  }
  if (data.booth) {
    const booth = await Booth.findById(data.booth).select('ward');
    if (!booth) {
      const err = new Error('Valid booth is required');
      err.status = 400;
      throw err;
    }
    data.ward = booth.ward;
  }
  return data;
};

exports.create = async (req, res, next) => {
  try { requirePermission(req.currentUser, 'canCreateVoters'); } catch (error) { return next(error); }
  try {
    const data = { ...req.body };
    data.contactType = data.contactType === 'personal' ? 'personal' : 'voter';
    removeBlankObjectRefs(data);
    assertPersonalContactAllowed(req.currentUser, data);

    if (isPersonalContact(data)) {
      if (!String(data.mobile || '').trim() && !String(data.address || '').trim()) {
        const err = new Error('Personal contact ke liye mobile ya address me se ek zaroori hai.');
        err.status = 400;
        throw err;
      }
      if (!String(data.voterId || '').trim()) delete data.voterId;
    } else {
      data.voterId = requireValidEpic(data.voterId);
    }

    if (req.file) data.photo = await persistLocalImage(req.file.path, req.currentUser._id, true);
    await attachBoothWard(data, req.currentUser);
    if (!isPersonalContact(data) && !data.booth) {
      const err = new Error('Booth is required for voter contacts.');
      err.status = 400;
      throw err;
    }
    if (data.booth) assertBoothAccess(req.currentUser, data.booth);
    if (data.ward) assertWardAccess(req.currentUser, data.ward);
    data.createdBy = req.currentUser._id;
    data.updatedBy = req.currentUser._id;
    data.duplicateWarnings = await duplicateWarnings(data);
    if (data.duplicateWarnings.length) data.verificationStatus = 'duplicate';
    const member = await Member.create(data);
    member.qrCode = await QRCode.toDataURL((process.env.APP_PUBLIC_URL || 'political-booth-crm') + ':/members/' + member._id);
    await member.save();
    await syncMemberFamily(member, req.currentUser._id);
    await writeActivity({ req, action: 'member.created', module: 'members', entityId: member._id, after: member });
    invalidateMemberData();
    res.status(201).json(await Member.findById(member._id).populate(populate));
  } catch (error) {
    next(error);
  }
};

exports.list = async (req, res, next) => {
  try {
    const { q, qMode, party, supportLevel, gender, booth, ward, area, verificationStatus, location, village, gramPanchayat, tehsil, municipality, caste, organizationPost, occupation, contactType, sectionNumber, sectionName, sectionNames, assemblyNumber, assemblyName, partNumber, pinCode, voterSerial, profileCompletionStatus, partyPreference, favorite, letter, rollType, matchStatus, municipalWard } = req.query;
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const paged = String(req.query.paged || '').toLowerCase() === 'true' || req.query.page !== undefined;
    const filter = applyMemberScope(req.currentUser, {});
    const selectedRoll = String(rollType || "assembly").toLowerCase();
    if (contactType !== "personal") {
      if (selectedRoll === "assembly") {
        filter.$and = [...(filter.$and || []), { $or: [
          { hasAssemblyMembership: true },
          { hasAssemblyMembership: { $exists: false }, assemblyNumber: { $nin: ["", null] } },
        ] }];
      } else if (selectedRoll === "municipal") {
        filter.hasMunicipalMembership = true;
      }
      if (matchStatus === "both") {
        filter.hasAssemblyMembership = true;
        filter.hasMunicipalMembership = true;
      } else if (matchStatus === "assembly_only") {
        filter.$and = [...(filter.$and || []), { $or: [
          { hasAssemblyMembership: true },
          { hasAssemblyMembership: { $exists: false }, assemblyNumber: { $nin: ["", null] } },
        ] }, { hasMunicipalMembership: { $ne: true } }];
      } else if (matchStatus === "municipal_only") {
        filter.hasMunicipalMembership = true;
        filter.hasAssemblyMembership = { $ne: true };
      }
      if (municipalWard) filter.municipalWardNumbers = String(municipalWard).trim();
    }
    if (party) filter.party = party;
    if (supportLevel) filter.supportLevel = supportLevel;
    if (partyPreference) filter.partyPreference = partyPreference;
    if (favorite === 'true' && req.currentUser.role === 'admin') filter.isFavorite = true;
    if (gender) filter.gender = gender;
    if (ward) filter.ward = ward;
    if (area) filter.area = area;
    if (location) filter.location = searchRegex(location);
    if (village) filter.village = searchRegex(village);
    if (pinCode) {
      const normalizedPin = String(pinCode).replace(/\D/g, '');
      if (normalizedPin) filter.pinCode = new RegExp('^' + escapeRegex(normalizedPin) + '$', 'i');
    }
    if (gramPanchayat) filter.gramPanchayat = searchRegex(gramPanchayat);
    if (tehsil) filter.tehsil = searchRegex(tehsil);
    if (municipality) filter.municipality = searchRegex(municipality);
    if (caste) filter.caste = searchRegex(caste);
    if (organizationPost) filter.organizationPost = searchRegex(organizationPost);
    if (occupation) filter.occupation = searchRegex(occupation);
    if (contactType === 'personal') filter.contactType = 'personal';
    if (contactType === 'voter') filter.contactType = { $ne: 'personal' };
    if (sectionNumber) filter.sectionNumber = new RegExp(`^${String(sectionNumber).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
    if (sectionNames) {
      try {
        const values = JSON.parse(String(sectionNames));
        if (Array.isArray(values) && values.length) {
          filter.sectionName = { $in: values.map((value) => String(value).trim()).filter(Boolean) };
        }
      } catch (_) {}
    }
    if (sectionName && !filter.sectionName) filter.sectionName = searchRegex(sectionName);    if (assemblyNumber) filter.assemblyNumber = assemblyNumber;
    if (assemblyName) filter.assemblyName = searchRegex(assemblyName);
    if (partNumber) filter.partNumber = partNumber;
    if (voterSerial) {
      if (!village && !partNumber && !booth && !sectionName && !gramPanchayat) {
        return res.status(400).json({ message: 'क्रम संख्या खोजने से पहले भाग / गाँव या अनुभाग चुनें।' });
      }
      const serial = String(voterSerial).replace(/[०-९]/g, (digit) => String('०१२३४५६७८९'.indexOf(digit))).replace(/\D/g, '');
      if (serial) filter.voterSerial = new RegExp(`^${escapeRegex(serial)}$`, 'i');
    }
    if (verificationStatus) {
      if (verificationStatus === 'needs_review' || verificationStatus === 'review') {
        filter.$and = [...(filter.$and || []), {
          $or: [
            { verificationStatus: 'needs_review' },
            { verificationStatus: 'duplicate' },
            { ocrNeedsReview: true },
            { 'ocrReviewReasons.0': { $exists: true } },
          ],
        }];
      } else {
        filter.verificationStatus = verificationStatus;
      }
    }
    if (profileCompletionStatus) filter.profileCompletionStatus = profileCompletionStatus;
    if (letter) {
      const escapedLetter = escapeRegex(String(letter).trim());
      filter.name = new RegExp(`^${escapedLetter}`, 'i');
    }
    if (req.query.missingMobile === 'true') filter.$and = [...(filter.$and || []), { $or: [{ mobile: '' }, { mobile: null }, { mobile: { $exists: false } }] }];
    if (req.query.missingHouse === 'true') filter.$and = [...(filter.$and || []), { $or: [{ houseNumber: '' }, { houseNumber: null }, { houseNumber: { $exists: false } }] }];
    if (booth && req.currentUser.role === 'admin') filter.booth = booth;
    if (q) {
      const cleanMode = qMode ? String(qMode).trim().toLowerCase() : '';
      let conditions = cleanMode
        ? buildFieldSearchConditions(q, cleanMode)
        : buildSearchConditions(q);
      if (cleanMode) {
        const strictConditions = buildStrictFieldSearchConditions(q, cleanMode);
        const strictFilter = {
          ...filter,
          $and: [...(filter.$and || []), ...strictConditions],
        };
        if (await Member.exists(strictFilter)) conditions = strictConditions;
      }
      filter.$and = [...(filter.$and || []), ...conditions];
    }

    const sortParam = String(req.query.sortBy || req.query.sort || '').toLowerCase();
    const hasLocationScope = Boolean(village || partNumber || booth || sectionName || gramPanchayat);
    let sortObj = { name: 1, surname: 1, houseNumber: 1 };

    if (sortParam === 'recent') {
      sortObj = { updatedAt: -1 };
    } else if (['voterserial', 'serial', 'serialnumber', 'matdatakram', 'kram'].includes(sortParam)) {
      if (hasLocationScope) {
        sortObj = { voterSerial: 1, name: 1 };
      } else {
        sortObj = { village: 1, partNumber: 1, voterSerial: 1, name: 1 };
      }
    } else if (['house', 'housenumber', 'makan'].includes(sortParam)) {
      sortObj = { houseNumber: 1, voterSerial: 1 };
    }

    const listQuery = (query) => Member.find(query)
      .select('contactType photo name surname mobile altMobile dob estimatedDob anniversary voterId voterSerial guardianName houseNumber address location area tehsil gramPanchayat village municipality caste subCaste organizationPost organizationLevel influenceLevel occupation workplaceState workplaceCity workplaceVillage spouseName marriageState marriageCity marriageVillage education extraDetails supportLevel partyPreference isFavorite ward booth updatedAt age gender sectionNumber sectionName assemblyNumber assemblyName partNumber partName postOffice policeStation district pinCode verificationStatus profileCompletionStatus profileCompletedBy profileCompletedAt ocrConfidence houseNumberConfidence locationMatchConfidence locationResolution ocrReviewReasons ocrValidationPassed ocrFieldConfidence ocrValues sourceDocument hasAssemblyMembership hasMunicipalMembership municipalWardNumbers')
      .populate(populate)
      .sort(sortObj)
      .collation({ locale: 'en', numericOrdering: true, strength: 1 });
    const start = paged ? (page - 1) * limit : 0;
    let members;
    let total;
    if (q) {
      const exactValues = qMode ? [] : searchExactCandidates(q);
      const exactFilter = exactValues.length ? { ...filter, searchExact: { $in: exactValues } } : null;
      const [matchingTotal, exactTotal] = await Promise.all([
        Member.countDocuments(filter),
        exactFilter ? Member.countDocuments(exactFilter) : 0,
      ]);
      total = matchingTotal;
      const exactMembers = start < exactTotal
        ? await listQuery(exactFilter).skip(start).limit(limit).lean()
        : [];
      const remaining = Math.max(0, limit - exactMembers.length);
      let generalMembers = [];
      if (remaining) {
        const generalFilter = exactValues.length
          ? {
              ...filter,
              $and: [...(filter.$and || []), { searchExact: { $nin: exactValues } }],
            }
          : filter;
        generalMembers = await listQuery(generalFilter)
          .skip(Math.max(0, start - exactTotal))
          .limit(remaining)
          .lean();
      }
      members = [...exactMembers, ...generalMembers];
    } else {
      members = await listQuery(filter).skip(start).limit(limit).lean();
      if (paged) total = await Member.countDocuments(filter);
    }
    const membershipRows = members.length
      ? await ElectoralMembership.find({ member: { $in: members.map((member) => member._id) } })
        .populate("electoralList", "type name year municipality wardNumber assemblyNumber assemblyName partNumber status")
        .lean()
      : [];
    const membershipsByMember = new Map();
    for (const membership of membershipRows) {
      const key = String(membership.member);
      if (!membershipsByMember.has(key)) membershipsByMember.set(key, []);
      membershipsByMember.get(key).push(membership);
    }
    const items = members.map((member) => ({
      ...maskMemberMobile(member, req.currentUser),
      electoralMemberships: membershipsByMember.get(String(member._id)) || [],
    }));
    if (!paged) return res.json(items);
    res.json({
      items,
      total,
      page,
      limit,
      pages: Math.max(Math.ceil(total / limit), 1),
    });
  } catch (error) {
    next(error);
  }
};

const optionDefinitions = {
  assembly: {
    group: { number: '$assemblyNumber', name: '$assemblyName' },
    match: { $or: [{ assemblyNumber: { $nin: ['', null] } }, { assemblyName: { $nin: ['', null] } }] },
    option: (id, count) => ({
      value: id.number || id.name,
      label: [id.number, id.name].filter(Boolean).join(' - '),
      count,
      filters: {
        ...(id.number ? { assemblyNumber: id.number } : {}),
        ...(id.name ? { assemblyName: id.name } : {}),
      },
    }),
  },
  section: {
    group: '$sectionName',
    match: { sectionName: { $nin: ['', null] } },
    option: (id, count) => ({
      value: id,
      label: id,
      count,
      filters: { sectionName: id },
    }),
  },
  sectionName: {
    group: '$sectionName',
    match: { sectionName: { $nin: ['', null] } },
    option: (id, count) => ({
      value: id,
      label: id,
      count,
      filters: { sectionName: id },
    }),
  },
  partVillage: {
    group: { village: '$village', partNumber: '$partNumber' },
    match: {
      $or: [
        { village: { $nin: ['', null] } },
        { partNumber: { $nin: ['', null] } },
      ],
    },
    option: (id, count) => ({
      value: [id.village, id.partNumber].filter(Boolean).join('|'),
      label: [
        id.village || 'गाँव उपलब्ध नहीं',
        id.partNumber ? `भाग ${id.partNumber}` : '',
      ].filter(Boolean).join(' · '),
      count,
      filters: {
        ...(id.village ? { village: id.village } : {}),
        ...(id.partNumber ? { partNumber: id.partNumber } : {}),
      },
    }),
  },
  booth: {
    group: { number: '$partNumber', name: '$partName', village: '$village' },
    match: {
      $or: [
        { partNumber: { $nin: ['', null] } },
        { partName: { $nin: ['', null] } },
        { village: { $nin: ['', null] } },
      ],
    },
    option: (id, count) => ({
      value: id.number || id.village || id.name || '',
      label: [
        id.number ? `भाग ${id.number}` : '',
        id.village || id.name || '',
      ].filter(Boolean).join(' - ') || 'भाग / गाँव',
      count,
      filters: {
        ...(id.number ? { partNumber: id.number } : {}),
        ...(id.village ? { village: id.village } : {}),
        ...(id.name ? { partName: id.name } : {}),
      },
    }),
  },
  part: {
    group: { number: '$partNumber', name: '$partName', village: '$village' },
    match: {
      $or: [
        { partNumber: { $nin: ['', null] } },
        { partName: { $nin: ['', null] } },
        { village: { $nin: ['', null] } },
      ],
    },
    option: (id, count) => ({
      value: id.number || id.village || id.name || '',
      label: [
        id.number ? `भाग ${id.number}` : '',
        id.village || id.name || '',
      ].filter(Boolean).join(' - ') || 'भाग / गाँव',
      count,
      filters: {
        ...(id.number ? { partNumber: id.number } : {}),
        ...(id.village ? { village: id.village } : {}),
      },
    }),
  },
  partName: { field: 'partName' },
  village: { field: 'village' },
  pinCode: { field: 'pinCode' },
  gramPanchayat: { field: 'gramPanchayat' },
  tehsil: { field: 'tehsil' },
  municipality: { field: 'municipality' },
  partNumber: {
    group: { number: '$partNumber', name: '$sectionName', village: '$village' },
    match: { partNumber: { $nin: ['', null] } },
    option: (id, count) => ({
      value: id.number || id.village || id.name,
      label: [
        id.number ? `भाग ${id.number}` : '',
        id.village || id.name || '',
      ].filter(Boolean).join(' - ') || `Part ${id.number || '-'}`,
      count,
      filters: id.number ? { partNumber: id.number } : { sectionName: id.name },
    }),
  },
  caste: { field: 'caste' },
  occupation: { field: 'occupation' },
  organizationPost: { field: 'organizationPost' },
};

function addOptionFilter(filter, key, value) {
  if (!value) return;
  if (['assemblyNumber', 'partNumber', 'sectionNumber', 'pinCode', 'supportLevel', 'verificationStatus', 'gender', 'booth'].includes(key)) {
    filter[key] = value;
  } else if (['assemblyName', 'sectionName', 'partName', 'village', 'gramPanchayat', 'tehsil', 'municipality', 'caste', 'occupation', 'organizationPost'].includes(key)) {
    filter[key] = new RegExp(String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  }
}

const locationFields = [
  'assemblyNumber',
  'assemblyName',
  'gramPanchayat',
  'village',
  'partNumber',
  'tehsil',
  'municipality',
  'sectionNumber',
  'sectionName',
  'location',
];

const cleanText = (value) => String(value ?? '').trim();
const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const exactLocationFilter = (source = {}) => {
  const filter = {};
  for (const field of ['assemblyNumber', 'assemblyName', 'gramPanchayat', 'village', 'partNumber', 'sectionNumber', 'sectionName']) {
    if (Object.prototype.hasOwnProperty.call(source, field)) {
      filter[field] = cleanText(source[field]);
    }
  }
  return filter;
};

const cleanLocationUpdates = (updates = {}) => {
  const cleaned = {};
  for (const field of locationFields) {
    if (Object.prototype.hasOwnProperty.call(updates, field)) {
      cleaned[field] = cleanText(updates[field]);
    }
  }
  return cleaned;
};

const locationSearchFields = ['assemblyNumber', 'assemblyName', 'gramPanchayat', 'village', 'partNumber', 'tehsil', 'municipality', 'sectionNumber', 'sectionName', 'location', 'address'];

const locationVariantsFor = (token) => {
  const lower = cleanText(token).toLowerCase();
  const variants = new Set([cleanText(token)]);
  if (['bheeta', 'bhita', 'beeta', 'hier'].includes(lower) || /भीट|हीर|हियर/.test(token)) {
    ['bheeta', 'bhita', 'beeta', 'भीटा', 'भीट', 'hier', 'हीर', 'हियर'].forEach((value) => variants.add(value));
  }
  if (['shara', 'sahara', 'sahada', 'sahra'].includes(lower) || /सहाड़|सहारा|सहरा/.test(token)) {
    ['shara', 'sahara', 'sahada', 'sahra', 'सहाड़ा', 'सहारा', 'सहरा'].forEach((value) => variants.add(value));
  }
  return [...variants].filter(Boolean);
};

const regexesForLocationValue = (value) => [...new Set(locationVariantsFor(value))]
  .map((variant) => new RegExp(escapeRegExp(variant), 'i'));

const addSmartLocationSearch = (filter, query) => {
  const tokens = cleanText(query).split(/\s+/).filter((token) => token.length >= 2).slice(0, 6);
  if (!tokens.length) return;
  const regexes = [...new Set(tokens.flatMap(locationVariantsFor))]
    .map((variant) => new RegExp(escapeRegExp(variant), 'i'));
  filter.$and = [
    ...(filter.$and || []),
    { $or: locationSearchFields.flatMap((field) => regexes.map((regex) => ({ [field]: regex }))) },
  ];
};
exports.locationGroups = async (req, res, next) => {
  try {
    const { rollType, contactType, matchStatus, municipalWard } = req.query;
    const filter = applyMemberScope(req.currentUser, {});
    const selectedRoll = String(rollType || "assembly").toLowerCase();
    if (contactType !== "personal") {
      if (selectedRoll === "assembly") {
        filter.$and = [...(filter.$and || []), { $or: [
          { hasAssemblyMembership: true },
          { hasAssemblyMembership: { $exists: false }, assemblyNumber: { $nin: ["", null] } },
        ] }];
      } else if (selectedRoll === "municipal") {
        filter.hasMunicipalMembership = true;
      }
      if (matchStatus === "both") {
        filter.hasAssemblyMembership = true;
        filter.hasMunicipalMembership = true;
      } else if (matchStatus === "assembly_only") {
        filter.$and = [...(filter.$and || []), { $or: [
          { hasAssemblyMembership: true },
          { hasAssemblyMembership: { $exists: false }, assemblyNumber: { $nin: ["", null] } },
        ] }, { hasMunicipalMembership: { $ne: true } }];
      } else if (matchStatus === "municipal_only") {
        filter.hasMunicipalMembership = true;
        filter.hasAssemblyMembership = { $ne: true };
      }
      if (municipalWard) filter.municipalWardNumbers = String(municipalWard).trim();
    }
    for (const key of ['assemblyNumber', 'assemblyName', 'gramPanchayat', 'village', 'partNumber', 'sectionNumber', 'sectionName']) {
      addOptionFilter(filter, key, req.query[key]);
    }
    const q = cleanText(req.query.q).toLocaleLowerCase('hi-IN');
    const rows = await Member.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            assemblyNumber: { $ifNull: ['$assemblyNumber', ''] },
            assemblyName: { $ifNull: ['$assemblyName', ''] },
            gramPanchayat: { $ifNull: ['$gramPanchayat', ''] },
            village: { $ifNull: ['$village', ''] },
            partNumber: { $ifNull: ['$partNumber', ''] },
            sectionNumber: { $ifNull: ['$sectionNumber', ''] },
            sectionName: { $ifNull: ['$sectionName', ''] },
          },
          count: { $sum: 1 },
          sampleNames: { $push: '$name' },
        },
      },
      { $sort: { count: -1 } },
      { $limit: Math.min(Number(req.query.limit) || 200, 500) },
    ]);
    const items = rows.map((row) => {
      const key = row._id || {};
      const label = [
        key.assemblyNumber || key.assemblyName ? `विधानसभा ${[key.assemblyNumber, key.assemblyName].filter(Boolean).join(' - ')}` : '',
        key.gramPanchayat ? `पंचायत ${key.gramPanchayat}` : '',
        key.village ? `गाँव ${key.village}` : '',
        key.partNumber ? `भाग ${key.partNumber}` : '',
        key.sectionNumber || key.sectionName
          ? `अनुभाग ${[key.sectionNumber, key.sectionName].filter(Boolean).join(' - ')}`
          : '',
      ].filter(Boolean).join(' • ') || 'Location खाली';
      return {
        key,
        label,
        count: row.count,
        sampleNames: (row.sampleNames || []).filter(Boolean).slice(0, 3),
      };
    }).filter((item) => !q || item.label.toLocaleLowerCase('hi-IN').includes(q));
    res.json({ items });
  } catch (error) {
    next(error);
  }
};

exports.bulkLocationCorrection = async (req, res, next) => {
  try {
    const rawSource = req.body?.source || {};
    const source = exactLocationFilter(rawSource);
    const smartQuery = cleanText(rawSource.smartQuery || rawSource.q);
    const updates = cleanLocationUpdates(req.body?.updates || {});
    const dryRun = req.body?.dryRun !== false;
    if (req.body?.mergeMatchingOnly === true) {
      if (!source.sectionName || !updates.sectionName) {
        return res.status(400).json({ message: 'Merge के लिए source और target अनुभाग नाम जरूरी हैं।' });
      }
      if (!matchingLocationNames(source.sectionName, updates.sectionName)) {
        return res.status(400).json({ message: 'केवल मिलते-जुलते अनुभाग नाम merge किए जा सकते हैं।' });
      }
    }
    const sourceKeyCount = Object.values(source).filter((value) => value !== '').length;
    const safeVillageSource = source.village && sourceKeyCount >= 2;
    const safeSectionSource = source.sectionName && sourceKeyCount >= 2;
    if (!smartQuery && !safeVillageSource && !safeSectionSource) {
      return res.status(400).json({
        message: 'Source में गाँव या अनुभाग के साथ विधानसभा/पंचायत/भाग/अनुभाग में से कम से कम एक और value दें।',
      });
    }
    if (!dryRun && !Object.keys(updates).length) {
      return res.status(400).json({ message: 'Correct location values required.' });
    }
    const looksLikeOcrGarbage = source.village && !/[\u0900-\u097F]/.test(source.village);
    const baseSource = looksLikeOcrGarbage
      ? Object.fromEntries(Object.entries(source).filter(([key]) => key !== 'village'))
      : source;
    const filter = applyMemberScope(req.currentUser, baseSource);
    addSmartLocationSearch(filter, smartQuery);
    if (looksLikeOcrGarbage) {
      const regexes = regexesForLocationValue(source.village);
      filter.$or = [
        ...regexes.map((regex) => ({ village: regex })),
        ...regexes.map((regex) => ({ location: regex })),
        ...regexes.map((regex) => ({ address: regex })),
        ...regexes.map((regex) => ({ sectionName: regex })),
      ];
    }
    const count = await Member.countDocuments(filter);
    const sample = await Member.find(filter)
      .select('name voterId guardianName houseNumber assemblyNumber assemblyName gramPanchayat village partNumber sectionNumber sectionName location address')
      .limit(20)
      .lean();
    if (dryRun) {
      return res.json({ dryRun: true, matched: count, source: smartQuery ? { ...source, smartQuery } : source, updates, sample });
    }
    if (count > 5000) {
      return res.status(400).json({ message: 'एक बार में 5000 से ज्यादा voters update नहीं होंगे। Filter छोटा करें।', matched: count });
    }
    const members = await Member.find(filter);
    let updated = 0;
    let changedFields = 0;
    for (const member of members) {
      let changed = false;
      const oldSectionName = cleanText(member.sectionName);
      for (const [field, value] of Object.entries(updates)) {
        if (cleanText(member[field]) === cleanText(value)) continue;
        member[field] = value;
        changed = true;
        changedFields += 1;
      }
      if (!changed) continue;
      if (updates.sectionName && oldSectionName) {
        const escaped = new RegExp(escapeRegExp(oldSectionName), 'gi');
        if (cleanText(member.location)) {
          member.location = String(member.location).replace(escaped, updates.sectionName);
        }
        if (cleanText(member.address)) {
          member.address = String(member.address).replace(escaped, updates.sectionName);
        }
      }
      member.updatedBy = req.currentUser._id;
      await member.save();
      await syncMemberFamily(member, req.currentUser._id);
      updated += 1;
    }
    await writeActivity({
      req,
      action: 'members.location_corrected',
      module: 'members',
      after: { matched: count, updated, changedFields, source: smartQuery ? { ...source, smartQuery } : source, updates },
    });
    invalidateMemberData();
    res.json({
      dryRun: false,
      matched: count,
      updated,
      changedFields,
      noChange: count > 0 && updated === 0,
      source: smartQuery ? { ...source, smartQuery } : source,
      updates,
    });
  } catch (error) {
    next(error);
  }
};

exports.filterOptions = async (req, res, next) => {
  try {
    const { rollType, contactType, matchStatus, municipalWard } = req.query;
    const definition = optionDefinitions[req.query.field];
    if (!definition) return res.status(400).json({ message: 'Invalid filter field' });
    const filter = applyMemberScope(req.currentUser, {});
    const selectedRoll = String(rollType || "assembly").toLowerCase();
    if (contactType !== "personal") {
      if (selectedRoll === "assembly") {
        filter.$and = [...(filter.$and || []), { $or: [
          { hasAssemblyMembership: true },
          { hasAssemblyMembership: { $exists: false }, assemblyNumber: { $nin: ["", null] } },
        ] }];
      } else if (selectedRoll === "municipal") {
        filter.hasMunicipalMembership = true;
      }
      if (matchStatus === "both") {
        filter.hasAssemblyMembership = true;
        filter.hasMunicipalMembership = true;
      } else if (matchStatus === "assembly_only") {
        filter.$and = [...(filter.$and || []), { $or: [
          { hasAssemblyMembership: true },
          { hasAssemblyMembership: { $exists: false }, assemblyNumber: { $nin: ["", null] } },
        ] }, { hasMunicipalMembership: { $ne: true } }];
      } else if (matchStatus === "municipal_only") {
        filter.hasMunicipalMembership = true;
        filter.hasAssemblyMembership = { $ne: true };
      }
      if (municipalWard) filter.municipalWardNumbers = String(municipalWard).trim();
    }
    for (const key of [
      'assemblyNumber', 'assemblyName', 'partNumber', 'sectionNumber', 'sectionName',
      'village', 'gramPanchayat', 'tehsil', 'municipality', 'caste',
      'occupation', 'organizationPost', 'supportLevel', 'verificationStatus', 'gender',
    ]) addOptionFilter(filter, key, req.query[key]);
    if (req.query.missingMobile === 'true') filter.$and = [...(filter.$and || []), { $or: [{ mobile: '' }, { mobile: null }, { mobile: { $exists: false } }] }];
    if (req.query.missingHouse === 'true') filter.$and = [...(filter.$and || []), { $or: [{ houseNumber: '' }, { houseNumber: null }, { houseNumber: { $exists: false } }] }];

    const search = String(req.query.q || '').trim();
    const groupId = definition.group || `$${definition.field}`;
    const nonEmpty = definition.match || { [definition.field]: { $nin: ['', null] } };
    const rows = await Member.aggregate([
      { $match: { ...filter, ...nonEmpty } },
      { $group: { _id: groupId, count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
      { $limit: 500 },
    ]);
    const normalizedSearch = search.toLocaleLowerCase('hi-IN');
    const items = rows.map((row) => definition.option
      ? definition.option(row._id || {}, row.count)
      : ({ value: String(row._id), label: String(row._id), count: row.count, filters: { [definition.field]: String(row._id) } }))
      .filter((item) => item.value && (!normalizedSearch || item.label.toLocaleLowerCase('hi-IN').includes(normalizedSearch)))
      .sort((a, b) => {
        if (!normalizedSearch) return compareLabels(a, b);
        const aStarts = a.label.toLocaleLowerCase('hi-IN').startsWith(normalizedSearch);
        const bStarts = b.label.toLocaleLowerCase('hi-IN').startsWith(normalizedSearch);
        if (aStarts !== bStarts) return aStarts ? -1 : 1;
        return compareLabels(a, b);
      })
      .slice(0, Math.min(Math.max(Number(req.query.limit) || 80, 1), 200));
    res.json({ items });
  } catch (error) { next(error); }
};
exports.suggestions = async (req, res, next) => {
  try {
    const scope = applyMemberScope(req.currentUser, {});
    const { q = '' } = req.query;
    const matcher = q ? new RegExp(q, 'i') : /.*/;
    const [sections, locations, assemblies] = await Promise.all([
      Member.distinct('sectionName', { ...scope, sectionName: matcher }),
      Member.distinct('location', { ...scope, location: matcher }),
      Member.distinct('assemblyName', { ...scope, assemblyName: matcher }),
    ]);
    res.json({
      sections: sections.filter(Boolean).slice(0, 30),
      locations: locations.filter(Boolean).slice(0, 30),
      assemblies: assemblies.filter(Boolean).slice(0, 30),
    });
  } catch (error) {
    next(error);
  }
};

exports.locationReviews = async (req, res, next) => {
  try {
    const status = String(req.query.status || 'pending');
    const statusFilter = status === 'all'
      ? { $in: ['suggested', 'unmatched', 'rejected'] }
      : status === 'rejected' ? 'rejected' : { $in: ['suggested', 'unmatched'] };
    const filter = { 'locationResolution.status': statusFilter };
    const q = String(req.query.q || '').trim();
    if (q) {
      const regex = searchRegex(q);
      filter.$or = [
        { name: regex }, { voterId: regex }, { village: regex }, { gramPanchayat: regex }, { pinCode: regex },
        { 'locationResolution.raw.village': regex }, { 'locationResolution.raw.pinCode': regex },
        { 'locationResolution.suggested.village': regex }, { 'locationResolution.suggested.pinCode': regex },
      ];
    }
    const items = await Member.find(filter)
      .select('name voterId guardianName houseNumber photo tehsil gramPanchayat village pinCode locationMatchConfidence locationResolution verificationStatus')
      .sort({ locationMatchConfidence: 1, updatedAt: -1 })
      .limit(Math.min(Number(req.query.limit) || 200, 500))
      .lean();
    res.json(items);
  } catch (error) { next(error); }
};

exports.resolveLocationReview = async (req, res, next) => {
  try {
    const member = await Member.findById(req.params.id);
    if (!member) return res.status(404).json({ message: 'Voter not found.' });
    const decision = String(req.body.decision || '').toLowerCase();
    const resolution = member.locationResolution?.toObject?.() || member.locationResolution || {};
    if (decision === 'reject') {
      member.locationResolution = {
        ...resolution,
        status: 'rejected',
        reviewNote: String(req.body.note || '').trim(),
        verifiedBy: req.currentUser._id,
        verifiedAt: new Date(),
      };
    } else if (decision === 'verify') {
      const suggested = resolution.suggested || {};
      const verified = {
        tehsil: String(req.body.tehsil ?? suggested.tehsil ?? member.tehsil ?? '').trim(),
        gramPanchayat: String(req.body.gramPanchayat ?? suggested.gramPanchayat ?? member.gramPanchayat ?? '').trim(),
        village: String(req.body.village ?? suggested.village ?? member.village ?? '').trim(),
        pinCode: String(req.body.pinCode ?? suggested.pinCode ?? member.pinCode ?? '').trim(),
      };
      if (!verified.village && !verified.gramPanchayat) {
        return res.status(400).json({ message: 'Village or gram panchayat is required for verification.' });
      }
      Object.assign(member, verified);
      member.locationResolution = {
        ...resolution,
        verified,
        status: 'verified',
        reviewNote: String(req.body.note || '').trim(),
        verifiedBy: req.currentUser._id,
        verifiedAt: new Date(),
      };
    } else {
      return res.status(400).json({ message: 'Decision must be verify or reject.' });
    }
    member.updatedBy = req.currentUser._id;
    await member.save();
    res.json(member);
  } catch (error) { next(error); }
};
exports.get = async (req, res, next) => {
  try {
    const member = await Member.findById(req.params.id).populate(populate);
    if (!member) return res.status(404).json({ message: 'Member not found' });
    assertBoothAccess(req.currentUser, member.booth?._id || member.booth);
    assertWardAccess(req.currentUser, member.ward?._id || member.ward);
    const memberships = await ElectoralMembership.find({ member: member._id })
      .populate("electoralList", "type name year municipality wardNumber assemblyNumber assemblyName partNumber status")
      .lean();
    const masked = maskMemberMobile(member, req.currentUser);
    const payload = masked.toObject ? masked.toObject() : masked;
    res.json({ ...payload, electoralMemberships: memberships });
  } catch (error) {
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try { requirePermission(req.currentUser, 'canEditVoters'); } catch (error) { return next(error); }
  try {
    const member = await Member.findById(req.params.id);
    if (!member) return res.status(404).json({ message: 'Member not found' });
    assertBoothAccess(req.currentUser, member.booth);
    assertWardAccess(req.currentUser, member.ward);
    if (req.body.booth) assertBoothAccess(req.currentUser, req.body.booth);
    if (req.body.ward) assertWardAccess(req.currentUser, req.body.ward);
    const before = member.toObject();
    const updates = { ...req.body };
    if (req.currentUser.role !== 'admin') delete updates.isFavorite;
    if (req.currentUser.role === 'booth' && member.contactType !== 'personal') {
      const protectedVoterFields = [
        'name', 'surname', 'guardianName', 'relationType', 'gender', 'age',
        'voterId', 'voterSerial', 'houseNumber', 'assemblyNumber',
        'assemblyName', 'partNumber', 'partName', 'sectionNumber',
        'sectionName', 'tehsil', 'gramPanchayat', 'village', 'district',
        'pinCode', 'verificationStatus',
      ];
      const changedField = protectedVoterFields.find((field) =>
        Object.prototype.hasOwnProperty.call(updates, field)
        && String(updates[field] ?? '').trim() !== String(member[field] ?? '').trim());
      if (changedField) {
        return res.status(403).json({
          message: 'PDF voter-list fields केवल admin review से बदले जा सकते हैं।',
          field: changedField,
        });
      }
      for (const field of protectedVoterFields) delete updates[field];
    }
    // OCR provenance is server-owned; admins verify through the normal status field.
    delete updates.locationResolution;
    delete updates.ocrValues;
    if (updates.contactType && updates.contactType !== member.contactType) {
      return res.status(400).json({ message: 'Contact type cannot be changed after creation.' });
    }
    updates.contactType = member.contactType || 'voter';
    removeBlankObjectRefs(updates);
    assertPersonalContactAllowed(req.currentUser, updates);
    if (isPersonalContact(updates) && !String(updates.mobile || member.mobile || '').trim() && !String(updates.address || member.address || '').trim()) {
      const err = new Error('Personal contact ke liye mobile ya address me se ek zaroori hai.');
      err.status = 400;
      throw err;
    }
    await attachBoothWard(updates, req.currentUser);
    if (updates.booth) assertBoothAccess(req.currentUser, updates.booth);
    if (updates.ward) assertWardAccess(req.currentUser, updates.ward);
    if (updates.voterId && requireValidEpic(updates.voterId) !== member.voterId) {
      return res.status(409).json({ message: 'EPIC नंबर स्थायी है और बदला नहीं जा सकता।' });
    }
    delete updates.voterId;
    Object.assign(member, updates);
    if (Object.prototype.hasOwnProperty.call(updates, 'profileCompletionStatus')) {
      if (updates.profileCompletionStatus === 'complete') {
        member.profileCompletedBy = req.currentUser._id;
        member.profileCompletedAt = new Date();
      } else {
        member.profileCompletedBy = undefined;
        member.profileCompletedAt = undefined;
      }
    }
    if (updates.verificationStatus === 'verified' && req.currentUser.role === 'admin') {
      const currentResolution = member.locationResolution?.toObject?.() || member.locationResolution || {};
      const verifiedSnapshot = {
        tehsil: String(member.tehsil || '').trim(),
        gramPanchayat: String(member.gramPanchayat || '').trim(),
        village: String(member.village || '').trim(),
        pinCode: String(member.pinCode || '').trim(),
      };
      member.ocrValues = {
        raw: member.ocrValues?.raw || {},
        suggested: member.ocrValues?.suggested || {},
        verified: {
          name: String(member.name || '').trim(),
          guardianName: String(member.guardianName || '').trim(),
          houseNumber: String(member.houseNumber || '').trim(),
          age: member.age ?? null,
          gender: member.gender || '',
          voterId: member.voterId || '',
          voterSerial: String(member.voterSerial || '').trim(),
        },
        status: Object.keys(member.ocrValues?.suggested || {}).length ? 'verified' : 'manual',
        verifiedBy: req.currentUser._id,
        verifiedAt: new Date(),
      };
      member.locationResolution = {
        ...currentResolution,
        raw: currentResolution.raw || {},
        suggested: currentResolution.suggested || {},
        verified: verifiedSnapshot,
        status: currentResolution.suggested?.village ? 'verified' : 'manual',
        confidence: currentResolution.confidence || member.locationMatchConfidence || 0,
        verifiedBy: req.currentUser._id,
        verifiedAt: new Date(),
      };
    }
    if (req.file) {
      requirePermission(req.currentUser, 'canEditPhoto');
      member.photo = await persistLocalImage(req.file.path, req.currentUser._id, true);
    }
    member.updatedBy = req.currentUser._id;
    member.duplicateWarnings = await duplicateWarnings(member, member._id);
    if (member.duplicateWarnings.length && member.verificationStatus !== 'verified') member.verificationStatus = 'duplicate';
    await member.save();
    await syncMemberFamily(member, req.currentUser._id);
    await writeActivity({ req, action: 'member.updated', module: 'members', entityId: member._id, before, after: member });
    invalidateMemberData();
    res.json(await Member.findById(member._id).populate(populate));
  } catch (error) {
    next(error);
  }
};

exports.remove = async (req, res, next) => {
  try { requirePermission(req.currentUser, 'canDeleteVoters'); } catch (error) { return next(error); }
  try {
    const member = await Member.findById(req.params.id);
    if (!member) return res.status(404).json({ message: 'Member not found' });
    const isOwner = String(member.createdBy) === String(req.currentUser._id);
    if (!isOwner) {
      assertBoothAccess(req.currentUser, member.booth);
      assertWardAccess(req.currentUser, member.ward);
    }
    await removeMemberFromFamilies(member._id, req.currentUser._id);
    await member.deleteOne();
    await writeActivity({ req, action: 'member.deleted', module: 'members', entityId: member._id, before: member });
    invalidateMemberData();
    res.json({ message: 'Deleted' });
  } catch (error) {
    next(error);
  }
};

exports.removeAll = async (req, res, next) => {
  try { requirePermission(req.currentUser, 'canDeleteVoters'); } catch (error) { return next(error); }
  try {
    if (req.body?.confirmation !== 'DELETE ALL VOTERS') {
      return res.status(400).json({ message: 'Bulk delete confirmation is invalid.' });
    }
    const [members, families] = await Promise.all([
      Member.deleteMany({}),
      Family.deleteMany({}),
    ]);
    await writeActivity({
      req,
      action: 'members.bulk_deleted',
      module: 'members',
      after: { members: members.deletedCount, families: families.deletedCount },
    });
    invalidateMemberData();
    res.json({
      message: 'All voter and family data deleted.',
      deletedMembers: members.deletedCount,
      deletedFamilies: families.deletedCount,
    });
  } catch (error) {
    next(error);
  }
};

exports.bulkDelete = async (req, res, next) => {
  try { requirePermission(req.currentUser, 'canDeleteVoters'); } catch (error) { return next(error); }
  try {
    const rawIds = req.body?.ids || req.query?.ids;
    const ids = Array.isArray(rawIds)
      ? rawIds.map((id) => String(id).trim()).filter(Boolean)
      : String(rawIds || '').split(',').map((id) => id.trim()).filter(Boolean);
    if (!ids.length) {
      return res.status(400).json({ message: 'No member IDs provided for deletion.' });
    }
    const validObjectIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));
    if (!validObjectIds.length) {
      return res.json({ message: 'No valid member IDs provided for deletion.', deletedCount: 0, deletedIds: [] });
    }
    let scopeFilter = { _id: { $in: validObjectIds } };
    if (req.currentUser?.role === 'booth') {
      const boothId = req.currentUser.assignedBooth?._id || req.currentUser.assignedBooth;
      scopeFilter = {
        _id: { $in: validObjectIds },
        $or: [{ booth: boothId }, { createdBy: req.currentUser._id }],
      };
    } else if (req.currentUser?.role === 'ward_head') {
      const wardId = req.currentUser.assignedWard?._id || req.currentUser.assignedWard;
      scopeFilter = {
        _id: { $in: validObjectIds },
        $or: [{ ward: wardId }, { createdBy: req.currentUser._id }],
      };
    }

    const membersToDelete = await Member.find(scopeFilter).select('_id booth ward');
    const deleteIds = membersToDelete.map((m) => m._id);
    const deleteIdStrings = deleteIds.map((id) => String(id));
    if (!deleteIds.length) {
      return res.json({ message: 'No matching members found to delete.', deletedCount: 0, deletedIds: [] });
    }
    const [deletedResult] = await Promise.all([
      Member.deleteMany({ _id: { $in: deleteIds } }),
      Family.updateMany(
        { members: { $in: deleteIds } },
        { $pull: { members: { $in: deleteIds } }, $set: { updatedBy: req.currentUser._id } },
      ),
    ]);
    await Family.deleteMany({ members: { $size: 0 } });
    await writeActivity({
      req,
      action: 'members.bulk_deleted',
      module: 'members',
      after: { ids: deleteIdStrings, count: deletedResult.deletedCount },
    });
    invalidateMemberData();
    res.json({
      message: `${deletedResult.deletedCount} members deleted successfully.`,
      deletedCount: deletedResult.deletedCount,
      deletedIds: deleteIdStrings,
    });
  } catch (error) {
    next(error);
  }
};

exports.birthdays = async (req, res, next) => {
  try {
    const now = new Date();
    const month = now.getMonth() + 1;
    const filter = applyMemberScope(req.currentUser, {
      $expr: { $eq: [{ $month: '$dob' }, month] },
    });
    res.json(await Member.find(filter).populate(populate).sort({ dob: 1 }));
  } catch (error) {
    next(error);
  }
};

exports.duplicates = async (req, res, next) => {
  try {
    const scope = applyMemberScope(req.currentUser, {});
    const mobile = await Member.aggregate([
      { $match: { ...scope, mobile: { $ne: null } } },
      { $group: { _id: '$mobile', count: { $sum: 1 }, members: { $push: '$_id' } } },
      { $match: { count: { $gt: 1 } } },
    ]);
    const address = await Member.aggregate([
      { $match: { ...scope, address: { $nin: [null, ''] } } },
      { $group: { _id: '$address', count: { $sum: 1 }, members: { $push: '$_id' } } },
      { $match: { count: { $gt: 1 } } },
    ]);
    res.json({ mobile, address });
  } catch (error) {
    next(error);
  }
};

exports.filterOptions = async (req, res, next) => {
  try {
    const { field = 'sectionName', q = '', limit = 160 } = req.query;
    const scope = applyMemberScope(req.currentUser, {});

    let dbField = field;
    if (field === 'section') dbField = 'sectionName';
    if (field === 'part' || field === 'booth') dbField = 'partNumber';
    if (field === 'assembly') dbField = 'assemblyName';

    const matchQuery = { ...scope };
    if (q && String(q).trim()) {
      matchQuery[dbField] = { $regex: String(q).trim(), $options: 'i' };
    } else {
      matchQuery[dbField] = { $nin: [null, ''] };
    }

    const items = await Member.aggregate([
      { $match: matchQuery },
      { $group: { _id: `$${dbField}`, count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
      { $limit: parseInt(limit, 10) || 160 },
      {
        $project: {
          _id: 0,
          label: '$_id',
          value: '$_id',
          count: 1,
          filters: { [dbField]: '$_id' },
        },
      },
    ]);

    res.json({ items, total: items.length });
  } catch (error) {
    next(error);
  }
};


exports.suggestions = async (req, res, next) => {
  try {
    const { q = '' } = req.query;
    if (!q || !String(q).trim()) return res.json({ suggestions: [] });
    const scope = applyMemberScope(req.currentUser, {
      $or: [
        { name: { $regex: String(q).trim(), $options: 'i' } },
        { voterId: { $regex: String(q).trim(), $options: 'i' } },
        { houseNumber: { $regex: String(q).trim(), $options: 'i' } },
      ],
    });
    const members = await Member.find(scope).select('name voterId houseNumber age gender').limit(20).lean();
    res.json({ suggestions: members });
  } catch (error) {
    next(error);
  }
};
