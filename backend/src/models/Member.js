const mongoose = require('mongoose');

const { buildMemberSearchData } = require('../utils/memberSearch');

const FamilyMemberSchema = new mongoose.Schema({
  name: { type: String, trim: true },
  relation: { type: String, trim: true },
  mobile: { type: String, trim: true },
  dob: Date,
  occupation: String,
  education: String,
}, { _id: true });

const VisitSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  outcome: String,
  notes: String,
  visitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { _id: true });

const AttendanceSchema = new mongoose.Schema({
  meetingTitle: String,
  date: Date,
  status: { type: String, enum: ['attended', 'absent', 'invited'], default: 'invited' },
}, { _id: true });

const FollowUpSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  dueAt: { type: Date, required: true },
  type: { type: String, enum: ['call', 'whatsapp', 'visit', 'meeting', 'other'], default: 'call' },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  status: { type: String, enum: ['pending', 'done', 'cancelled'], default: 'pending' },
  notes: String,
  outcome: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  completedAt: Date,
}, { timestamps: true });
const MemberSchema = new mongoose.Schema({
  contactType: { type: String, enum: ['voter', 'personal'], default: 'voter', index: true },
  photo: String,
  qrCode: String,
  name: { type: String, required: true, trim: true },
  surname: { type: String, trim: true },
  mobile: { type: String, trim: true, default: '' },
  altMobile: { type: String, trim: true },
  dob: Date,
  estimatedDob: Date,
  age: Number,
  anniversary: Date,
  gender: { type: String, enum: ['male', 'female', 'other', ''], default: '' },
  address: { type: String, trim: true },
  houseNumber: { type: String, trim: true },
  ocrValues: {
    raw: { type: mongoose.Schema.Types.Mixed, default: {} },
    suggested: { type: mongoose.Schema.Types.Mixed, default: {} },
    verified: { type: mongoose.Schema.Types.Mixed, default: {} },
    status: { type: String, enum: ['raw', 'suggested', 'verified', 'manual'], default: 'raw' },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    verifiedAt: Date,
  },
  ocrConfidence: Number,
  houseNumberConfidence: Number,
  locationMatchConfidence: Number,
  locationResolution: {
    raw: {
      tehsil: String,
      gramPanchayat: String,
      village: String,
      pinCode: String,
      sectionName: String,
    },
    suggested: {
      tehsil: String,
      gramPanchayat: String,
      village: String,
      pinCode: String,
    },
    verified: {
      tehsil: String,
      gramPanchayat: String,
      village: String,
      pinCode: String,
    },
    status: { type: String, enum: ['unmatched', 'suggested', 'verified', 'manual', 'rejected'], default: 'unmatched' },
    confidence: Number,
    matchedAlias: String,
    reviewNote: String,
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    verifiedAt: Date,
  },
  ocrReviewReasons: [{ type: String, trim: true }],
  ocrValidationPassed: Boolean,
  ocrFieldConfidence: {
    name: Number,
    voterId: Number,
    houseNumber: Number,
    age: Number,
    gender: Number,
    guardianName: Number,
  },
  location: { type: String, trim: true },
  area: { type: mongoose.Schema.Types.ObjectId, ref: 'Area' },
  tehsil: { type: String, trim: true },
  postOffice: { type: String, trim: true },
  policeStation: { type: String, trim: true },
  district: { type: String, trim: true },
  pinCode: { type: String, trim: true },
  gramPanchayat: { type: String, trim: true },
  village: { type: String, trim: true },
  municipality: { type: String, trim: true },
  hasAssemblyMembership: { type: Boolean, default: false, index: true },
  hasMunicipalMembership: { type: Boolean, default: false, index: true },
  municipalWardNumbers: [{ type: String, trim: true }],
  caste: { type: String, trim: true },
  subCaste: { type: String, trim: true },
  organizationPost: { type: String, trim: true },
  organizationLevel: { type: String, trim: true },
  influenceLevel: { type: String, enum: ['high', 'medium', 'normal', ''], default: '' },
  whatsappOptIn: { type: Boolean, default: true },
  assemblyNumber: String,
  assemblyName: String,
  partNumber: String,
  partName: { type: String, trim: true },
  sectionNumber: String,
  sectionName: String,
  voterSerial: String,
  voterId: {
    type: String,
    required() { return this.contactType !== 'personal' && !this.hasMunicipalMembership; },
    uppercase: true,
    trim: true,
    immutable: true,
  },
  guardianName: String,
  relationType: { type: String, enum: ['father', 'husband', 'mother', 'other', ''], default: '' },
  geo: {
    lat: Number,
    lng: Number,
  },
  ward: { type: mongoose.Schema.Types.ObjectId, ref: 'Ward' },
  booth: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booth',
    required() { return this.contactType !== 'personal' && !this.hasMunicipalMembership; },
  },
  family: [FamilyMemberSchema],
  occupation: String,
  workplaceState: { type: String, trim: true },
  workplaceCity: { type: String, trim: true },
  workplaceVillage: { type: String, trim: true },
  spouseName: { type: String, trim: true },
  marriageState: { type: String, trim: true },
  marriageCity: { type: String, trim: true },
  marriageVillage: { type: String, trim: true },
  education: String,
  party: { type: mongoose.Schema.Types.ObjectId, ref: 'Party' },
  partyPreference: {
    type: String,
    enum: ['congress', 'bjp', 'nota', 'other', 'undecided'],
    default: 'undecided',
    index: true,
  },
  isFavorite: { type: Boolean, default: false, index: true },
  supportLevel: {
    type: String,
    enum: ['supporter', 'neutral', 'opposite', 'undecided'],
    default: 'undecided',
  },
  notes: String,
  extraDetails: [{
    label: { type: String, trim: true },
    value: { type: String, trim: true },
  }],
  sourceDocument: {
    type: { type: String, enum: ['manual', 'excel', 'csv', 'pdf'], default: 'manual' },
    file: String,
    rawText: String,
    imageExtractionStatus: String,
    ocrCardImage: String,
  },
  localIssues: [{
    title: String,
    status: { type: String, enum: ['open', 'in_progress', 'resolved'], default: 'open' },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    createdAt: { type: Date, default: Date.now },
  }],
  tasks: [{
    title: String,
    dueDate: Date,
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['pending', 'done'], default: 'pending' },
  }],
  visits: [VisitSchema],
  meetingAttendance: [AttendanceSchema],
  verificationStatus: {
    type: String,
    enum: ['pending', 'verified', 'needs_review', 'duplicate'],
    default: 'pending',
  },
  profileCompletionStatus: {
    type: String,
    enum: ['pending', 'complete'],
    default: 'pending',
    index: true,
  },
  profileCompletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  profileCompletedAt: Date,
  duplicateWarnings: [{
    field: String,
    member: { type: mongoose.Schema.Types.ObjectId, ref: 'Member' },
    value: String,
  }],
  lastContact: Date,
  followUps: [FollowUpSchema],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  searchVersion: { type: Number, default: 0, select: false },
  searchText: { type: String, default: '', select: false },
  searchKeys: { type: [String], default: [], select: false },
  searchExact: { type: [String], default: [], select: false },
  searchNameKeys: { type: [String], default: [], select: false },
  searchGuardianKeys: { type: [String], default: [], select: false },
  searchEpicKeys: { type: [String], default: [], select: false },
  searchHouseKeys: { type: [String], default: [], select: false },
  searchMobileKeys: { type: [String], default: [], select: false },
  searchVillageKeys: { type: [String], default: [], select: false },
  searchPinKeys: { type: [String], default: [], select: false },
}, { timestamps: true });

