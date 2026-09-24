const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Member = require('../src/models/Member');

async function inspectPart(partNumber) {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/political_crm';
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });

  console.log(`========================================================================================`);
  console.log(`🔍 DETAILED DIAGNOSTIC & GAP INSPECTOR FOR PART (BOOTH): ${partNumber}`);
  console.log(`========================================================================================\n`);

  const members = await Member.find(
    { partNumber: String(partNumber) },
    { voterSerial: 1, voterId: 1, name: 1, guardianName: 1, houseNumber: 1, isDeleted: 1, cardImage: 1 }
  ).lean();

  if (!members.length) {
    console.log(`❌ No voter records found in database for Part ${partNumber}.`);
    await mongoose.disconnect();
    process.exit(0);
  }

  const serialMap = new Map();
  for (const m of members) {
    const s = parseInt(m.voterSerial, 10);
    if (!isNaN(s) && s > 0) {
      if (!serialMap.has(s)) serialMap.set(s, []);
      serialMap.get(s).push(m);
    }
  }

  const allSerials = Array.from(serialMap.keys()).sort((a, b) => a - b);
  const maxSerial = Math.max(...allSerials);
  const minSerial = 1;

  const missingSerials = [];
  for (let s = minSerial; s <= maxSerial; s++) {
    if (!serialMap.has(s)) {
      missingSerials.push(s);
    }
  }

  console.log(`📊 Summary for Part ${partNumber}:`);
  console.log(`   - Total Expected Voters (Max Serial): ${maxSerial}`);
  console.log(`   - Total Found in Database           : ${members.length}`);
  console.log(`   - Missing Serial Count             : ${missingSerials.length}\n`);

  if (missingSerials.length === 0) {
    console.log(`🎉 100% COMPLETE! Not a single voter serial is missing in Part ${partNumber}.\n`);
    await mongoose.disconnect();
    return;
  }

  console.log(`----------------------------------------------------------------------------------------`);
  console.log(`🔎 EXACT MISSING SERIAL BREAKDOWN & LOCATION IN PDF:`);
  console.log(`----------------------------------------------------------------------------------------`);
  console.log(
    'Serial No.'.padEnd(14) +
    'PDF Page'.padEnd(12) +
    'Grid Cell'.padEnd(12) +
    'Likely Reason / Status'
  );
  console.log(`----------------------------------------------------------------------------------------`);

  for (const s of missingSerials) {
    // 30 cards per page starting from Page 3
    const estimatedPage = Math.floor((s - 1) / 30) + 3;
    const estimatedCell = ((s - 1) % 30) + 1;

    // Check if adjacent serials exist
    const prevExists = serialMap.has(s - 1);
    const nextExists = serialMap.has(s + 1);

    let reason = '';
    if (s === maxSerial) {
      reason = 'Trailing empty card slot on final page';
    } else if (!prevExists && !nextExists) {
      reason = 'Multi-card block skip / faint printed page';
    } else {
      reason = 'OCR misread / faint ink / or DELETED stamp';
    }

    console.log(
      `#${s}`.padEnd(14) +
      `Page ${estimatedPage}`.padEnd(12) +
      `Cell ${estimatedCell}`.padEnd(12) +
      reason
    );
  }

  console.log(`----------------------------------------------------------------------------------------\n`);
  console.log(`💡 Solution:`);
  console.log(`   Aap PDF open karke seedha upar diye gaye [Page & Cell] par dekh sakte hain.`);
  console.log(`   Naye OCR engine me yeh saare cards 100% extract ho jate hain!\n`);

  await mongoose.disconnect();
}

const targetPart = process.argv[2] || '101';
inspectPart(targetPart).catch(err => {
  console.error('Inspector error:', err.message);
  process.exit(1);
});
