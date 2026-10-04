const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ['admin', 'ward_head', 'booth', 'worker', 'user'], default: 'user' },
  assignedWard: { type: mongoose.Schema.Types.ObjectId, ref: 'Ward' },
  assignedBooth: { type: mongoose.Schema.Types.ObjectId, ref: 'Booth' },
  assignedGramPanchayats: [{ type: String, trim: true }],
  assignedVillages: [{ type: String, trim: true }],
  assignedWards: [{ type: String, trim: true }],
  assignedParts: [{ type: String, trim: true }],
  assignedVoterId: { type: String, trim: true },
  phone: String,
  active: { type: Boolean, default: true },
  permissions: {
    canPrintProfiles: { type: Boolean, default: false },
    canExportData: { type: Boolean, default: false },
    canViewFullMobile: { type: Boolean, default: true },
    canBackup: { type: Boolean, default: false },
    canViewReports: { type: Boolean, default: true },
    canImportData: { type: Boolean, default: false },
    canUploadPdf: { type: Boolean, default: false },
    canCreateVoters: { type: Boolean, default: true },
    canEditVoters: { type: Boolean, default: true },
    canEditEpic: { type: Boolean, default: false },
    canEditParty: { type: Boolean, default: true },
    canEditAnubhag: { type: Boolean, default: true },
    canMarkVoted: { type: Boolean, default: true },
    canEditPhoto: { type: Boolean, default: true },
    canDeleteVoters: { type: Boolean, default: false },
  },
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);

