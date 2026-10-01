const http = require('http');

async function testApi() {
  const url = 'http://localhost:5003/api/members?gramPanchayat=%E0%A4%AA%E0%A5%80%E0%A4%A5%E0%A4%BE%E0%A4%95%E0%A4%BE%E0%A4%96%E0%A5%87%E0%A4%A1%E0%A4%BC%E0%A4%BE&ward=1&limit=5';
  
  // Or query MongoDB directly if local server is not running on 5003
  const mongoose = require('mongoose');
  await mongoose.connect('mongodb://187.127.173.42:27017/political_crm');
  const Member = require('../src/models/Member');

  const peethaWard1 = await Member.countDocuments({
    gramPanchayat: /पीथा/i,
    $or: [
      { wardNumber: '1' },
      { municipalWardNumbers: '1' }
    ]
  });

  const ladkiVillage = await Member.countDocuments({
    village: /लड़की/i,
    $or: [
      { wardNumber: '1' },
      { municipalWardNumbers: '1' }
    ]
  });

  console.log(`✅ GP पीथाकाखेड़ा Ward 1 Voters: ${peethaWard1}`);
  console.log(`✅ Village लड़की Ward 1 Voters: ${ladkiVillage}`);

  const sample = await Member.find({
    gramPanchayat: /पीथा/i,
    municipalWardNumbers: '1'
  }).limit(5).select('name voterId houseNumber guardianName gender age wardNumber municipalWardNumbers village gramPanchayat');
  
  console.log('Sample Voters in Ward 1:', sample);
  process.exit(0);
}

testApi().catch(console.error);
