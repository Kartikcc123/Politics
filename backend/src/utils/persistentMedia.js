const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { resolveUploadPublicPath, uploadRoot, uploadPublicPath } = require('./uploadPath');
const { uploadToS3, isS3Configured } = require('./s3');

const contentTypes = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

function compressImageFile(inputPath, outputPath, maxDim = 600, quality = 80) {
  if (!fs.existsSync(inputPath)) return false;
  
  // 1. Try ImageMagick
  try {
    execSync(`magick "${inputPath}" -resize ${maxDim}x${maxDim}> -quality ${quality} -strip "${outputPath}"`, { stdio: 'pipe' });
    if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
      return true;
    }
  } catch (_) {}

  // 2. Try Python PIL
  try {
    const py = `from PIL import Image; img=Image.open(r'${inputPath.replace(/'/g, "\\'")}').convert('RGB'); img.thumbnail((${maxDim},${maxDim})); img.save(r'${outputPath.replace(/'/g, "\\'")}', format='JPEG', quality=${quality}, optimize=True)`;
    execSync(`python -c "${py}"`, { stdio: 'pipe' });
    if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
      return true;
    }
  } catch (_) {}

  // 3. Fallback: Copy file
  try {
    fs.copyFileSync(inputPath, outputPath);
    return true;
  } catch (_) {
    return false;
  }
}

const persistLocalImage = async (filePathOrBase64, userId, removeOriginal = false) => {
  const input = String(filePathOrBase64 || '').trim();
  if (!input) return '';
  if (/^https?:\/\//i.test(input)) return input;

  const root = path.resolve(uploadRoot());
  const votersDir = path.join(root, 'voters');
  if (!fs.existsSync(votersDir)) {
    fs.mkdirSync(votersDir, { recursive: true });
  }

  const timestamp = Date.now();
  const randomSuffix = Math.floor(Math.random() * 10000);
  const destFilename = `voter-${timestamp}-${randomSuffix}.jpg`;
  const destPath = path.join(votersDir, destFilename);

  // Case A: Base64 data URI (e.g. data:image/jpeg;base64,...)
  if (input.startsWith('data:image/') || (/^[a-zA-Z0-9+/=]{100,}$/.test(input.replace(/\s+/g, '')) && input.length > 200)) {
    const base64Data = input.includes('base64,') ? input.split('base64,')[1] : input;
    const tempRawPath = path.join(votersDir, `temp-${timestamp}-${randomSuffix}.raw`);
    try {
      fs.writeFileSync(tempRawPath, Buffer.from(base64Data, 'base64'));
      compressImageFile(tempRawPath, destPath, 600, 80);
      try { fs.rmSync(tempRawPath, { force: true }); } catch (_) {}
      return uploadPublicPath('voters', destFilename);
    } catch (err) {
      console.warn('Failed to process base64 image:', err.message);
      return '';
    }
  }

  // Case B: Disk File Path
  const source = /^[/\\]?uploads[/\\]/i.test(input)
    ? resolveUploadPublicPath(input)
    : input;

  if (!source || !fs.existsSync(source)) {
    // If it's already a relative /uploads URL that exists
    if (input.startsWith('/uploads/') || input.startsWith('uploads/')) return input;
    return '';
  }

  const stat = fs.statSync(source);
  if (!stat.isFile() || stat.size < 1) {
    return '';
  }

  // Compress image into destPath
  const compressed = compressImageFile(source, destPath, 600, 80);
  if (!compressed) {
    fs.copyFileSync(source, destPath);
  }

  if (removeOriginal && path.resolve(source) !== path.resolve(destPath)) {
    try { fs.rmSync(source, { force: true }); } catch (_) {}
  }

  // 1. If AWS S3 is configured, upload compressed image to S3
  if (isS3Configured()) {
    try {
      const s3Url = await uploadToS3(destPath, 'image/jpeg');
      if (s3Url) {
        return s3Url;
      }
    } catch (s3Err) {
      console.warn('S3 upload warning, falling back to local persistent disk:', s3Err.message);
    }
  }

  return uploadPublicPath('voters', destFilename);
};

module.exports = { persistLocalImage, compressImageFile };
