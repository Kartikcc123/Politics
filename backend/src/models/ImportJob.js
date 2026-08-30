const mongoose = require('mongoose');

const ImportJobSchema = new mongoose.Schema({
  uploadId: { type: String, required: true, unique: true, index: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  status: { type: String, enum: ['waiting', 'uploading', 'processing', 'completed', 'failed'], default: 'waiting' },
  stage: { type: String, default: 'Waiting for upload' },
  uploadBytes: { type: Number, default: 0 },
  uploadTotalBytes: { type: Number, default: 0 },
  ocrPagesProcessed: { type: Number, default: 0 },
  ocrPagesTotal: { type: Number, default: 0 },
  ocrCardsProcessed: { type: Number, default: 0 },
  ocrCardsTotal: { type: Number, default: 0 },
  processed: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  imported: { type: Number, default: 0 },
  skipped: { type: mongoose.Schema.Types.Mixed, default: 0 },
  result: mongoose.Schema.Types.Mixed,
  expiresAt: { type: Date, default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), index: { expires: 0 } },
}, { timestamps: true });

module.exports = mongoose.model('ImportJob', ImportJobSchema);
