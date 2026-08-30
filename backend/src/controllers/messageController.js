const MessageTemplate = require('../models/MessageTemplate');
const MessageSender = require('../models/MessageSender');
const Member = require('../models/Member');
const MessageCampaign = require('../models/MessageCampaign');
const { applyMemberScope } = require('../utils/boothAccess');
const { connectSender, disconnectSender } = require('../services/whatsappWeb');

const builtInTemplates = [
  {
    _id: 'builtin-birthday', title: 'जन्मदिन शुभकामना', category: 'birthday',
    body: '🎂 जन्मदिन की हार्दिक शुभकामनाएँ {{name}} जी! आपका जीवन सुख, स्वास्थ्य और सफलता से भरा रहे।',
  },
  {
    _id: 'builtin-anniversary', title: 'विवाह वर्षगाँठ', category: 'anniversary',
    body: '💐 विवाह वर्षगाँठ की हार्दिक शुभकामनाएँ {{name}} जी! आपका दाम्पत्य जीवन सदैव सुखमय रहे।',
  },
  {
    _id: 'builtin-event', title: 'कार्यक्रम आमंत्रण', category: 'event',
    body: 'नमस्कार {{name}} जी, आपको {{event}} में सादर आमंत्रित किया जाता है। दिनांक: {{date}}।',
  },
  {
    _id: 'builtin-meeting', title: 'बैठक सूचना', category: 'meeting',
    body: 'नमस्कार {{name}} जी, {{event}} बैठक {{date}} को आयोजित है। कृपया समय पर पधारें।',
  },
];

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function monthDayExpr(field, dateValue) {
  const date = dateValue ? new Date(dateValue) : new Date();
  return {
    $expr: {
      $and: [
        { $eq: [{ $month: `$${field}` }, date.getMonth() + 1] },
        { $eq: [{ $dayOfMonth: `$${field}` }, date.getDate()] },
      ],
    },
  };
}

function campaignFilter(req) {
  const filter = applyMemberScope(req.currentUser, {});
  const body = req.body || {};
  if (body.booth && req.currentUser.role === 'admin') filter.booth = body.booth;
  if (body.ward && req.currentUser.role === 'admin') filter.ward = body.ward;
  if (body.party) filter.party = body.party;
  if (body.area) filter.area = body.area;
  if (body.memberIds?.length) filter._id = { $in: body.memberIds };
  if (body.eventType === 'birthday') Object.assign(filter, monthDayExpr('dob', body.occasionDate));
  if (body.eventType === 'anniversary') Object.assign(filter, monthDayExpr('anniversary', body.occasionDate));
  for (const key of ['assemblyName', 'tehsil', 'gramPanchayat', 'village', 'organizationPost', 'caste', 'subCaste']) {
    if (body[key]) filter[key] = new RegExp(escapeRegex(body[key]), 'i');
  }
  return filter;
}

function renderMessage(template, member, body) {
  return String(template || '')
    .replaceAll('{{name}}', member.name || '')
    .replaceAll('{{surname}}', member.surname || '')
    .replaceAll('{{party}}', member.party?.name || '')
    .replaceAll('{{ward}}', member.ward?.number || '')
    .replaceAll('{{booth}}', member.booth?.number || member.partNumber || '')
    .replaceAll('{{village}}', member.village || '')
    .replaceAll('{{event}}', body.eventName || 'कार्यक्रम')
    .replaceAll('{{date}}', body.eventDate || body.occasionDate || '');
}

exports.templates = async (req, res, next) => {
  try {
    const custom = await MessageTemplate.find({ active: true }).sort({ title: 1 }).lean();
    res.json([...builtInTemplates, ...custom]);
  } catch (e) { next(e); }
};

exports.createTemplate = async (req, res, next) => {
  try {
    res.status(201).json(await MessageTemplate.create({
      ...req.body, createdBy: req.currentUser._id,
    }));
  } catch (e) { next(e); }
};

exports.senders = async (req, res, next) => {
  try {
    res.json(await MessageSender.find({ active: true })
      .select('name displayNumber provider phoneNumberId isDefault connectionStatus connectedNumber lastError')
      .sort({ isDefault: -1, name: 1 }));
  }
  catch (error) { next(error); }
};

