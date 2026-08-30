const mongoose = require('mongoose');

const BoothSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  number: { type: String, required: true, trim: true },
  ward: { type: mongoose.Schema.Types.ObjectId, ref: 'Ward', required: true },
  area: String,
  address: String,
  active: { type: Boolean, default: true },
}, { timestamps: true });

BoothSchema.index({ ward: 1, number: 1 }, { unique: true });

module.exports = mongoose.model('Booth', BoothSchema);
