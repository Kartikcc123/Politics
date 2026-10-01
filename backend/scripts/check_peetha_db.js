const mongoose = require('mongoose');

async function check() {
  await mongoose.connect('mongodb://187.127.173.42:27017/political_crm');
  const Member = require('../src/models/Member');
  
  const gpCount = await Member.countDocuments({ gramPanchayat: /पीथा/i });
  const villageCount = await Member.countDocuments({ village: /लड़की/i });
  const booth75Count = await Member.countDocuments({ partNumber: 75 });
  console.log('Counts:', { gpCount, villageCount, booth75Count });
  
  const sample = await Member.find({
    $or: [{ gramPanchayat: /पीथा/i }, { village: /लड़की/i }, { partNumber: 75 }]
  }).limit(5).select('name voterId gramPanchayat village wardNumber municipalWardNumbers partNumber');
  console.log('Sample in DB:', sample);
  
  process.exit(0);
}

check().catch(console.error);
