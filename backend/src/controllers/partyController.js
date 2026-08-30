const Party = require('../models/Party');

exports.list = async (req, res, next) => {
  try { res.json(await Party.find().sort({ name: 1 })); } catch (e) { next(e); }
};
exports.create = async (req, res, next) => {
  try { res.status(201).json(await Party.create(req.body)); } catch (e) { next(e); }
};
exports.update = async (req, res, next) => {
  try { res.json(await Party.findByIdAndUpdate(req.params.id, req.body, { new: true })); } catch (e) { next(e); }
};
exports.remove = async (req, res, next) => {
  try { await Party.findByIdAndDelete(req.params.id); res.json({ message: 'Deleted' }); } catch (e) { next(e); }
};
