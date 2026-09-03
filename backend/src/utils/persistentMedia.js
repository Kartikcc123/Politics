const fs = require('fs');
const path = require('path');
const MediaAsset = require('../models/MediaAsset');
const { resolveUploadPublicPath } = require('./uploadPath');
const { uploadToS3, isS3Configured } = require('./s3');

const contentTypes = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

const persistLocalImage = async (filePath, userId, removeOriginal = false) => {
  const original = String(filePath || '');
  const source = /^[/\\]?uploads[/\\]/i.test(original)
    ? resolveUploadPublicPath(original)
    : original;
  if (!source || !fs.existsSync(source)) return source;
  const stat = fs.statSync(source);
  if (!stat.isFile() || stat.size < 1 || stat.size > 10 * 1024 * 1024) {
    return source;
  }
  const extension = path.extname(source).toLowerCase();
  const contentType = contentTypes[extension] || 'image/jpeg';

  if (isS3Configured()) {
    const s3Url = await uploadToS3(source, contentType);
    if (s3Url) {
      if (removeOriginal) fs.rmSync(source, { force: true });
      return s3Url;
    }
  }

  const asset = await MediaAsset.create({
    data: fs.readFileSync(source),
    contentType: contentType,
    filename: path.basename(source),
    createdBy: userId,
  });
  if (removeOriginal) fs.rmSync(source, { force: true });
  return '/media/' + asset._id;
};

module.exports = { persistLocalImage };
