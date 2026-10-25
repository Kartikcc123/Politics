const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const MessageSender = require('../models/MessageSender');

const clients = new Map();
const ready = new Set();
const dataPath = path.resolve(process.env.WHATSAPP_SESSION_PATH || path.join(__dirname, '../../whatsapp-sessions'));

function sessionKey(sender) {
  return sender.sessionId || `sender-${sender._id}`;
}

async function updateSender(id, data) {
  await MessageSender.findByIdAndUpdate(id, { $set: data });
}

async function connectSender(senderOrId) {
  const sender = typeof senderOrId === 'string'
    ? await MessageSender.findById(senderOrId)
    : senderOrId;
  if (!sender || sender.provider !== 'whatsapp_web') throw new Error('QR sender नहीं मिला');
  const id = String(sender._id);
  if (clients.has(id)) return clients.get(id);
  const key = sessionKey(sender);
  if (!sender.sessionId) await updateSender(id, { sessionId: key });
  await updateSender(id, { connectionStatus: 'starting', lastError: '', qrCode: '' });

  const puppeteer = {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  };
  const browserCandidates = [
    process.env.CHROME_PATH,
    'C:\\\\Program Files\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe',
    'C:\\\\Program Files (x86)\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe',
  ].filter(Boolean);
  const installedBrowser = browserCandidates.find((candidate) => fs.existsSync(candidate));
  if (installedBrowser) puppeteer.executablePath = installedBrowser;
  const client = new Client({
    authStrategy: new LocalAuth({ clientId: key, dataPath }),
    puppeteer,
    qrMaxRetries: 8,
    deviceName: 'Political CRM',
    browserName: 'Chrome',
  });
  clients.set(id, client);

  client.on('qr', async (qr) => {
    try {
      const dataUrl = await QRCode.toDataURL(qr, { width: 360, margin: 2 });
      await updateSender(id, {
        connectionStatus: 'qr_ready', qrCode: dataUrl,
        lastError: '', lastSeenAt: new Date(),
      });
    } catch (error) {
      await updateSender(id, {
        connectionStatus: 'failed', qrCode: '', lastError: error.message,
      }).catch(() => {});
    }
  });
  client.on('authenticated', () => updateSender(id, {
    connectionStatus: 'authenticated', qrCode: '', lastSeenAt: new Date(),
  }).catch(() => {}));
  client.on('ready', async () => {
    ready.add(id);
    await updateSender(id, {
      connectionStatus: 'connected', qrCode: '',
      connectedNumber: client.info?.wid?.user || sender.displayNumber,
      lastError: '', lastSeenAt: new Date(),
    });
  });
  client.on('auth_failure', async (message) => {
    ready.delete(id);
    clients.delete(id);
    await updateSender(id, { connectionStatus: 'failed', lastError: String(message), qrCode: '' });
  });
  client.on('disconnected', async (reason) => {
    ready.delete(id);
    clients.delete(id);
    await updateSender(id, {
      connectionStatus: 'disconnected', lastError: String(reason || ''), qrCode: '',
    });
  });
  client.initialize().catch(async (error) => {
    ready.delete(id);
    clients.delete(id);
    await updateSender(id, { connectionStatus: 'failed', lastError: error.message, qrCode: '' });
  });
  return client;
}

async function disconnectSender(id, logout = false) {
  const key = String(id);
  const client = clients.get(key);
  if (client) {
    try { if (logout) await client.logout(); } catch (_) {}
    try { await client.destroy(); } catch (_) {}
  }
  clients.delete(key);
  ready.delete(key);
  await updateSender(key, {
    connectionStatus: 'disconnected', qrCode: '', connectedNumber: '', lastError: '',
  });
}

async function sendWebMessage(sender, mobile, text, mediaObj = null) {
  const id = String(sender._id);
  let client = clients.get(id);
  if (!client) client = await connectSender(sender);
  if (!ready.has(id)) {
    // Wait up to 12 seconds for WhatsApp Web session to become ready
    for (let i = 0; i < 12; i += 1) {
      await new Promise((r) => setTimeout(r, 1000));
      if (ready.has(id)) break;
    }
  }
  if (!ready.has(id)) throw new Error('WhatsApp QR session connected नहीं है या load हो रहा है। कृपया WhatsApp पेज पर QR स्थिति जांचें।');
  let digits = String(mobile || '').replace(/\D/g, '').replace(/^0+/, '');
  if (digits.length === 10) digits = `91${digits}`;
  let numberId = null;
  try {
    numberId = await client.getNumberId(digits);
  } catch (_) {}
  const targetSerialized = numberId?._serialized || `${digits}@c.us`;

  let message;
  if (mediaObj && mediaObj.data && mediaObj.data.length > 50) {
    try {
      let base64Clean = String(mediaObj.data || '').trim();
      if (base64Clean.includes('base64,')) {
        base64Clean = base64Clean.split('base64,')[1];
      }
      base64Clean = base64Clean.replace(/[\r\n\s]/g, '');
      let mimeType = mediaObj.mimeType || (mediaObj.filename?.endsWith('.png') ? 'image/png' : 'image/jpeg');
      if (mimeType === 'image/jpg') mimeType = 'image/jpeg';
      const filename = mediaObj.filename || 'poster.jpg';
      const media = new MessageMedia(
        mimeType,
        base64Clean,
        filename
      );
      console.log(`[WhatsApp Web] 📤 Sending media (${mimeType}, ${filename}, ${base64Clean.length} b64 chars) with caption to ${targetSerialized}...`);
      message = await client.sendMessage(targetSerialized, media, { caption: text || '' });
      console.log(`[WhatsApp Web] ✅ Media successfully sent to ${targetSerialized}`);
    } catch (mediaError) {
      console.error(`[WhatsApp Web] ❌ Media send FAILED to ${digits}:`, mediaError.stack || mediaError.message);
      console.warn(`[WhatsApp Web] ⚠️ Falling back to text-only send for ${digits}`);
      message = await client.sendMessage(targetSerialized, text);
    }
  } else {
    message = await client.sendMessage(targetSerialized, text);
  }
  return message.id?._serialized || '';
}

async function restoreWebSessions() {
  const senders = await MessageSender.find({ provider: 'whatsapp_web', active: true });
  for (const sender of senders) {
    connectSender(sender).catch((error) => console.error('WhatsApp session restore:', error.message));
  }
}

exports.connectSender = connectSender;
exports.disconnectSender = disconnectSender;
exports.sendWebMessage = sendWebMessage;
exports.restoreWebSessions = restoreWebSessions;

