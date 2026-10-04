const mongoose = require('mongoose');
const Member = require('../src/models/Member');

async function test() {
  await mongoose.connect('mongodb://187.127.173.42:27017/political_crm');
  
  console.log('--- Checking Kalaalkhedi Ward 1 in DB ---');
  const direct = await Member.countDocuments({ gramPanchayat: 'कलालखेड़ी', municipalWardNumbers: '1' });
  console.log('Exact match { gramPanchayat: "कलालखेड़ी", municipalWardNumbers: "1" }:', direct);

  const sample = await Member.findOne({ gramPanchayat: 'कलालखेड़ी', municipalWardNumbers: '1' });
  console.log('Sample Member:', {
    name: sample?.name,
    gramPanchayat: sample?.gramPanchayat,
    village: sample?.village,
    wardNumber: sample?.wardNumber,
    municipalWardNumbers: sample?.municipalWardNumbers,
    hasMunicipalMembership: sample?.hasMunicipalMembership,
    contactType: sample?.contactType
  });

  await mongoose.disconnect();
}
test().catch(console.error);
