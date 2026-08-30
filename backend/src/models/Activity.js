const mongoose = require('mongoose');

const ActivitySchema = new mongoose.Schema({
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  action: { type: String, required: true },
  module: String,
  entityId: String,
  before: Object,
  after: Object,
  ip: String,
  userAgent: String,
}, { timestamps: true });

module.exports = mongoose.model('Activity', ActivitySchema);
