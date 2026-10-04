const mongoose = require('mongoose');

async function check() {
  await mongoose.connect('mongodb://187.127.173.42:27017/political_crm');
  const db = mongoose.connection.db;
  const total = await db.collection('members').countDocuments();
  const withCaste = await db.collection('members').countDocuments({ caste: { $exists: true, $nin: ['', null] } });
  const withMobile = await db.collection('members').countDocuments({ mobile: { $exists: true, $nin: ['', null] } });
  const withNameHindi = await db.collection('members').countDocuments({ nameHindi: { $exists: true, $nin: ['', null] } });
  const withFatherHindi = await db.collection('members').countDocuments({ fatherNameHindi: { $exists: true, $nin: ['', null] } });
  
  console.log('--- STATS ---');
  console.log({ total, withCaste, withMobile, withNameHindi, withFatherHindi });
  
  const samples = await db.collection('members')
    .find({ caste: { $exists: true, $nin: ['', null] } })
    .limit(5)
    .project({ name: 1, nameHindi: 1, fatherNameHindi: 1, caste: 1, mobile: 1, gramPanchayat: 1, voterId: 1, sectionName: 1 })
    .toArray();
    
  console.log('--- SAMPLE RECORDS ---');
  console.log(JSON.stringify(samples, null, 2));
  
  await mongoose.disconnect();
}

check().catch(console.error);
