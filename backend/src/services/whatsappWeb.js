const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const { Client, LocalAuth } = require('whatsapp-web.js');
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
    const dataUrl = await QRCode.toDataURL(qr, { width: 360, margin: 2 });
    await updateSender(id, {
      connectionStatus: 'qr_ready', qrCode: dataUrl,
      lastError: '', lastSeenAt: new Date(),
    });
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

async function sendWebMessage(sender, mobile, text) {
  const id = String(sender._id);
  let client = clients.get(id);
  if (!client) client = await connectSender(sender);
  if (!ready.has(id)) throw new Error('WhatsApp QR session connected नहीं है');
  let digits = String(mobile || '').replace(/\D/g, '');
  if (digits.length === 10) digits = `91${digits}`;
  const numberId = await client.getNumberId(digits);
  if (!numberId) throw new Error('यह नंबर WhatsApp पर registered नहीं है');
  const message = await client.sendMessage(numberId._serialized, text);
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

