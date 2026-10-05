const mongoose = require('mongoose');
const MONGO_URI = 'mongodb://187.127.173.42:27017/political_crm';
const Member = require('../src/models/Member');

async function check() {
  await mongoose.connect(MONGO_URI);
  const total = await Member.countDocuments();
  const populated = await Member.countDocuments({ village: { $nin: ['', null, 'undefined'] } });
  const blank = await Member.countDocuments({ $or: [{ village: '' }, { village: null }, { village: { $exists: false } }, { village: 'undefined' }] });
  
  console.log(`\n=== DATABASE VILLAGE PROGRESS ===`);
  console.log(`Total Voters: ${total}`);
  console.log(`Populated Village: ${populated} (${((populated/total)*100).toFixed(1)}%)`);
  console.log(`Blank Village: ${blank} (${((blank/total)*100).toFixed(1)}%)`);

  const topVillages = await Member.aggregate([
    { $match: { village: { $nin: ['', null, 'undefined'] } } },
    { $group: { _id: '$village', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 20 }
  ]);
  console.log('\nTop 20 Villages by Voter Count:');
  topVillages.forEach((v, idx) => console.log(`  ${idx + 1}. "${v._id}": ${v.count} voters`));

  // Check Raipur area parts
  console.log('\nSample Check for Raipur & other Parts:');
  for (const p of ['62', '65', '70', '71', '72', '73', '91', '92', '93', '96', '97']) {
    const s = await Member.findOne({ partNumber: p }).select('name partNumber sectionName village').lean();
    console.log(`  Part ${p}: Voter "${s?.name}" -> Village: "${s?.village}" (Section: "${s?.sectionName}")`);
  }

  await mongoose.disconnect();
}

check().catch(console.error);