MemberSchema.pre('validate', function updateSearchData(next) {
  if (!String(this.voterId || '').trim() && (this.contactType === 'personal' || this.hasMunicipalMembership)) {
    this.voterId = undefined;
  }
  Object.assign(this, buildMemberSearchData(this));
  next();
});

MemberSchema.index({ mobile: 1 });
MemberSchema.index({ voterId: 1 }, { unique: true, partialFilterExpression: { voterId: { $type: 'string' } } });
MemberSchema.index({ address: 'text', name: 'text', surname: 'text', location: 'text', sectionName: 'text', assemblyName: 'text', voterId: 'text', guardianName: 'text' });
MemberSchema.index({ booth: 1, supportLevel: 1 });
MemberSchema.index({ assemblyNumber: 1, partNumber: 1, sectionName: 1 });
MemberSchema.index({ hasAssemblyMembership: 1, hasMunicipalMembership: 1, municipalWardNumbers: 1 });
MemberSchema.index({ area: 1, organizationPost: 1, caste: 1 });
MemberSchema.index({ searchKeys: 1 });
MemberSchema.index({ searchExact: 1 });
MemberSchema.index({ searchNameKeys: 1 });
MemberSchema.index({ searchGuardianKeys: 1 });
MemberSchema.index({ searchEpicKeys: 1 });
MemberSchema.index({ searchHouseKeys: 1 });
MemberSchema.index({ searchMobileKeys: 1 });
MemberSchema.index({ searchVillageKeys: 1 });
MemberSchema.index({ searchPinKeys: 1 });

module.exports = mongoose.model('Member', MemberSchema);


