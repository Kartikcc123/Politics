const mongoose = require('mongoose');
const Member = require('../src/models/Member');

async function run() {
  await mongoose.connect('mongodb://187.127.173.42:27017/political_crm');

  const b1234 = await Member.find({ partNumber: { $in: ['1', '2', '3', '4', 1, 2, 3, 4] } }).limit(100).lean();
  console.log('Total sample voters:', b1234.length);

  const sections = await Member.aggregate([
    { $match: { partNumber: { $in: ['1', '2', '3', '4', 1, 2, 3, 4] } } },
    { $group: { _id: { part: '$partNumber', sec: '$sectionName', loc: '$location', secNo: '$sectionNumber' }, count: { $sum: 1 } } }
  ]);
  console.log('Sections found in Booths 1-4:');
  console.log(JSON.stringify(sections, null, 2));

  process.exit(0);
}

run().catch(console.error);
