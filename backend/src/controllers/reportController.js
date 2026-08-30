const Member = require('../models/Member');
const Booth = require('../models/Booth');
const Ward = require('../models/Ward');
const Activity = require('../models/Activity');
const Family = require('../models/Family');
const { applyMemberScope } = require('../utils/boothAccess');
const { reportCache } = require('../utils/dataCache');

exports.dashboard = async (req, res, next) => {
  try {
    const user = req.currentUser;
    const cacheKey = [
      'dashboard',
      String(user._id),
      user.role,
      String(user.assignedBooth?._id || user.assignedBooth || ''),
      String(user.assignedWard?._id || user.assignedWard || ''),
    ].join(':');
    const payload = await reportCache.getOrSet(cacheKey, async () => {
      const scope = applyMemberScope(req.currentUser, { contactType: { $ne: 'personal' } });
    const familyScope = req.currentUser.role === 'admin'
      ? {}
      : { booth: req.currentUser.assignedBooth?._id || req.currentUser.assignedBooth };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [members, families, booths, wards, support, verification, recentActivity,
      missingMobile, missingHouseNumber, createdToday, updatedToday,
      villageDistribution, assemblies] = await Promise.all([
      Member.countDocuments(scope),
      Family.countDocuments(familyScope),
      req.currentUser.role === 'admin' ? Booth.countDocuments() : 1,
      req.currentUser.role === 'admin' ? Ward.countDocuments() : Ward.countDocuments({ _id: req.currentUser.assignedBooth?.ward }),
      Member.aggregate([{ $match: scope }, { $group: { _id: '$supportLevel', count: { $sum: 1 } } }]),
      Member.aggregate([{ $match: scope }, { $group: { _id: '$verificationStatus', count: { $sum: 1 } } }]),
      Activity.find(req.currentUser.role === 'admin' ? {} : { actor: req.currentUser._id }).populate('actor').sort({ createdAt: -1 }).limit(10),
      Member.countDocuments({ ...scope, $or: [{ mobile: '' }, { mobile: null }, { mobile: { $exists: false } }] }),
      Member.countDocuments({ ...scope, $or: [{ houseNumber: '' }, { houseNumber: null }, { houseNumber: { $exists: false } }] }),
      Member.countDocuments({ ...scope, createdAt: { $gte: today } }),
      Member.countDocuments({ ...scope, updatedAt: { $gte: today }, createdAt: { $lt: today } }),
      Member.aggregate([
        { $match: { ...scope, village: { $nin: ['', null] } } },
        { $group: { _id: '$village', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),
      Member.aggregate([
        { $match: { ...scope, assemblyName: { $nin: ['', null] } } },
        { $group: { _id: { name: '$assemblyName', number: '$assemblyNumber' }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 1 },
      ]),
    ]);
      return {
        members, families, booths, wards, support, verification, recentActivity,
      missingMobile, missingHouseNumber, createdToday, updatedToday,
      villageDistribution,
      assembly: assemblies[0] || null,
      assignedBooth: req.currentUser.role === 'booth'
        ? req.currentUser.assignedBooth || null
          : null,
      };
    });
    res.set('Cache-Control', 'private, no-cache');
    res.json(payload);
  } catch (e) { next(e); }
};
