const fs = require('fs');
const path = require('path');
const { resolveUploadPublicPath, uploadRoot, uploadPublicPath } = require('./uploadPath');
const { uploadToS3, isS3Configured } = require('./s3');

const contentTypes = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

const persistLocalImage = async (filePath, userId, removeOriginal = false) => {
  const original = String(filePath || '');
  if (!original) return '';
  if (/^https?:\/\//i.test(original)) return original;

  const source = /^[/\\]?uploads[/\\]/i.test(original)
    ? resolveUploadPublicPath(original)
    : original;

  if (!source || !fs.existsSync(source)) return original;
  const stat = fs.statSync(source);
  if (!stat.isFile() || stat.size < 1) {
    return original;
  }
  const extension = path.extname(source).toLowerCase();
  const contentType = contentTypes[extension] || 'image/jpeg';

  // 1. If AWS S3 is configured, upload to S3
  if (isS3Configured()) {
    try {
      const s3Url = await uploadToS3(source, contentType);
      if (s3Url) {
        if (removeOriginal) fs.rmSync(source, { force: true });
        return s3Url;
      }
    } catch (s3Err) {
      console.warn('S3 upload warning, falling back to local persistent disk:', s3Err.message);
    }
  }

  // 2. If S3 is not configured:
  // KEEP THE IMAGE ON LOCAL PERSISTENT DISK (/uploads/...) INSTEAD OF BLOWING UP MONGODB!
  // MongoDB Atlas has a 512 MB free tier. Images must stay on VPS disk, NOT in MongoDB!
  const root = path.resolve(uploadRoot());
  const resolvedSource = path.resolve(source);

  if (resolvedSource.startsWith(root)) {
    // Already in uploads folder! Return the public relative URL
    const relative = path.relative(root, resolvedSource).replace(/\\/g, '/');
    return uploadPublicPath(relative);
  }

  // If outside uploads directory, move or copy into uploads/voters/
  const votersDir = path.join(root, 'voters');
  if (!fs.existsSync(votersDir)) {
    fs.mkdirSync(votersDir, { recursive: true });
  }
  const destFile = path.join(votersDir, `${Date.now()}-${path.basename(resolvedSource)}`);
  try {
    if (removeOriginal) {
      fs.renameSync(resolvedSource, destFile);
    } else {
      fs.copyFileSync(resolvedSource, destFile);
    }
    return uploadPublicPath('voters', path.basename(destFile));
  } catch (_) {
    return uploadPublicPath(path.basename(resolvedSource));
  }
};

module.exports = { persistLocalImage };
