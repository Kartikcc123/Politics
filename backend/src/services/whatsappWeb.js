const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const MessageSender = require('../models/MessageSender');

// Apply disk patch if needed on startup
try {
  const { patchUtilsFile } = require('../../scripts/patchWhatsappWeb');
  patchUtilsFile();
} catch (_) {}

let LoadUtils = null;
try {
  LoadUtils = require('whatsapp-web.js/src/util/Injected/Utils').LoadUtils;
} catch (_) {}

const clients = new Map();
const ready = new Set();
const dataPath = path.resolve(process.env.WHATSAPP_SESSION_PATH || path.join(__dirname, '../../whatsapp-sessions'));

function sessionKey(sender) {
  return sender.sessionId || `sender-${sender._id}`;
}

async function updateSender(id, data) {
  await MessageSender.findByIdAndUpdate(id, { $set: data });
}

async function ensurePatchedPupPage(client) {
  if (!client || !client.pupPage) return;
  try {
    const isWWebJSReady = await client.pupPage.evaluate(() => {
      return typeof window.WWebJS !== 'undefined' && typeof window.WWebJS.getChat === 'function';
    }).catch(() => false);
    if (!isWWebJSReady) {
      console.log('[WhatsApp Web] Re-injecting LoadUtils (WWebJS) into pupPage...');
      if (LoadUtils) {
        await client.pupPage.evaluate(LoadUtils);
      } else if (typeof client.inject === 'function') {
        await client.inject();
      }
    }
  } catch (err) {
    console.warn('[WhatsApp Web] inject check warning:', err.message);
  }
  try {
    await client.pupPage.evaluate(() => {
      try {
        const sendAction = window.require && window.require('WAWebSendMsgChatAction');
        if (sendAction && !sendAction._memoizePatched) {
          const orig = sendAction.addAndSendMsgToChat;
          sendAction.addAndSendMsgToChat = function (chat, message) {
            if (message) {
              delete message.__x_id;
              if (message._id && (!message.id || !message.id._serialized)) {
                message.id = message._id;
              }
            }
            return orig.apply(this, arguments);
          };
          sendAction._memoizePatched = true;
        }
      } catch (_) {}
    });
  } catch (_) {}
}

