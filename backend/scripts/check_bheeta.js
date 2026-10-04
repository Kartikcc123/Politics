const mongoose = require('mongoose');
const Member = require('../src/models/Member');

async function run() {
  await mongoose.connect('mongodb://187.127.173.42:27017/political_crm');
  const res = await Member.aggregate([
    { $match: { gramPanchayat: /भी.*टा/i } },
    { $group: { _id: { village: '$village', partNumber: '$partNumber' }, count: { $sum: 1 } } },
    { $sort: { '_id.partNumber': 1 } }
  ]);
  console.log('--- Breakdown by Village and Booth ---');
  console.log(JSON.stringify(res, null, 2));

  const villageSummary = await Member.aggregate([
    { $match: { gramPanchayat: /भी.*टा/i } },
    { $group: { _id: '$village', booths: { $addToSet: '$partNumber' }, totalVoters: { $sum: 1 } } },
    { $sort: { totalVoters: -1 } }
  ]);
  console.log('\n--- Villages in Gram Panchayat Bheeta ---');
  console.log(JSON.stringify(villageSummary, null, 2));

  process.exit(0);
}

run().catch(console.error);
