const mongoose = require('mongoose');

const WardSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  number: { type: String, required: true, trim: true, unique: true },
  area: String,
  wardHead: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  active: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Ward', WardSchema);
