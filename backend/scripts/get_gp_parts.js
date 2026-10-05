const mongoose = require('mongoose');
const Member = require('../src/models/Member');

async function getGpPartsMapping() {
  await mongoose.connect('mongodb://187.127.173.42:27017/political_crm');

  const breakdown = await Member.aggregate([
    {
      $match: {
        gramPanchayat: { $nin: ['', null] },
        partNumber: { $nin: ['', null] }
      }
    },
    {
      $group: {
        _id: { gp: '$gramPanchayat', part: '$partNumber' },
        villages: { $addToSet: '$village' },
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id.gp': 1, '_id.part': 1 } }
  ]);

  const gpParts = {};
  for (const row of breakdown) {
    const gp = row._id.gp;
    const part = row._id.part;
    if (!gpParts[gp]) gpParts[gp] = [];
    gpParts[gp].push({
      partNumber: part,
      villages: row.villages.filter(Boolean),
      voterCount: row.count
    });
  }

  console.log('Sample GP Parts:', JSON.stringify(Object.entries(gpParts).slice(0, 10), null, 2));

  // Also check dynamic fetch via API or if we can fetch on runtime in samiti_hierarchy_page.dart
  console.log('Total GPs mapped with parts:', Object.keys(gpParts).length);

  await mongoose.disconnect();
}
getGpPartsMapping();
