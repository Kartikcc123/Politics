const mongoose = require('mongoose');

async function inspectBheetaW1() {
  await mongoose.connect('mongodb://187.127.173.42:27017/political_crm');
  const db = mongoose.connection.db;

  const voters = await db.collection('members')
    .find({ gramPanchayat: 'भींटा', wardNumber: '1' })
    .sort({ voterSerial: 1 })
    .limit(20)
    .project({
      voterId: 1,
      name: 1,
      guardianName: 1,
      voterSerial: 1,
      wardVoterSerial: 1,
      wardNumber: 1,
      partNumber: 1,
      hasAssemblyMembership: 1,
      hasMunicipalMembership: 1,
      wardSerialMap: 1
    })
    .toArray();

  console.log('=== FIRST 20 VOTERS IN BHEETA WARD 1 ===');
  console.log(JSON.stringify(voters, null, 2));

  // Let's also check voters with serial 1..10 in Bheeta Ward 1 sorted by wardVoterSerial
  const byWardSerial = await db.collection('members')
    .find({ gramPanchayat: 'भींटा', wardNumber: '1' })
    .sort({ wardVoterSerial: 1 })
    .limit(10)
    .project({
      voterId: 1,
      name: 1,
      guardianName: 1,
      voterSerial: 1,
      wardVoterSerial: 1,
      wardNumber: 1,
      partNumber: 1
    })
    .toArray();

  console.log('\n=== SORTED BY WARD VOTER SERIAL ===');
  console.log(JSON.stringify(byWardSerial, null, 2));

  await mongoose.disconnect();
}

inspectBheetaW1().catch(console.error);