exports.saveSender = async (req, res, next) => {
  try {
    const provider = req.body.provider === 'whatsapp_cloud' ? 'whatsapp_cloud' : 'whatsapp_web';
    const phoneNumberId = String(req.body.phoneNumberId || '').trim();
    const businessAccountId = String(req.body.businessAccountId || '').trim();
    const data = {
      name: String(req.body.name || '').trim(),
      displayNumber: String(req.body.displayNumber || '').trim(),
      provider,
      isDefault: req.body.isDefault === true,
      active: true,
      updatedBy: req.currentUser._id,
    };
    if (provider === 'whatsapp_cloud') {
      data.phoneNumberId = phoneNumberId;
      if (businessAccountId) data.businessAccountId = businessAccountId;
    }
    if (!data.name || !data.displayNumber || (provider === 'whatsapp_cloud' && !data.phoneNumberId)) {
      return res.status(400).json({ message: provider === 'whatsapp_web'
        ? 'Sender name aur WhatsApp number required hain.'
        : 'Sender name, WhatsApp number aur Phone Number ID required hain.' });
    }
    if (data.isDefault) await MessageSender.updateMany({}, { $set: { isDefault: false } });

    const unset = provider === 'whatsapp_web'
      ? { phoneNumberId: '', businessAccountId: '' }
      : (!businessAccountId ? { businessAccountId: '' } : {});
    const update = Object.keys(unset).length ? { $set: data, $unset: unset } : { $set: data };
    const sender = req.body.id
      ? await MessageSender.findByIdAndUpdate(req.body.id, update, { new: true, runValidators: true })
      : await MessageSender.create({ ...data, createdBy: req.currentUser._id });
    if (!sender) return res.status(404).json({ message: 'WhatsApp sender nahi mila.' });
    if (provider === 'whatsapp_web') {
      connectSender(sender).catch((error) => {
        MessageSender.findByIdAndUpdate(sender._id, {
          $set: {
            connectionStatus: 'failed',
            qrCode: '',
            lastError: error.message || 'QR start nahi ho paya.',
          },
        }).catch(() => {});
      });
    }
    res.status(req.body.id ? 200 : 201).json(sender);
  } catch (error) {
    if (error && error.code === 11000) {
      return res.status(409).json({ message: 'Ye WhatsApp sender pehle se saved hai. Purana sender delete karke dobara QR banayein.' });
    }
    next(error);
  }
};

exports.connectSender = async (req, res, next) => {
  try {
    const sender = await MessageSender.findById(req.params.id);
    if (!sender || sender.provider !== 'whatsapp_web') {
      return res.status(404).json({ message: 'QR sender नहीं मिला।' });
    }
    await connectSender(sender);
    res.json({ id: sender._id, status: 'starting' });
  } catch (error) { next(error); }
};

exports.senderStatus = async (req, res, next) => {
  try {
    const sender = await MessageSender.findById(req.params.id)
      .select('name displayNumber provider connectionStatus qrCode connectedNumber lastError lastSeenAt');
    if (!sender) return res.status(404).json({ message: 'Sender नहीं मिला।' });
    res.json(sender);
  } catch (error) { next(error); }
};

exports.logoutSender = async (req, res, next) => {
  try {
    await disconnectSender(req.params.id, true);
    res.json({ id: req.params.id, status: 'disconnected' });
  } catch (error) { next(error); }
};

exports.removeSender = async (req, res, next) => {
  try {
    const sender = await MessageSender.findById(req.params.id);
    if (!sender) return res.status(404).json({ message: 'Sender नहीं मिला।' });
    if (sender.provider === 'whatsapp_web') {
      await disconnectSender(sender._id, true).catch(() => disconnectSender(sender._id, false));
    }
    sender.active = false;
    sender.isDefault = false;
    sender.qrCode = '';
    sender.connectionStatus = 'disconnected';
    sender.lastError = '';
    sender.updatedBy = req.currentUser._id;
    await sender.save();
    res.json({ id: sender._id, deleted: true });
  } catch (error) { next(error); }
};
exports.preview = async (req, res, next) => {
  try {
    const members = await Member.find(campaignFilter(req))
      .select('name surname mobile whatsappOptIn village dob anniversary')
      .limit(5000).lean();
    const eligible = members.filter((member) => member.mobile && member.whatsappOptIn === true);
    res.json({
      matched: members.length,
      eligible: eligible.length,
      missingMobile: members.filter((member) => !member.mobile).length,
      optedOut: members.filter((member) => member.mobile && member.whatsappOptIn !== true).length,
      samples: eligible.slice(0, 5),
    });
  } catch (error) { next(error); }
};

