const mongoose = require('mongoose');

const ImportReviewSchema = new mongoose.Schema({
  sourceType: { type: String, enum: ['pdf', 'excel', 'csv'], required: true },
  sourceFile: String,
  reason: { type: String, required: true },
  status: { type: String, enum: ['pending', 'resolved', 'ignored'], default: 'pending' },
  rawData: { type: mongoose.Schema.Types.Mixed, default: {} },
  suggestedData: { type: mongoose.Schema.Types.Mixed, required: true },
  verifiedData: { type: mongoose.Schema.Types.Mixed, default: {} },
  ward: { type: mongoose.Schema.Types.ObjectId, ref: 'Ward' },
  booth: { type: mongoose.Schema.Types.ObjectId, ref: 'Booth' },
  resolvedMember: { type: mongoose.Schema.Types.ObjectId, ref: 'Member' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolvedAt: Date,
}, { timestamps: true });

ImportReviewSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('ImportReview', ImportReviewSchema);
