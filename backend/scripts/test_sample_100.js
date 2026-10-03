const mongoose = require('mongoose');
const Member = require('../src/models/Member');
const { decodeSecHindi } = require('../src/utils/secHindiDecoder');

const MONGO_URI = 'mongodb://187.127.173.42:27017/political_crm';

async function testSample100() {
  await mongoose.connect(MONGO_URI);
  const sample = await Member.find({ hasAssemblyMembership: false })
    .select('name guardianName gramPanchayat wardNumber village voterId')
    .skip(500)
    .limit(100);

  console.log(`Testing 100 Ward-Only Voters:`);
  console.log('='.repeat(80));
  
  sample.forEach((m, idx) => {
    const fixedName = decodeSecHindi(m.name);
    const fixedGuardian = decodeSecHindi(m.guardianName);
    console.log(`${String(idx + 1).padStart(3)}. [${m.gramPanchayat} W${m.wardNumber}]`);
    console.log(`     RAW Name:     "${m.name}"`);
    console.log(`     FIXED Name:   "${fixedName}"`);
    console.log(`     RAW Guardian: "${m.guardianName}"`);
    console.log(`     FIXED Guard:  "${fixedGuardian}"`);
    console.log('-'.repeat(40));
  });

  await mongoose.disconnect();
}

testSample100();
