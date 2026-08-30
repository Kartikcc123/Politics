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
    const birthdays = await Member.find({ ...scope, ...monthDayExpr('dob') }).populate('party ward booth');
    const anniversaries = await Member.find({ ...scope, ...monthDayExpr('anniversary') }).populate('party ward booth');
    res.json({
      birthdays,
      anniversaries,
      count: birthdays.length + anniversaries.length,
    });
  } catch (e) { next(e); }
};
