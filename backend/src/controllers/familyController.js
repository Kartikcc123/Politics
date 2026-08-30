const Family = require('../models/Family');
const Member = require('../models/Member');
const { applyMemberScope, assertBoothAccess, assertWardAccess } = require('../utils/boothAccess');
const { invalidateMemberData } = require('../utils/dataCache');

const familyScope = (user, filter = {}) => {
  if (user.role === 'booth') filter.booth = user.assignedBooth?._id || user.assignedBooth;
  if (user.role === 'ward_head') filter.ward = user.assignedWard?._id || user.assignedWard;
  return filter;
};

const normalizeHouseNumber = (value) => String(value || '')
  .trim()
  .replace(/[०-९]/g, (digit) => String('०१२३४५६७८९'.indexOf(digit)))
  .replace(/\s+/g, '')
  .toLowerCase();

const familyGroupingKey = (member) => {
  const houseNumber = normalizeHouseNumber(member.houseNumber);
  if (!houseNumber) return '';
  const section = String(member.sectionNumber || member.sectionName || 'no-section')
    .trim()
    .toLowerCase();
  return `${member.booth || ''}:${section}:${houseNumber}`;
};

exports.list = async (req, res, next) => {
  try {
    const { q, booth, ward, houseNumber, sectionName } = req.query;
    const filter = familyScope(req.currentUser, {});
    if (q) filter.$or = [
      { headName: new RegExp(q, 'i') },
      { houseNumber: new RegExp(q, 'i') },
      { sectionName: new RegExp(q, 'i') },
      { address: new RegExp(q, 'i') },
    ];
    if (houseNumber) filter.houseNumber = new RegExp(houseNumber, 'i');
    if (sectionName) filter.sectionName = new RegExp(sectionName, 'i');
    if (req.currentUser.role === 'admin') {
      if (booth) filter.booth = booth;
      if (ward) filter.ward = ward;
    }
    res.json(await Family.find(filter).populate('familyHead members ward booth').sort({ updatedAt: -1 }));
  } catch (e) { next(e); }
};

exports.summary = async (req, res, next) => {
  try {
    const familyFilter = familyScope(req.currentUser, {});
    const memberFilter = applyMemberScope(req.currentUser, {});
    const [families, totalVoters, missingHouseNumber] = await Promise.all([
      Family.find(familyFilter).select('booth sectionNumber sectionName houseNumber members').lean(),
      Member.countDocuments(memberFilter),
      Member.countDocuments({
        ...memberFilter,
        $or: [
          { houseNumber: '' },
          { houseNumber: null },
          { houseNumber: { $exists: false } },
        ],
      }),
    ]);
    const assignedMembers = new Set(
      families.flatMap((family) => (family.members || []).map(String)),
    );
    const homes = new Set(
      families
        .filter((family) => normalizeHouseNumber(family.houseNumber))
        .map((family) => [
          family.booth || '',
          family.sectionNumber || family.sectionName || 'no-section',
          normalizeHouseNumber(family.houseNumber),
        ].join(':')),
    );
    res.json({
      totalFamilies: families.length,
      totalHomes: homes.size,
      totalMembers: assignedMembers.size,
      totalVoters,
      unassignedVoters: Math.max(0, totalVoters - assignedMembers.size),
      missingHouseNumber,
    });
  } catch (error) { next(error); }
};
exports.create = async (req, res, next) => {
  try {
    const data = { ...req.body, source: 'manual', groupingKey: undefined, createdBy: req.currentUser._id, updatedBy: req.currentUser._id };
    if (req.currentUser.role === 'booth') data.booth = req.currentUser.assignedBooth?._id || req.currentUser.assignedBooth;
    if (req.currentUser.role === 'ward_head') data.ward = req.currentUser.assignedWard?._id || req.currentUser.assignedWard;
    assertBoothAccess(req.currentUser, data.booth);
    assertWardAccess(req.currentUser, data.ward);
    const family = await Family.create(data);
    invalidateMemberData();
    res.status(201).json(family);
  } catch (e) { next(e); }
};

exports.get = async (req, res, next) => {
  try {
    const family = await Family.findById(req.params.id).populate('familyHead members ward booth');
    if (!family) return res.status(404).json({ message: 'Family not found' });
    assertBoothAccess(req.currentUser, family.booth);
    assertWardAccess(req.currentUser, family.ward);
    res.json(family);
  } catch (e) { next(e); }
};

exports.update = async (req, res, next) => {
  try {
    const family = await Family.findById(req.params.id);
    if (!family) return res.status(404).json({ message: 'Family not found' });
    assertBoothAccess(req.currentUser, family.booth);
    assertWardAccess(req.currentUser, family.ward);
    Object.assign(family, req.body, { source: 'manual', groupingKey: undefined, updatedBy: req.currentUser._id });
    await family.save();
    invalidateMemberData();
    res.json(await Family.findById(family._id).populate('familyHead members ward booth'));
  } catch (e) { next(e); }
};

exports.remove = async (req, res, next) => {
  try {
    const family = await Family.findById(req.params.id);
    if (!family) return res.status(404).json({ message: 'Family not found' });
    assertBoothAccess(req.currentUser, family.booth);
    assertWardAccess(req.currentUser, family.ward);
    await family.deleteOne();
    invalidateMemberData();
    res.json({ message: 'Deleted' });
  } catch (e) { next(e); }
};

exports.rebuildFromMembers = async (req, res, next) => {
  try {
    const memberFilter = applyMemberScope(req.currentUser, {});
    const familyFilter = familyScope(req.currentUser, {});
    const members = await Member.find(memberFilter);
    const groups = new Map();
    let skippedMissingHouse = 0;
    for (const member of members) {
      const key = familyGroupingKey(member);
      if (!key) {
        skippedMissingHouse += 1;
        continue;
      }
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(member);
    }

    const generated = [];
    for (const [groupingKey, group] of groups) {
      const head = [...group].sort((a, b) => (Number(b.age) || 0) - (Number(a.age) || 0))[0];
      generated.push({
        source: 'auto',
        groupingKey,
        familyHead: head._id,
        headName: head.name,
        houseNumber: normalizeHouseNumber(head.houseNumber),
        sectionNumber: String(head.sectionNumber || '').trim(),
        sectionName: String(head.sectionName || '').trim(),
        address: head.address,
        ward: head.ward,
        booth: head.booth,
        members: group.map((member) => member._id),
        createdBy: req.currentUser._id,
        updatedBy: req.currentUser._id,
      });
    }

    const session = await Family.startSession();
    await session.withTransaction(async () => {
      await Family.deleteMany(familyFilter, { session });
      if (generated.length) await Family.insertMany(generated, { session });
    });
    await session.endSession();

    invalidateMemberData();
    res.json({
      families: generated.length,
      autoFamilies: generated.length,
      removedFamilies: true,
      assignedMembers: generated.reduce((sum, family) => sum + family.members.length, 0),
      skippedMissingHouse,
    });
  } catch (e) { next(e); }
};
