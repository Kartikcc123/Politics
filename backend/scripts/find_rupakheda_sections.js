const mongoose = require('mongoose');
const Member = require('../src/models/Member');

async function run() {
  await mongoose.connect('mongodb://187.127.173.42:27017/political_crm');

  const rupaSections = await Member.aggregate([
    { $match: { $or: [{ sectionName: /रूपा|रुपा/i }, { location: /रूपा|रुपा/i }] } },
    { $group: { _id: { part: '$partNumber', sec: '$sectionName', loc: '$location' }, count: { $sum: 1 } } }
  ]);
  console.log('Sections with Rupakheda in entire DB:');
  console.log(JSON.stringify(rupaSections, null, 2));

  // Also search for any section in Part 1 to 4
  const allSecs1to4 = await Member.aggregate([
    { $match: { partNumber: { $in: ['1', '2', '3', '4', 1, 2, 3, 4] } } },
    { $group: { _id: { part: '$partNumber', sec: '$sectionName' }, count: { $sum: 1 } } },
    { $sort: { '_id.part': 1, '_id.sec': 1 } }
  ]);
  console.log('\nAll distinct sections in Parts 1 to 4:');
  console.log(JSON.stringify(allSecs1to4, null, 2));

  process.exit(0);
}

run().catch(console.error);
