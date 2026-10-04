const mongoose = require('mongoose');

async function test() {
  await mongoose.connect('mongodb://187.127.173.42:27017/political_crm');
  const sample = await mongoose.connection.db.collection('members').findOne({ caste: { $nin: ['', null] } });
  console.log('Sample guardianName/relativeName:', {
    name: sample.name,
    guardianName: sample.guardianName,
    relativeName: sample.relativeName,
    caste: sample.caste,
    mobile: sample.mobile,
    gramPanchayat: sample.gramPanchayat,
    voterId: sample.voterId
  });
  await mongoose.disconnect();
}
test().catch(console.error);