exports.broadcast = async (req, res, next) => {
  try {
    const sender = await MessageSender.findOne({ _id: req.body.sender, active: true });
    if (!sender) return res.status(400).json({ message: 'Active WhatsApp sender चुनें।' });
    if (sender.provider === 'whatsapp_web' && sender.connectionStatus !== 'connected') {
      return res.status(400).json({ message: 'पहले sender का QR scan करके WhatsApp connect करें।' });
    }
    const template = String(req.body.message || '').trim();
    if (!template) return res.status(400).json({ message: 'Message draft खाली नहीं हो सकता।' });
    const members = await Member.find(campaignFilter(req))
      .populate('party ward booth')
      .select('name surname mobile party ward booth partNumber dob anniversary whatsappOptIn assemblyName tehsil gramPanchayat village caste subCaste organizationPost')
      .limit(5000);
    const eligible = members.filter((member) => member.mobile && member.whatsappOptIn === true);
    const messages = eligible.map((member) => ({
      member: member._id,
      name: member.name,
      mobile: member.mobile,
      status: 'queued',
      text: renderMessage(template, member, req.body),
    }));
    const batchSize = Math.min(Math.max(Number(req.body.batchSize) || 10, 1), 20);
    const intervalSeconds = Math.min(Math.max(Number(req.body.intervalSeconds) || 60, 30), 3600);
    const dailyLimit = Math.min(Math.max(Number(req.body.dailyLimit) || 200, 1), 1000);
    const messageDelaySeconds = Math.min(Math.max(Number(req.body.messageDelaySeconds) || 3, 2), 30);
    const scheduledAt = req.body.scheduledAt ? new Date(req.body.scheduledAt) : new Date();
    const campaign = await MessageCampaign.create({
      title: req.body.title || req.body.eventName || 'WhatsApp Campaign',
      channel: 'whatsapp',
      sender: sender._id,
      eventType: req.body.eventType || 'general',
      message: template,
      templateName: String(req.body.templateName || '').trim(),
      templateLanguage: String(req.body.templateLanguage || 'hi').trim(),
      filters: req.body,
      totalMatched: members.length,
      totalEligible: messages.length,
      optedOut: members.filter((member) => member.mobile && member.whatsappOptIn !== true).length,
      status: 'scheduled',
      scheduledAt,
      nextBatchAt: scheduledAt,
      batchSize,
      intervalSeconds,
      dailyLimit,
      quietHoursStart: Math.min(Math.max(Number(req.body.quietHoursStart) || 20, 0), 23),
      quietHoursEnd: Math.min(Math.max(Number(req.body.quietHoursEnd) || 8, 0), 23),
      recipients: messages,
      createdBy: req.currentUser._id,
    });
    res.json({
      provider: 'whatsapp_cloud', campaignId: campaign._id,
      total: messages.length, matched: members.length, optedOut: campaign.optedOut,
      batchSize, intervalSeconds, messageDelaySeconds, dailyLimit, scheduledAt,
    });
  } catch (e) { next(e); }
};

exports.history = async (req, res, next) => {
  try {
    res.json(await MessageCampaign.find()
      .populate('createdBy', 'name').populate('sender', 'name displayNumber')
      .select('-recipients')
      .sort({ createdAt: -1 }).limit(100).lean());
  } catch (error) { next(error); }
};

exports.controlCampaign = async (req, res, next) => {
  try {
    const campaign = await MessageCampaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ message: 'Campaign नहीं मिली।' });
    const action = req.body.action;
    if (action === 'pause') campaign.status = 'paused';
    else if (action === 'resume') {
      campaign.status = 'scheduled';
      campaign.nextBatchAt = new Date();
    } else if (action === 'cancel') {
      campaign.status = 'cancelled';
      campaign.recipients.forEach((recipient) => {
        if (['queued', 'processing'].includes(recipient.status)) recipient.status = 'cancelled';
      });
    } else return res.status(400).json({ message: 'Invalid campaign action' });
    await campaign.save();
    res.json({ id: campaign._id, status: campaign.status });
  } catch (error) { next(error); }
};




