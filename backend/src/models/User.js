const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ['admin', 'ward_head', 'booth'], default: 'booth' },
  assignedWard: { type: mongoose.Schema.Types.ObjectId, ref: 'Ward' },
  assignedBooth: { type: mongoose.Schema.Types.ObjectId, ref: 'Booth' },
  phone: String,
  active: { type: Boolean, default: true },
  permissions: {
    canPrintProfiles: { type: Boolean, default: false },
    canExportData: { type: Boolean, default: false },
    canViewFullMobile: { type: Boolean, default: false },
    canBackup: { type: Boolean, default: false },
    canViewReports: { type: Boolean, default: false },
    canImportData: { type: Boolean, default: false },
    canCreateVoters: { type: Boolean, default: true },
    canEditVoters: { type: Boolean, default: true },
    canEditPhoto: { type: Boolean, default: true },
    canDeleteVoters: { type: Boolean, default: false },
  },
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);