async function connectSender(senderOrId) {
  const sender = typeof senderOrId === 'string'
    ? await MessageSender.findById(senderOrId)
    : senderOrId;
  if (!sender || sender.provider !== 'whatsapp_web') throw new Error('QR sender नहीं मिला');
  const id = String(sender._id);
  if (clients.has(id)) {
    const existing = clients.get(id);
    if (ready.has(id)) return existing;
    try { await existing.destroy(); } catch (_) {}
    clients.delete(id);
    ready.delete(id);
  }
  const key = sessionKey(sender);
  if (!sender.sessionId) await updateSender(id, { sessionId: key });
  await updateSender(id, { connectionStatus: 'starting', lastError: '', qrCode: '' });

  const puppeteer = {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
    ],
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
    qrMaxRetries: 6,
    takeoverOnConflict: true,
    takeoverTimeoutMs: 10000,
    deviceName: 'Political CRM',
    browserName: 'Chrome',
    webVersionCache: {
      type: 'remote',
      remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/{version}.html',
      strict: false,
    },
  });
  clients.set(id, client);

  let wasEverConnected = false;

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
    wasEverConnected = true;
    ready.add(id);
    console.log(`[WhatsApp Web] 🎉 Sender ${id} ready & connected!`);
    await ensurePatchedPupPage(client);
    await updateSender(id, {
      connectionStatus: 'connected', qrCode: '',
      connectedNumber: client.info?.wid?.user || sender.displayNumber,
      lastError: '', lastSeenAt: new Date(),
    });
  });
  client.on('auth_failure', async (message) => {
    ready.delete(id);
    clients.delete(id);
    try { await client.destroy(); } catch (_) {}
    await updateSender(id, { connectionStatus: 'failed', lastError: String(message), qrCode: '' });
  });
  client.on('disconnected', async (reason) => {
    console.warn(`[WhatsApp Web] ⚠️ Sender ${id} disconnected. Reason: ${reason}`);
    ready.delete(id);
    clients.delete(id);
    try { await client.destroy(); } catch (_) {}

    const reasonStr = String(reason || '');
    const isQrTimeout = reasonStr.toLowerCase().includes('max qrcode retries') || !wasEverConnected;

    await updateSender(id, {
      connectionStatus: 'disconnected',
      lastError: isQrTimeout ? 'QR स्कैन का समय समाप्त हो गया। दोबारा QR बनाने के लिए "कनेक्ट" दबाएं।' : reasonStr,
      qrCode: '',
    });

    // Auto-reconnect ONLY if session was previously active and dropped unexpectedly.
    // NEVER auto-reconnect if it's an unscanned QR timeout to prevent infinite Chromium memory leak!
    if (wasEverConnected && reason !== 'LOGOUT' && !isQrTimeout) {
      setTimeout(async () => {
        try {
          const fresh = await MessageSender.findById(id);
          if (fresh && fresh.active && fresh.provider === 'whatsapp_web') {
            console.log(`[WhatsApp Web] 🔄 Auto-reconnecting active sender ${id} after network drop...`);
            await connectSender(fresh);
          }
        } catch (err) {
          console.error(`[WhatsApp Web] Auto-reconnect failed for ${id}:`, err.message);
        }
      }, 8000);
    }
  });
  client.initialize().catch(async (error) => {
    ready.delete(id);
    clients.delete(id);
    try { await client.destroy(); } catch (_) {}
    await updateSender(id, { connectionStatus: 'failed', lastError: error.message, qrCode: '' });
  });

  // Heartbeat keep-alive every 25 seconds to prevent Docker/OS idle throttling
  const keepAliveTimer = setInterval(async () => {
    if (!clients.has(id)) {
      clearInterval(keepAliveTimer);
      return;
    }
    const current = clients.get(id);
    if (ready.has(id) && current?.pupPage) {
      try {
        await current.pupPage.evaluate(() => window.WWebJS ? true : false).catch(() => {});
      } catch (_) {}
    }
  }, 25000);
  keepAliveTimer.unref();

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

  // CRITICAL: Always use standard phone user JID (e.g. 919521066616@c.us).
  // NEVER send media to @lid (Linked Identity) as WhatsApp Web throws:
  // "Data passed to getter must include an id property (it's how we memoize)"
  let targetSerialized = `${digits}@c.us`;
  try {
    const numberId = await client.getNumberId(digits);
    if (numberId?._serialized && !numberId._serialized.includes('@lid')) {
      targetSerialized = numberId._serialized;
    }
  } catch (_) {}

  // Guarantee that WWebJS and memoize patches are present before any sendMessage attempt
  await ensurePatchedPupPage(client);

  // Anti-Ban Protection 1: Mark presence online and simulate realistic human interaction
  try {
    await client.sendPresenceAvailable().catch(() => {});
    // Natural human pause upon opening conversation (0.8s - 1.6s)
    await new Promise((r) => setTimeout(r, Math.floor(Math.random() * 800) + 800));
    const chat = await client.getChatById(targetSerialized).catch(() => null);
    if (chat && typeof chat.sendStateTyping === 'function') {
      await chat.sendStateTyping().catch(() => {});
      const typingMs = Math.floor(Math.random() * 1800) + 2000; // 2.0s - 3.8s human typing simulation
      await new Promise((r) => setTimeout(r, typingMs));
      await chat.clearState().catch(() => {});
    }
  } catch (_) {}

  // Anti-Ban Protection 2: Cryptographic Zero-Width Hash Salting
  // Injects randomized zero-width non-printing characters so each outgoing message has a unique SHA256 checksum
  const invisibleSalts = ['\u200B', '\u200C', '\u200D'];
  const saltLength = Math.floor(Math.random() * 5) + 2;
  const saltStr = Array.from({ length: saltLength }, () => invisibleSalts[Math.floor(Math.random() * invisibleSalts.length)]).join('');
  const safeText = text ? (text + saltStr) : '';

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
      message = await client.sendMessage(targetSerialized, media, { caption: safeText });
      console.log(`[WhatsApp Web] ✅ Media successfully sent to ${targetSerialized}`);
    } catch (mediaError) {
      console.error(`[WhatsApp Web] ❌ Media send FAILED to ${digits}:`, mediaError.stack || mediaError.message);
      console.warn(`[WhatsApp Web] ⚠️ Falling back to text-only send for ${digits}`);
      await ensurePatchedPupPage(client);
      message = await client.sendMessage(targetSerialized, safeText);
    }
  } else {
    message = await client.sendMessage(targetSerialized, safeText);
  }
  return message?.id?._serialized || message?._data?.id?._serialized || 'sent';
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

