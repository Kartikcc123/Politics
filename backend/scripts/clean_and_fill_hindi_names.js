require('dotenv').config();
const mongoose = require('mongoose');
const https = require('https');
const http = require('http');
const fs = require('fs');
const { execSync } = require('child_process');

async function cleanAndFillHindiNames() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('❌ MONGO_URI is missing');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log('✅ Connected to MongoDB.');

  const db = mongoose.connection.db;
  const membersColl = db.collection('members');

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

  console.log('1️⃣ Scanning voters for missing or noisy Hindi names...');
  const voters = await membersColl.find({}).project({
    _id: 1,
    name: 1,
    guardianName: 1,
    voterId: 1,
    epicNumber: 1,
    cardImage: 1,
    ocrCardImage: 1
  }).toArray();

  let toFix = [];
  for (const v of voters) {
    const rawName = v.name || '';
    if (!rawName || /[a-zA-Z0-9_—–]/.test(rawName) || rawName.length < 2) {
      toFix.push(v);
    }
  }

  console.log(`🔍 Found ${toFix.length} voters to clean & repair into pure Hindi.`);

  let fixed = 0;
  for (const m of toFix) {
    const cardUrl = m.cardImage || m.ocrCardImage;
    if (!cardUrl) continue;

    const tmpImg = `/tmp/card_${m._id}.jpg`;
    try {
      await download(cardUrl, tmpImg);
      const stdout = execSync(`tesseract "${tmpImg}" stdout -l hin --psm 6 2>/dev/null`, { encoding: 'utf8' });
      if (fs.existsSync(tmpImg)) fs.unlinkSync(tmpImg);

      let name = '';
      let guardian = '';

      const lines = stdout.split('\n').map(l => l.trim()).filter(Boolean);
      for (const line of lines) {
        if (!name && (line.includes('नाम') || line.includes('नाग'))) {
          const raw = line.replace(/^.*?(नाम|नाग)[:\s\-]+/i, '');
          const cleaned = cleanHindi(raw);
          if (cleaned.length >= 2) name = cleaned;
        } else if (!guardian && (line.includes('पिता') || line.includes('पति') || line.includes('माता'))) {
          const raw = line.replace(/^.*?(पिता|पति|माता).*?[:\s\-]+/i, '');
          const cleaned = cleanHindi(raw);
          if (cleaned.length >= 2) guardian = cleaned;
        }
      }

      if (!name) {
        for (const line of lines) {
          const cleaned = cleanHindi(line);
          if (cleaned.length >= 2 && !cleaned.includes('निर्वाचक') && !cleaned.includes('मकान') && !cleaned.includes('आयु')) {
            name = cleaned;
            break;
          }
        }
      }

      if (name) {
        await membersColl.updateOne(
          { _id: m._id },
          { $set: { name: name, guardianName: guardian || cleanHindi(m.guardianName) || '' } }
        );
        fixed++;
        console.log(`   ✅ [${fixed}/${toFix.length}] Pure Hindi: "${name}" | Guardian: "${guardian}" (${m.voterId || m.epicNumber})`);
      }
    } catch (err) {
      if (fs.existsSync(tmpImg)) fs.unlinkSync(tmpImg);
    }
  }

  console.log(`\n🎉 ALL DONE: Successfully cleaned and set Pure Hindi names for ${fixed} voters!`);
  await mongoose.disconnect();
  process.exit(0);
}

cleanAndFillHindiNames();
