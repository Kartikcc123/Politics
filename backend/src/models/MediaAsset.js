const mongoose = require('mongoose');

const MediaAssetSchema = new mongoose.Schema({
  data: { type: Buffer, required: true, select: false },
  contentType: { type: String, required: true, default: 'image/jpeg' },
  filename: { type: String, trim: true, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('MediaAsset', MediaAssetSchema);
