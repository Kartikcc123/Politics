const mongoose = require('mongoose');

async function test() {
  await mongoose.connect('mongodb://187.127.173.42:27017/political_crm');
  const sample = await mongoose.connection.db.collection('members').findOne({ caste: { $nin: ['', null] } });
  console.log('Sample full document keys:', Object.keys(sample));
  console.log('Sample values:', {
    name: sample.name,
    fatherHusbandName: sample.fatherHusbandName,
    nameEnglish: sample.nameEnglish,
    fatherHusbandNameEnglish: sample.fatherHusbandNameEnglish,
    caste: sample.caste,
    mobile: sample.mobile,
    gramPanchayat: sample.gramPanchayat,
    boothNumber: sample.boothNumber,
    wardNumber: sample.wardNumber,
    voterSerial: sample.voterSerial
  });
  await mongoose.disconnect();
}
test().catch(console.error);
