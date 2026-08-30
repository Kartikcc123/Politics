const mongoose = require('mongoose');

const ElectoralListSchema = new mongoose.Schema({
  type: { type: String, enum: ['assembly', 'municipal', 'gram_panchayat'], required: true, index: true },
  name: { type: String, trim: true, default: '' },
  year: { type: Number, index: true },
  revision: { type: String, trim: true, default: '' },
  assemblyNumber: { type: String, trim: true, default: '' },
  assemblyName: { type: String, trim: true, default: '' },
  municipality: { type: String, trim: true, default: '' },
  gramPanchayat: { type: String, trim: true, default: '' },
  village: { type: String, trim: true, default: '' },
  wardNumber: { type: String, trim: true, default: '' },
  partNumber: { type: String, trim: true, default: '' },
  pollingStation: { type: String, trim: true, default: '' },
  sourceFile: { type: String, trim: true, default: '' },
  sourceHash: { type: String, trim: true, index: true },
  status: { type: String, enum: ['processing', 'completed', 'failed'], default: 'processing', index: true },
  counts: {
    total: { type: Number, default: 0 },
    imported: { type: Number, default: 0 },
    matched: { type: Number, default: 0 },
    wardOnly: { type: Number, default: 0 },
    review: { type: Number, default: 0 },
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

ElectoralListSchema.index({ type: 1, municipality: 1, wardNumber: 1, year: 1 });

module.exports = mongoose.model('ElectoralList', ElectoralListSchema);
