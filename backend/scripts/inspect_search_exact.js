const mongoose = require('mongoose');

async function inspectSearchExact() {
  await mongoose.connect('mongodb://187.127.173.42:27017/political_crm');
  const db = mongoose.connection.db;

  const sample = await db.collection('members').find({ searchExact: { $exists: true, $ne: [] } }).limit(10).toArray();
  console.log('Sample documents searchExact vs current voterSerial / partNumber:');
  for (const s of sample) {
    console.log({
      voterId: s.voterId,
      name: s.name,
      currentVoterSerial: s.voterSerial,
      currentPartNumber: s.partNumber,
      searchExact: s.searchExact
    });
  }

  await mongoose.disconnect();
}

inspectSearchExact().catch(console.error);
