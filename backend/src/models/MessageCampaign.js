const mongoose = require('mongoose');

const RecipientSchema = new mongoose.Schema({
  member: { type: mongoose.Schema.Types.ObjectId, ref: 'Member' },
  name: String,
  mobile: String,
  text: String,
  status: {
    type: String,
    enum: ['queued', 'processing', 'sent', 'delivered', 'failed', 'opted_out', 'cancelled'],
    default: 'queued',
  },
  providerMessageId: String,
  error: String,
  attempts: { type: Number, default: 0 },
  nextAttemptAt: Date,
  sentAt: Date,
}, { _id: true });

const MessageCampaignSchema = new mongoose.Schema({
  title: { type: String, trim: true, default: '' },
  channel: { type: String, enum: ['whatsapp', 'sms'], required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'MessageSender' },
  eventType: {
    type: String,
    enum: ['general', 'birthday', 'anniversary', 'event', 'meeting'],
    default: 'general',
  },
  message: { type: String, required: true },
  templateName: { type: String, trim: true, default: '' },
  templateLanguage: { type: String, trim: true, default: 'hi' },
  filters: mongoose.Schema.Types.Mixed,
  totalMatched: Number,
  totalEligible: Number,
  optedOut: Number,
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'running', 'paused', 'completed', 'cancelled', 'failed'],
    default: 'scheduled',
  },
  scheduledAt: { type: Date, default: Date.now },
  batchSize: { type: Number, default: 10, min: 1, max: 20 },
  intervalSeconds: { type: Number, default: 60, min: 30, max: 3600 },
  messageDelaySeconds: { type: Number, default: 3, min: 2, max: 30 },
  dailyLimit: { type: Number, default: 200, min: 1, max: 1000 },
  quietHoursStart: { type: Number, default: 20, min: 0, max: 23 },
  quietHoursEnd: { type: Number, default: 8, min: 0, max: 23 },
  nextBatchAt: { type: Date, default: Date.now },
  sentCount: { type: Number, default: 0 },
  failedCount: { type: Number, default: 0 },
  recipients: [RecipientSchema],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

MessageCampaignSchema.index({ status: 1, nextBatchAt: 1 });

module.exports = mongoose.model('MessageCampaign', MessageCampaignSchema);

