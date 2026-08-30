const mongoose = require('mongoose');

const MessageSenderSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  displayNumber: { type: String, required: true, trim: true },
  phoneNumberId: {
    type: String,
    trim: true,
    default: undefined,
    required() { return this.provider === 'whatsapp_cloud'; },
  },
  businessAccountId: { type: String, trim: true, default: undefined },
  provider: {
    type: String,
    enum: ['whatsapp_web', 'whatsapp_cloud'],
    default: 'whatsapp_web',
  },
  sessionId: { type: String, trim: true, default: undefined },
  connectionStatus: {
    type: String,
    enum: ['disconnected', 'starting', 'qr_ready', 'authenticated', 'connected', 'failed'],
    default: 'disconnected',
  },
  qrCode: { type: String, default: '' },
  connectedNumber: { type: String, trim: true, default: '' },
  lastError: { type: String, default: '' },
  lastSeenAt: Date,
  active: { type: Boolean, default: true },
  isDefault: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

MessageSenderSchema.pre('validate', function normalizeBlankUniqueFields(next) {
  for (const key of ['phoneNumberId', 'businessAccountId', 'sessionId']) {
    if (typeof this[key] === 'string' && this[key].trim() === '') this[key] = undefined;
  }
  next();
});

MessageSenderSchema.index(
  { phoneNumberId: 1 },
  { unique: true, partialFilterExpression: { phoneNumberId: { $type: 'string', $ne: '' } } },
);
MessageSenderSchema.index(
  { sessionId: 1 },
  { unique: true, partialFilterExpression: { sessionId: { $type: 'string', $ne: '' } } },
);

module.exports = mongoose.model('MessageSender', MessageSenderSchema);
