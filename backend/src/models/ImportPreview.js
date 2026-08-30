const mongoose = require('mongoose');

const ImportPreviewSchema = new mongoose.Schema({
  filename: String,
  filePath: { type: String, required: true },
  headers: [String],
  sampleRows: [mongoose.Schema.Types.Mixed],
  rowCount: Number,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  expiresAt: { type: Date, required: true, expires: 0 },
}, { timestamps: true });

module.exports = mongoose.model('ImportPreview', ImportPreviewSchema);
