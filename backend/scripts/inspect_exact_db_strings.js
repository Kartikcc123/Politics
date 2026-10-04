const mongoose = require('mongoose');
const Member = require('../src/models/Member');

async function run() {
  await mongoose.connect('mongodb://187.127.173.42:27017/political_crm');

  const parts = [3, 7, 22, 23, 24, 25, 29, 41, 42, 43, 48, 50, 55, 88, 96, 99];
  console.log('--- Inspecting DB strings for suspected booths ---');

  for (const p of parts) {
    const sample = await Member.findOne({ partNumber: String(p) }).select('partNumber village gramPanchayat').lean();
    console.log(`Part ${String(p).padStart(3, ' ')} -> village: "${sample?.village}" | GP: "${sample?.gramPanchayat}"`);
  }

  process.exit(0);
}

run().catch(console.error);
