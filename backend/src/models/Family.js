const mongoose = require('mongoose');

const FamilySchema = new mongoose.Schema({
  familyHead: { type: mongoose.Schema.Types.ObjectId, ref: 'Member' },
  headName: String,
  houseNumber: { type: String, trim: true },
  sectionNumber: { type: String, trim: true },
  sectionName: { type: String, trim: true },
  address: String,
  ward: { type: mongoose.Schema.Types.ObjectId, ref: 'Ward' },
  booth: { type: mongoose.Schema.Types.ObjectId, ref: 'Booth' },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Member' }],
  source: {
    type: String,
    enum: ['manual', 'auto'],
    default: 'manual',
  },
  groupingKey: { type: String, trim: true },
  politicalStatus: {
    type: String,
    enum: ['congress', 'bjp', 'other', 'neutral', 'undecided'],
    default: 'undecided',
  },
  remarks: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

FamilySchema.index({ booth: 1, sectionNumber: 1, sectionName: 1, houseNumber: 1 });
FamilySchema.index({ groupingKey: 1 }, { unique: true, sparse: true });
FamilySchema.index({ headName: 'text', houseNumber: 'text', sectionName: 'text', address: 'text' });

module.exports = mongoose.model('Family', FamilySchema);

