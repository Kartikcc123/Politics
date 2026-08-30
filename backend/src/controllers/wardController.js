const Ward = require('../models/Ward');
const { invalidateMemberData } = require('../utils/dataCache');

exports.list = async (req, res, next) => {
  try { res.json(await Ward.find().populate('wardHead').sort({ number: 1 })); } catch (e) { next(e); }
};
exports.create = async (req, res, next) => {
  try { const ward = await Ward.create(req.body); invalidateMemberData(); res.status(201).json(ward); } catch (e) { next(e); }
};
exports.update = async (req, res, next) => {
  try { const ward = await Ward.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('wardHead'); invalidateMemberData(); res.json(ward); } catch (e) { next(e); }
};
exports.remove = async (req, res, next) => {
  try { await Ward.findByIdAndDelete(req.params.id); invalidateMemberData(); res.json({ message: 'Deleted' }); } catch (e) { next(e); }
};
