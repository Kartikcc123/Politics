const mongoose = require('mongoose');
const Member = require('../src/models/Member');

async function run() {
  await mongoose.connect('mongodb://187.127.173.42:27017/political_crm');

  const booths1to103 = Array.from({ length: 103 }, (_, i) => String(i + 1));

  // Search for any rupa / sem in 1 to 103
  const rupa1to103 = await Member.aggregate([
    {
      $match: {
        partNumber: { $in: booths1to103 },
        $or: [
          { sectionName: /रूपा|रुपा|रूप|रुप|खेडा|खेड़ा/i },
          { location: /रूपा|रुपा/i },
          { village: /रूपा|रुपा/i }
        ]
      }
    },
    {
      $group: {
        _id: {
          partNumber: '$partNumber',
          sectionName: '$sectionName',
          village: '$village',
          gramPanchayat: '$gramPanchayat'
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id.partNumber': 1 } }
  ]);

  console.log('--- Matches with रूपा/रुपा/रूपाखेड़ा in Booths 1-103 ---');
  const onlyRupa = rupa1to103.filter(r => /रूपा|रुपा/i.test(r._id.sectionName) || /रूपा|रुपा/i.test(r._id.village) || /रूपा|रुपा/i.test(r._id.location));
  console.log(JSON.stringify(onlyRupa, null, 2));

  // Also find all 'खेड़ा' in 1-103 to see what khedas exist in 1 to 103
  const allKhedas = await Member.aggregate([
    {
      $match: {
        partNumber: { $in: booths1to103 },
        village: /खेड़ा|खेडी|खेड़ी/i
      }
    },
    {
      $group: {
        _id: { partNumber: '$partNumber', village: '$village', gp: '$gramPanchayat' },
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id.partNumber': 1 } }
  ]);
  console.log('\n--- All Kheda Villages in 1-103 ---');
  console.log(JSON.stringify(allKhedas, null, 2));

  process.exit(0);
}

run().catch(console.error);
