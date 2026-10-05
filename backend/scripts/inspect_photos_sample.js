const mongoose = require('mongoose');
const Member = require('../src/models/Member');

async function run() {
  await mongoose.connect('mongodb://187.127.173.42:27017/political_crm');
  const samples = await Member.find({ photo: { $nin: ['', null] } }).limit(25).select('name photo village gramPanchayat partNumber wardNumber assemblyName sectionName voterSerial wardVoterSerial').lean();
  console.log('Sample members with photos:');
  console.log(JSON.stringify(samples, null, 2));

  const totalWithPhoto = await Member.countDocuments({ photo: { $nin: ['', null] } });
  const totalMembers = await Member.countDocuments();
  console.log({ totalWithPhoto, totalMembers });

  await mongoose.disconnect();
}
run();
