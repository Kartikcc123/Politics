const mongoose = require('mongoose');
const Member = require('../src/models/Member');

const MONGO_URI = 'mongodb://187.127.173.42:27017/political_crm';

async function run() {
  await mongoose.connect(MONGO_URI);
  const count = await Member.countDocuments({ hasAssemblyMembership: false });
  console.log(`Total Ward-only voters across all GPs: ${count}`);

  const byGP = await Member.aggregate([
    { $match: { hasAssemblyMembership: false } },
    { $group: { _id: '$gramPanchayat', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
  console.log('By Gram Panchayat:', JSON.stringify(byGP, null, 2));

  await mongoose.disconnect();
}

run();
