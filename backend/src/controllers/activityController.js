const Activity = require('../models/Activity');

exports.list = async (req, res, next) => {
  try {
    const filter = req.currentUser.role === 'admin' ? {} : { actor: req.currentUser._id };
    res.json(await Activity.find(filter).populate('actor').sort({ createdAt: -1 }).limit(200));
  } catch (e) { next(e); }
};
