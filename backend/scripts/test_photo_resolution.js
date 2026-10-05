const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
dotenv.config({ path: path.join(__dirname, '../.env') });
const Member = require('../src/models/Member');
const MediaAsset = require('../src/models/MediaAsset');

function mediaIdFromPhoto(photo) {
  if (!photo) return null;
  const str = String(photo).trim();
  const match = str.match(/(?:(?:\/|^)(?:api\/)?media\/|^)([a-fA-F0-9]{24})(?:\/|$|\?)/);
  return match ? match[1] : null;
}

function normalizeImageBuffer(value) {
  if (!value) return null;
  const buffer = Buffer.isBuffer(value)
    ? value
    : value?.buffer
      ? Buffer.from(value.buffer)
      : Buffer.from(value);
  if (buffer.length < 8) return null;
  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8;
  const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
  return isJpeg || isPng ? buffer : null;
}

async function test() {
  await mongoose.connect(process.env.MONGO_URI);
  const members = await Member.find().limit(30).lean();
  console.log('Fetched members:', members.length);
  
  const mediaIds = [...new Set(members.map((m) => mediaIdFromPhoto(m.photo)).filter(Boolean))];
  console.log('Found mediaIds:', mediaIds.length, mediaIds.slice(0, 3));
  
  const media = new Map();
  if (mediaIds.length) {
    const assets = await MediaAsset.find({ _id: { $in: mediaIds } }).select('+data contentType').lean();
    console.log('Loaded MediaAssets:', assets.length);
    for (const asset of assets) {
      const buf = normalizeImageBuffer(asset.data);
      if (buf) {
        media.set(String(asset._id), buf);
      }
    }
    console.log('Normalized photo buffers:', media.size);
  }

  // Test photo getter for all 30 members
  let found = 0;
  for (const m of members) {
    const mid = mediaIdFromPhoto(m.photo);
    if (mid && media.has(mid)) {
      found++;
    }
  }
  console.log(`Photos resolved for ${found} / ${members.length} members!`);
  process.exit(0);
}
test();
