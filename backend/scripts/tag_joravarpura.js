const mongoose = require('mongoose');
const Member = require('../src/models/Member');

async function run() {
  await mongoose.connect('mongodb://187.127.173.42:27017/political_crm');

  const res = await Member.updateMany(
    { partNumber: { $in: ['6', 6] }, sectionName: /जोरावरपुरा/i },
    { $set: { village: 'जोरावरपुरा', gramPanchayat: 'सरेवड़ी', tehsil: 'रायपुर' } }
  );

  console.log('✅ Updated Joravarpura voters in Part 6:', res.modifiedCount);

  const total = await Member.countDocuments({ village: 'जोरावरपुरा' });
  console.log('Total Joravarpura voters in DB now:', total);

  process.exit(0);
}

run().catch(console.error);
