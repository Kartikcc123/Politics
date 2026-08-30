const ElectoralList = require('../models/ElectoralList');
const Member = require('../models/Member');

const assemblyFilter = () => ({ $or: [
  { hasAssemblyMembership: true },
  { hasAssemblyMembership: { $exists: false }, assemblyNumber: { $nin: ['', null] } },
] });

exports.list = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.type) filter.type = req.query.type;
    if (req.query.wardNumber) filter.wardNumber = String(req.query.wardNumber);
    res.json(await ElectoralList.find(filter).sort({ createdAt: -1 }).lean());
  } catch (error) { next(error); }
};

exports.summary = async (req, res, next) => {
  try {
    const wardNumber = String(req.query.wardNumber || '').trim();
    const municipal = { hasMunicipalMembership: true };
    if (wardNumber) municipal.municipalWardNumbers = wardNumber;
    const assembly = assemblyFilter();
    const [assemblyCount, municipalCount, both, municipalOnly, assemblyOnly] = await Promise.all([
      Member.countDocuments(assembly),
      Member.countDocuments(municipal),
      Member.countDocuments({ $and: [assembly, municipal] }),
      Member.countDocuments({ ...municipal, hasAssemblyMembership: { $ne: true } }),
      Member.countDocuments({ $and: [assembly, { hasMunicipalMembership: { $ne: true } }] }),
    ]);
    res.json({ assembly: assemblyCount, municipal: municipalCount, both, municipalOnly, assemblyOnly, wardNumber });
  } catch (error) { next(error); }
};
