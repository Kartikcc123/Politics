const mongoose = require('mongoose');

const PartySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, unique: true },
  code: { type: String, trim: true },
  color: { type: String, default: '#2563eb' },
  logo: String,
  website: String,
  description: String,
  active: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Party', PartySchema);
