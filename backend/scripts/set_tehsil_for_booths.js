const mongoose = require('mongoose');
const Member = require('../src/models/Member');

async function run() {
  await mongoose.connect('mongodb://187.127.173.42:27017/political_crm');
  console.log('Connected to DB');

  const raipurBooths = Array.from({ length: 103 }, (_, i) => String(i + 1));
  const res = await Member.updateMany(
    { partNumber: { $in: raipurBooths } },
    { $set: { tehsil: 'रायपुर' } }
  );
  console.log('✅ Updated tehsil: "रायपुर" for records:', res.modifiedCount);

  process.exit(0);
}

run().catch(console.error);
