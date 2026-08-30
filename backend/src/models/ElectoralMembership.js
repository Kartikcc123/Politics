const mongoose = require('mongoose');

const ElectoralMembershipSchema = new mongoose.Schema({
  member: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true, index: true },
  electoralList: { type: mongoose.Schema.Types.ObjectId, ref: 'ElectoralList', required: true, index: true },
  type: { type: String, enum: ['assembly', 'municipal', 'gram_panchayat'], required: true, index: true },
  epic: { type: String, trim: true, uppercase: true, default: '', index: true },
  sourceRecordKey: { type: String, trim: true, required: true },
  voterSerial: { type: String, trim: true, default: '' },
  assemblyNumber: { type: String, trim: true, default: '' },
  assemblyName: { type: String, trim: true, default: '' },
  partNumber: { type: String, trim: true, default: '' },
  sectionNumber: { type: String, trim: true, default: '' },
  sectionName: { type: String, trim: true, default: '' },
  municipality: { type: String, trim: true, default: '' },
  gramPanchayat: { type: String, trim: true, default: '' },
  village: { type: String, trim: true, default: '' },
  wardNumber: { type: String, trim: true, default: '' },
  pollingStation: { type: String, trim: true, default: '' },
  sourceValues: { type: mongoose.Schema.Types.Mixed, default: {} },
  sourcePhoto: { type: String, trim: true, default: '' },
  confidence: { type: Number, default: 0 },
  status: { type: String, enum: ['matched', 'source_only', 'review'], default: 'matched', index: true },
}, { timestamps: true });

ElectoralMembershipSchema.index(
  { electoralList: 1, sourceRecordKey: 1 },
  { unique: true, partialFilterExpression: { sourceRecordKey: { $type: 'string' } } },
);
ElectoralMembershipSchema.index({ electoralList: 1, epic: 1 });
ElectoralMembershipSchema.index({ type: 1, wardNumber: 1, member: 1 });

module.exports = mongoose.model('ElectoralMembership', ElectoralMembershipSchema);
