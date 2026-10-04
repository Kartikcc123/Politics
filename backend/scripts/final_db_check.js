const mongoose = require('mongoose');

async function check() {
  await mongoose.connect('mongodb://187.127.173.42:27017/political_crm');
  const db = mongoose.connection.db;
  
  const total = await db.collection('members').countDocuments();
  const withAssemblySerial = await db.collection('members').countDocuments({ voterSerial: { $exists: true, $nin: ['', null] } });
  const withWardSerial = await db.collection('members').countDocuments({ wardVoterSerial: { $exists: true, $nin: ['', null] } });
  const withCaste = await db.collection('members').countDocuments({ caste: { $exists: true, $nin: ['', null] } });
  const withMobile = await db.collection('members').countDocuments({ mobile: { $exists: true, $nin: ['', null] } });
  
  console.log('Final DB State:', {
    total,
    withAssemblySerial,
    withWardSerial,
    withCaste,
    withMobile
  });
  
  await mongoose.disconnect();
}

check().catch(console.error);
