const mongoose = require('mongoose');
const Member = require('../src/models/Member');

async function run() {
  await mongoose.connect('mongodb://187.127.173.42:27017/political_crm');

  console.log('Searching for जोरावरपुरा in DB...');

  const matches = await Member.aggregate([
    {
      $match: {
        $or: [
          { sectionName: /जोरावर|जोरावरपुरा|jorawar|zorawar/i },
          { location: /जोरावर|जोरावरपुरा|jorawar|zorawar/i },
          { village: /जोरावर|जोरावरपुरा|jorawar|zorawar/i },
          { address: /जोरावर|जोरावरपुरा|jorawar|zorawar/i },
          { partName: /जोरावर|जोरावरपुरा|jorawar|zorawar/i }
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

  console.log('Results in MongoDB for जोरावरपुरा:');
  console.log(JSON.stringify(matches, null, 2));

  process.exit(0);
}

run().catch(console.error);
