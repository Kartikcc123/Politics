const Member = require('../models/Member');
const { applyMemberScope } = require('../utils/boothAccess');

const monthDayExpr = (field) => ({
  $expr: {
    $and: [
      { $eq: [{ $month: `$${field}` }, { $month: new Date() }] },
      { $eq: [{ $dayOfMonth: `$${field}` }, { $dayOfMonth: new Date() }] },
    ],
  },
});

exports.today = async (req, res, next) => {
  try {
    const scope = applyMemberScope(req.currentUser, {});
    const daysAhead = Math.min(Math.max(Number(req.query.days) || 0, 0), 30);

    if (daysAhead === 0) {
      const birthdays = await Member.find({ ...scope, ...monthDayExpr('dob') }).populate('party ward booth').lean();
      const anniversaries = await Member.find({ ...scope, ...monthDayExpr('anniversary') }).populate('party ward booth').lean();
      return res.json({ birthdays, anniversaries, count: birthdays.length + anniversaries.length });
    }

    // Fetch members with DOB or Anniversary defined to calculate upcoming dates in JS
    const members = await Member.find({
      ...scope,
      $or: [{ dob: { $ne: null } }, { anniversary: { $ne: null } }],
    }).populate('party ward booth').lean();

    const today = new Date();
    const currentYear = today.getFullYear();

    const isUpcoming = (dateVal) => {
      if (!dateVal) return false;
      const d = new Date(dateVal);
      let target = new Date(currentYear, d.getMonth(), d.getDate());
      if (target < new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
        target = new Date(currentYear + 1, d.getMonth(), d.getDate());
      }
      const diffTime = target - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= daysAhead;
    };

    const birthdays = members.filter((m) => isUpcoming(m.dob));
    const anniversaries = members.filter((m) => isUpcoming(m.anniversary));

    res.json({
      birthdays,
      anniversaries,
      count: birthdays.length + anniversaries.length,
      daysAhead,
    });
  } catch (e) { next(e); }
};
