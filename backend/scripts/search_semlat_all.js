const mongoose = require('mongoose');
const Member = require('../src/models/Member');

async function run() {
  await mongoose.connect('mongodb://187.127.173.42:27017/political_crm');

  console.log('Searching for all occurrences of सेमलाट in DB...');
  const results = await Member.aggregate([
    {
      $match: {
        $or: [
          { sectionName: /सेमलाट|सेमलेट|semlat/i },
          { location: /सेमलाट|सेमलेट|semlat/i },
          { address: /सेमलाट|सेमलेट|semlat/i },
          { village: /सेमलाट|सेमलेट|semlat/i },
          { partName: /सेमलाट|सेमलेट|semlat/i }
        ]
      }
    },
    {
      $group: {
        _id: {
          partNumber: '$partNumber',
          sectionNumber: '$sectionNumber',
          sectionName: '$sectionName',
          village: '$village',
          gramPanchayat: '$gramPanchayat'
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id.partNumber': 1 } }
  ]);

  console.log('Results in MongoDB:');
  console.log(JSON.stringify(results, null, 2));

  // Also check Booth 1 & Booth 2 full section details
  const b12 = await Member.aggregate([
    { $match: { partNumber: { $in: ['1', '2', 1, 2] } } },
    { $group: { _id: { part: '$partNumber', secNo: '$sectionNumber', sec: '$sectionName' }, count: { $sum: 1 } } },
    { $sort: { '_id.part': 1, '_id.secNo': 1 } }
  ]);
  console.log('\nAll Sections in Booth 1 and 2:');
  console.log(JSON.stringify(b12, null, 2));

  process.exit(0);
}

run().catch(console.error);
