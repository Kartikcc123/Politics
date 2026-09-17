const mongoose = require('mongoose');

const GroupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  color: {
    type: String,
    trim: true,
    default: '#1A73E8', // Google Blue default
  },
  icon: {
    type: String,
    trim: true,
    default: 'label',
  },
  description: {
    type: String,
    trim: true,
    maxlength: 300,
    default: '',
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

GroupSchema.index({ name: 1, createdBy: 1 }, { unique: true });

module.exports = mongoose.model('Group', GroupSchema);
