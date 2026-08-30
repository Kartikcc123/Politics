const Member = require('../models/Member');
const { applyMemberScope } = require('../utils/boothAccess');

exports.dashboard = async (req, res, next) => {
  try {
    const scope = applyMemberScope(req.currentUser, {});
    const [booths, influential, pendingIssues, undecided] = await Promise.all([
      Member.aggregate([
        { $match: scope },
        { $group: {
          _id: '$booth',
          total: { $sum: 1 },
          supporters: { $sum: { $cond: [{ $eq: ['$supportLevel', 'supporter'] }, 1, 0] } },
          undecided: { $sum: { $cond: [{ $in: ['$supportLevel', ['neutral', 'undecided']] }, 1, 0] } },
        } },
        { $addFields: { supportPercent: { $multiply: [{ $divide: ['$supporters', { $max: ['$total', 1] }] }, 100] } } },
        { $sort: { supportPercent: -1 } },
        { $limit: 100 },
        { $lookup: { from: 'booths', localField: '_id', foreignField: '_id', as: 'booth' } },
        { $unwind: { path: '$booth', preserveNullAndEmptyArrays: true } },
      ]),
      Member.find({ ...scope, $or: [{ influenceLevel: 'high' }, { organizationPost: { $nin: [null, ''] } }] })
        .select('name surname mobile voterId village organizationPost influenceLevel supportLevel')
        .sort({ influenceLevel: 1, updatedAt: -1 }).limit(50),
      Member.aggregate([
        { $match: scope },
        { $unwind: '$localIssues' },
        { $match: { 'localIssues.status': { $ne: 'resolved' } } },
        { $group: { _id: '$localIssues.priority', count: { $sum: 1 } } },
      ]),
      Member.find({ ...scope, supportLevel: { $in: ['neutral', 'undecided'] } })
        .select('name surname mobile voterId village booth organizationPost supportLevel')
        .populate('booth').sort({ updatedAt: -1 }).limit(100),
    ]);
    const strongBooths = booths.filter((item) => item.supportPercent >= 60);
    const weakBooths = booths.filter((item) => item.supportPercent < 40);
    res.json({ strongBooths, weakBooths, allBooths: booths, influential, pendingIssues, undecided });
  } catch (error) { next(error); }
};
