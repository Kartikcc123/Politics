require('dotenv').config();
const mongoose = require('mongoose');
const https = require('https');
const http = require('http');
const fs = require('fs');
const { execSync } = require('child_process');

async function fixAllMissingNames() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('❌ MONGO_URI is missing');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log('========================================================================');
  console.log('🚀 AUTOMATED ALL-DATABASE HINDI NAME RESOLVER & REPAIR ENGINE');
  console.log('========================================================================\n');

  const db = mongoose.connection.db;
  const coll = db.collection('members');

  function cleanHindi(text) {
    if (!text) return '';
    return String(text)
      .replace(/[a-zA-Z0-9!@#$%^&*()_+={}\[\]:;"'\`<>,.?\/\\|~_—–-]+/g, ' ')
      .replace(/[^\u0900-\u097F\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function download(url, dest) {
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(dest);
      const proto = url.startsWith('https') ? https : http;
      proto.get(url, (res) => {
        res.pipe(file);
        file.on('finish', () => { file.close(resolve); });
      }).on('error', (e) => {
        if (fs.existsSync(dest)) fs.unlinkSync(dest);
        reject(e);
      });
    });
  }

  console.log('1️⃣ Scanning entire database for any missing, English, or invalid names...');
  const voters = await coll.find({}).project({
    _id: 1,
    name: 1,
    guardianName: 1,
    voterId: 1,
    epicNumber: 1,
    cardImage: 1,
    ocrCardImage: 1,
    photo: 1
  }).toArray();

  const toRepair = [];
  for (const v of voters) {
    const name = String(v.name || '').trim();
    // Identify invalid names: empty, english-only, too short, or contains english/noise
    const isInvalid = !name
      || name.length < 2
      || /^[a-zA-Z\s]+$/.test(name)
      || /[a-zA-Z]/.test(name)
      || !/[\u0900-\u097F]/.test(name)
      || /^[0-9\s]+$/.test(name);

    if (isInvalid) {
      toRepair.push(v);
    }
  }

  console.log(`📊 Total Database Voters : ${voters.length.toLocaleString()}`);
  console.log(`🔍 Total Voters to Repair: ${toRepair.length.toLocaleString()}\n`);

  if (toRepair.length === 0) {
    console.log('🎉 All voters already have 100% pure Hindi names!');
    await mongoose.disconnect();
    process.exit(0);
  }

  console.log('2️⃣ Processing Card Images with High-Accuracy Hindi OCR Engine...');
  let repaired = 0;
  let skipped = 0;

  for (let i = 0; i < toRepair.length; i++) {
    const m = toRepair[i];
    const cardUrl = m.cardImage || m.ocrCardImage;
    if (!cardUrl) {
      skipped++;
      continue;
    }

    const tmpImg = `/tmp/repair_card_${m._id}.jpg`;
    try {
      await download(cardUrl, tmpImg);
      // Run Tesseract Hindi with PSM 6 (single block) and PSM 4 (column)
      const stdout = execSync(`tesseract "${tmpImg}" stdout -l hin --psm 6 2>/dev/null`, { encoding: 'utf8' });
      if (fs.existsSync(tmpImg)) fs.unlinkSync(tmpImg);

      let extractedName = '';
      let extractedGuardian = '';

      const lines = stdout.split('\n').map(l => l.trim()).filter(Boolean);
      for (const line of lines) {
        if (!extractedName && (line.includes('नाम') || line.includes('नाग') || line.includes('नामः'))) {
          const raw = line.replace(/^.*?(नाम|नाग|नामः)[:\s\-]+/i, '');
          const cleaned = cleanHindi(raw);
          if (cleaned.length >= 2) extractedName = cleaned;
        } else if (!extractedGuardian && (line.includes('पिता') || line.includes('पति') || line.includes('माता'))) {
          const raw = line.replace(/^.*?(पिता|पति|माता).*?[:\s\-]+/i, '');
          const cleaned = cleanHindi(raw);
          if (cleaned.length >= 2) extractedGuardian = cleaned;
        }
      }

      // Fallback: If "नाम" keyword was not found, search lines for candidate Hindi person name
      if (!extractedName) {
        for (const line of lines) {
          const cleaned = cleanHindi(line);
          if (cleaned.length >= 2
              && !cleaned.includes('निर्वाचक')
              && !cleaned.includes('मकान')
              && !cleaned.includes('आयु')
              && !cleaned.includes('लिंग')
              && !cleaned.includes('संख्या')
              && !cleaned.includes('पहचान')
              && !cleaned.includes('कार्ड')) {
            extractedName = cleaned;
            break;
          }
        }
      }

      if (extractedName) {
        const updateDoc = { name: extractedName };
        if (extractedGuardian) updateDoc.guardianName = extractedGuardian;
        await coll.updateOne({ _id: m._id }, { $set: updateDoc });
        repaired++;
        console.log(`   ✅ [${repaired}/${toRepair.length}] Resolved: "${extractedName}" | Guardian: "${extractedGuardian}" (${m.voterId || m.epicNumber})`);
      } else {
        skipped++;
      }
    } catch (err) {
      if (fs.existsSync(tmpImg)) fs.unlinkSync(tmpImg);
      skipped++;
    }
  }

  console.log('\n========================================================================');
  console.log(`🎉 REPAIR COMPLETE: Successfully resolved ${repaired.toLocaleString()} voter names!`);
  console.log('========================================================================\n');

  await mongoose.disconnect();
  process.exit(0);
}

fixAllMissingNames();
