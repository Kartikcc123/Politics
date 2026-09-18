const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const mongoose = require('mongoose');
const MediaAsset = require('../models/MediaAsset');
const { resolveUploadPublicPath } = require('./uploadPath');
const { getFromS3 } = require('./s3');
const { commandFromEnv, subprocessEnv } = require('./ocrRuntime');

const runWorker = (cardPath) => new Promise((resolve, reject) => {
  let settled = false;
  const child = spawn(process.env.PYTHON_PATH || 'python', [path.join(__dirname, '../../python/ocr_worker.py')], {
    windowsHide: true,
    env: { ...subprocessEnv(), TESSERACT_PATH: commandFromEnv('TESSERACT_PATH', 'tesseract'), PYTHONIOENCODING: 'utf-8' }
  });
  let stdout = ''; let stderr = '';
  const timer = setTimeout(() => {
    if (!settled) {
      settled = true;
      try { child.kill('SIGKILL'); } catch (_) {}
      reject(new Error('Card OCR worker timed out after 20 seconds.'));
    }
  }, 20000);
  child.stdout.on('data', (chunk) => { stdout += chunk; });
  child.stderr.on('data', (chunk) => { stderr += chunk; });
  child.on('error', (err) => {
    if (!settled) {
      settled = true;
      clearTimeout(timer);
      reject(err);
    }
  });
  child.on('close', (code) => {
    if (!settled) {
      settled = true;
      clearTimeout(timer);
      if (code !== 0) return reject(new Error(stderr || `Card OCR exited with code ${code}`));
      try { return resolve(JSON.parse(stdout)); } catch (error) { return reject(new Error(`Card OCR returned invalid JSON: ${error.message}`)); }
    }
  });
  child.stdin.end(JSON.stringify({ mode: 'single_card', cardPath }));
});

async function resolveCardImage(source, directory) {
  const value = String(source || '').trim();
  if (!value) throw new Error('Saved voter card image path is empty.');

  // 1. Direct file on local disk
  if (fs.existsSync(value) && fs.statSync(value).isFile()) {
    return value;
  }

  // 2. MediaAsset ID: '/media/6aa...', 'http://.../media/6aa...', or raw 24-hex ObjectId
  const mediaMatch = value.match(/(?:^|[/\\])media[/\\]([a-f\d]{24})(?:$|[?#])/i) ||
                     (mongoose.isValidObjectId(value) ? [null, value] : null);
  if (mediaMatch && mongoose.isValidObjectId(mediaMatch[1])) {
    const asset = await MediaAsset.findById(mediaMatch[1]).select('+data contentType');
    if (!asset?.data) throw new Error('Saved voter card image is unavailable in media asset.');
    const target = path.join(directory, /png/i.test(asset.contentType) ? 'card.png' : 'card.jpg');
    fs.writeFileSync(target, Buffer.from(asset.data));
    return target;
  }

  // 3. /uploads/... path (relative or URL)
  const uploadMatch = value.match(/(?:^|[/\\])uploads[/\\]([^?#]+)/i);
  if (uploadMatch) {
    const target = resolveUploadPublicPath('/uploads/' + uploadMatch[1]);
    if (fs.existsSync(target)) return target;
  }

  // 4. Remote HTTP/HTTPS URL
  if (/^https?:\/\//i.test(value)) {
    try {
      const key = decodeURIComponent(new URL(value).pathname.replace(/^\//, ''));
      const object = await getFromS3(key);
      if (object?.Body) {
        const chunks = [];
        for await (const chunk of object.Body) chunks.push(Buffer.from(chunk));
        const target = path.join(directory, /png/i.test(object.ContentType || value) ? 'card.png' : 'card.jpg');
        fs.writeFileSync(target, Buffer.concat(chunks));
        return target;
      }
    } catch (_) {}
  }
  throw new Error(`Saved voter card image is unavailable locally (${value.slice(0, 50)}).`);
}

exports.recheckCardOcr = async (source) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'voter-card-ocr-'));
  try {
    const cardPath = await resolveCardImage(source, directory);
    const size = fs.statSync(cardPath).size;
    if (size < 1 || size > 10 * 1024 * 1024) throw new Error('Saved voter card image has an invalid size.');
    return await runWorker(cardPath);
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
};