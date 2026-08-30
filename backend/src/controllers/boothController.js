const Booth = require('../models/Booth');
const Ward = require('../models/Ward');
const Member = require('../models/Member');
const { invalidateMemberData } = require('../utils/dataCache');

const isObjectId = (value) => /^[a-f\d]{24}$/i.test(String(value || ''));
const locationKey = (value) => String(value || '')
  .normalize('NFKC')
  .toLocaleLowerCase('hi-IN')
  .replace(/[\u0900-\u0903\u093a-\u094c\u094e-\u0957\u0962\u0963]/g, '')
  .replace(/[^\p{L}\p{N}]+/gu, '');
const cleanerLocationName = (left, right) => {
  const score = (value) => (String(value).match(/[\u0900-\u0903]/g) || []).length;
  return score(right) < score(left) ? right : left;
};
const resolveWard = async (value) => {
  if (!value || isObjectId(value)) return value;
  const text = String(value).trim();
  const ward = await Ward.findOne({
    $or: [
      { number: text },
      { name: new RegExp(`^${text}$`, 'i') },
    ],
  });
  return ward?._id;
};

exports.list = async (req, res, next) => {
  try {
    const filter = req.currentUser.role === 'booth' ? { _id: req.currentUser.assignedBooth?._id } : {};
    const booths = await Booth.find(filter).populate('ward').sort({ number: 1 }).lean();
    const ids = booths.map((booth) => booth._id);
    const members = ids.length
      ? await Member.find({ booth: { $in: ids } }).select('booth assemblyNumber assemblyName partNumber sectionNumber sectionName village gramPanchayat').lean()
      : [];
    const byBooth = new Map();
    for (const member of members) {
      const key = String(member.booth || '');
      if (!byBooth.has(key)) byBooth.set(key, {
        memberCount: 0,
        villages: new Set(),
        sectionNames: new Set(),
        hierarchy: new Map(),
      });
      const summary = byBooth.get(key);
      summary.memberCount += 1;
      const village = String(member.village || member.gramPanchayat || '').trim();
      const sectionName = String(member.sectionName || '').trim();
      if (village) summary.villages.add(village);
      if (sectionName) summary.sectionNames.add(sectionName);
      const assemblyName = String(member.assemblyName || '').trim();
      if (assemblyName && village && sectionName) {
        const hierarchyKey = [
          locationKey(assemblyName),
          locationKey(village),
          locationKey(sectionName),
        ].join('\u0000');
        const existing = summary.hierarchy.get(hierarchyKey);
        if (existing) {
          existing.count += 1;
          existing.village = cleanerLocationName(existing.village, village);
          existing.sectionName = cleanerLocationName(existing.sectionName, sectionName);
          if (!existing.sectionNames.includes(sectionName)) {
            existing.sectionNames.push(sectionName);
          }
        } else summary.hierarchy.set(hierarchyKey, {
          assemblyNumber: String(member.assemblyNumber || '').trim(),
          assemblyName,
          partNumber: String(member.partNumber || '').trim(),
          village,
          sectionNumber: String(member.sectionNumber || '').trim(),
          sectionName,
          sectionNames: [sectionName],
          count: 1,
        });
      }
    }
    res.json(booths.map((booth) => {
      const summary = byBooth.get(String(booth._id));
      const villages = [...(summary?.villages || [])];
      const sectionNames = [...(summary?.sectionNames || [])];
      return {
        ...booth,
        memberCount: summary?.memberCount || 0,
        villages,
        sectionNames,
        voterHierarchy: [...(summary?.hierarchy?.values() || [])],
        locationNames: [...villages, ...sectionNames],
      };
    }));
  } catch (e) { next(e); }
};
exports.create = async (req, res, next) => {
  try {
    const data = { ...req.body, ward: await resolveWard(req.body.ward) };
    if (!data.ward) return res.status(400).json({ message: 'Valid ward is required. Use ward number, ward name, or ward ID.' });
    const booth = await Booth.create(data);
    invalidateMemberData();
    res.status(201).json(booth);
  } catch (e) { next(e); }
};
exports.update = async (req, res, next) => {
  try {
    const data = { ...req.body };
    if (data.ward) data.ward = await resolveWard(data.ward);
    if (req.body.ward && !data.ward) return res.status(400).json({ message: 'Valid ward is required. Use ward number, ward name, or ward ID.' });
    const booth = await Booth.findByIdAndUpdate(req.params.id, data, { new: true }).populate('ward');
    invalidateMemberData();
    res.json(booth);
  } catch (e) { next(e); }
};
exports.remove = async (req, res, next) => {
  try { await Booth.findByIdAndDelete(req.params.id); invalidateMemberData(); res.json({ message: 'Deleted' }); } catch (e) { next(e); }
};
