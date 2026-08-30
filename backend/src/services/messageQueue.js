const MessageCampaign = require('../models/MessageCampaign');
const { sendWebMessage } = require('./whatsappWeb');

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let processing = false;

function normalizeMobile(value) {
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 10) digits = `91${digits}`;
  return digits;
}

function inQuietHours(hour, start, end) {
  return start > end ? hour >= start || hour < end : hour >= start && hour < end;
}

async function sendCloudMessage(sender, recipient, campaign) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!token) throw new Error('WHATSAPP_ACCESS_TOKEN configured नहीं है');
  const version = process.env.WHATSAPP_API_VERSION || 'v22.0';
  const body = campaign.templateName
    ? {
        messaging_product: 'whatsapp',
        to: normalizeMobile(recipient.mobile),
        type: 'template',
        template: {
          name: campaign.templateName,
          language: { code: campaign.templateLanguage || 'hi' },
          components: [{
            type: 'body',
            parameters: [{ type: 'text', text: recipient.name || 'मित्र' }],
          }],
        },
      }
    : {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: normalizeMobile(recipient.mobile),
        type: 'text',
        text: { preview_url: false, body: recipient.text },
      };
  const response = await fetch(`https://graph.facebook.com/${version}/${sender.phoneNumberId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error?.message || `WhatsApp API ${response.status}`);
  return data.messages?.[0]?.id || '';
}

async function processCampaign(campaign) {
  const sender = campaign.sender;
  if (sender?.provider === 'whatsapp_cloud' && !process.env.WHATSAPP_ACCESS_TOKEN) {
    campaign.status = 'paused';
    campaign.recipients.forEach((item) => {
      if (item.status === 'processing') item.status = 'queued';
    });
    await campaign.save();
    return;
  }
  if (!sender?.active) {
    campaign.status = 'paused';
    await campaign.save();
    return;
  }
  const hour = new Date().getHours();
  if (inQuietHours(hour, campaign.quietHoursStart, campaign.quietHoursEnd)) {
    campaign.nextBatchAt = new Date(Date.now() + 15 * 60 * 1000);
    await campaign.save();
    return;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const totals = await MessageCampaign.aggregate([
    { $match: { sender: campaign.sender._id } },
    { $unwind: '$recipients' },
    { $match: { 'recipients.sentAt': { $gte: today } } },
    { $count: 'count' },
  ]);
  const sentToday = totals[0]?.count || 0;
  const allowance = Math.max(0, campaign.dailyLimit - sentToday);
  if (!allowance) {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(campaign.quietHoursEnd, 5, 0, 0);
    campaign.nextBatchAt = tomorrow;
    await campaign.save();
    return;
  }
  const batch = campaign.recipients
    .filter((item) => item.status === 'queued' && (!item.nextAttemptAt || item.nextAttemptAt <= new Date()))
    .slice(0, Math.min(campaign.batchSize, allowance));
  if (!batch.length) {
    const pending = campaign.recipients.some((item) => ['queued', 'processing'].includes(item.status));
    campaign.status = pending ? 'running' : 'completed';
    await campaign.save();
    return;
  }
  campaign.status = 'running';
  for (let index = 0; index < batch.length; index += 1) {
    const recipient = batch[index];
    recipient.status = 'processing';
    recipient.attempts += 1;
    try {
      recipient.providerMessageId = sender.provider === 'whatsapp_web'
        ? await sendWebMessage(sender, recipient.mobile, recipient.text)
        : await sendCloudMessage(sender, recipient, campaign);
      recipient.status = 'sent';
      recipient.sentAt = new Date();
      recipient.error = '';
      campaign.sentCount += 1;
    } catch (error) {
      recipient.error = error.message;
      if (recipient.attempts < 3 && !error.message.includes('ACCESS_TOKEN')) {
        recipient.status = 'queued';
        recipient.nextAttemptAt = new Date(Date.now() + recipient.attempts * 5 * 60 * 1000);
      } else {
        recipient.status = 'failed';
        campaign.failedCount += 1;
      }
    }
    if (index < batch.length - 1) {
      await wait(campaign.messageDelaySeconds * 1000);
    }
  }
  campaign.nextBatchAt = new Date(Date.now() + campaign.intervalSeconds * 1000);
  await campaign.save();
}

async function tick() {
  if (processing) return;
  processing = true;
  try {
    const campaign = await MessageCampaign.findOne({
      status: { $in: ['scheduled', 'running'] },
      scheduledAt: { $lte: new Date() },
      nextBatchAt: { $lte: new Date() },
    }).populate('sender');
    if (campaign) await processCampaign(campaign);
  } catch (error) {
    console.error('WhatsApp queue worker:', error.message);
  } finally {
    processing = false;
  }
}

exports.startMessageWorker = () => {
  const timer = setInterval(tick, 15000);
  timer.unref();
  tick();
};
exports.processMessageQueue = tick;



