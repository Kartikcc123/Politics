const Member = require('../models/Member');
const Family = require('../models/Family');
const Activity = require('../models/Activity');
const { writeActivity } = require('../middleware/activityLogger');

exports.restore = async (req, res, next) => {
  try {
    if (req.body.confirmation !== 'RESTORE BACKUP') {
      return res.status(400).json({ message: 'Restore confirmation is invalid.' });
    }
    const members = Array.isArray(req.body.members) ? req.body.members : [];
    const families = Array.isArray(req.body.families) ? req.body.families : [];
    let restoredMembers = 0;
    for (const item of members) {
      if (!item.voterId) continue;
      const data = { ...item };
      delete data._id;
      await Member.findOneAndUpdate({ voterId: item.voterId }, data, { upsert: true, runValidators: true });
      restoredMembers += 1;
    }
    for (const item of families) {
      const data = { ...item };
      const id = data._id;
      delete data._id;
      if (id) await Family.findByIdAndUpdate(id, data, { upsert: true });
    }
    await writeActivity({
      req,
      action: 'backup.restored',
      module: 'security',
      after: { restoredMembers, restoredFamilies: families.length },
    });
    res.json({ restoredMembers, restoredFamilies: families.length });
  } catch (error) { next(error); }
};

exports.auditSummary = async (req, res, next) => {
  try {
    res.json(await Activity.aggregate([
      { $group: { _id: { module: '$module', action: '$action' }, count: { $sum: 1 }, lastAt: { $max: '$createdAt' } } },
      { $sort: { count: -1 } },
      { $limit: 50 },
    ]));
  } catch (error) { next(error); }
};
