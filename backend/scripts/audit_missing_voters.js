const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Member = require('../src/models/Member');

async function main() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/political_crm';
  console.log(`Connecting to MongoDB (${mongoUri})...`);
  
  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
  } catch (err) {
    console.error('❌ Could not connect to MongoDB:', err.message);
    process.exit(1);
  }

  console.log('✅ Connected. Auditing voter serial gaps across all parts...\n');

  const members = await Member.find(
    { partNumber: { $nin: ['', null] } },
    { partNumber: 1, voterSerial: 1, voterId: 1, name: 1 }
  ).lean();

  if (!members.length) {
    console.log('No voters found in database.');
    await mongoose.disconnect();
    process.exit(0);
  }

  const partGroups = {};
  for (const m of members) {
    const p = String(m.partNumber).trim();
    if (!partGroups[p]) partGroups[p] = [];
    const s = parseInt(m.voterSerial, 10);
    if (!isNaN(s) && s > 0) {
      partGroups[p].push(s);
    }
  }

  const sortedParts = Object.keys(partGroups).sort((a, b) => {
    const na = parseInt(a, 10);
    const nb = parseInt(b, 10);
    return isNaN(na) || isNaN(nb) ? a.localeCompare(b) : na - nb;
  });

  console.log('========================================================================================');
  console.log('📊 VOTER SERIAL GAP & COMPLETION AUDIT REPORT');
  console.log('========================================================================================');
  console.log(
    'Part No.'.padEnd(10) +
    'Total in DB'.padEnd(14) +
    'Max Serial'.padEnd(14) +
    'Missing Count'.padEnd(16) +
    'Missing Serials List'
  );
  console.log('----------------------------------------------------------------------------------------');

  let totalGapsAcrossAll = 0;
  let perfectParts = 0;

  for (const p of sortedParts) {
    const serials = partGroups[p];
    if (!serials.length) continue;

    const serialSet = new Set(serials);
    const maxSerial = Math.max(...serials);
    const missing = [];

    for (let i = 1; i <= maxSerial; i++) {
      if (!serialSet.has(i)) {
        missing.push(i);
      }
    }

    const missingCount = missing.length;
    totalGapsAcrossAll += missingCount;

    let missingStr = '';
    if (missingCount === 0) {
      missingStr = '✅ 100% Complete (0 missing)';
      perfectParts++;
    } else if (missingCount <= 8) {
      missingStr = `⚠️ Missing: [ ${missing.map(m => '#' + m).join(', ')} ]`;
    } else {
      missingStr = `⚠️ Missing: [ ${missing.slice(0, 6).map(m => '#' + m).join(', ')} ... +${missingCount - 6} more ]`;
    }

    console.log(
      p.padEnd(10) +
      String(serials.length).padEnd(14) +
      String(maxSerial).padEnd(14) +
      String(missingCount).padEnd(16) +
      missingStr
    );
  }

  console.log('========================================================================================');
  console.log(`Summary: ${sortedParts.length} Parts Audited | ${perfectParts} Complete | Total Missing Gaps: ${totalGapsAcrossAll}`);
  console.log('========================================================================================\n');

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
