const mongoose = require('mongoose');
const Member = require('../src/models/Member');

const MONGO_URI = 'mongodb://187.127.173.42:27017/political_crm';

async function run() {
  await mongoose.connect(MONGO_URI);
  const v = await Member.find({ voterId: /SNE0982348/i });
  console.log('Matches for SNE0982348:', JSON.stringify(v, null, 2));

  // Let's also check if there are other voters with similar EPIC or in other parts of DB
  const sampleThala = await Member.find({ gramPanchayat: 'थला' }).limit(10).select('name voterId wardNumber isWardOnly');
  console.log('Sample Thala members:', JSON.stringify(sampleThala, null, 2));

  await mongoose.disconnect();
}

run();
