const mongoose = require('mongoose');
const fs = require('fs');

async function dumpFullBreakdown() {
  await mongoose.connect('mongodb://187.127.173.42:27017/political_crm');
  const db = mongoose.connection.db;

  const breakdown = await db.collection('members').aggregate([
    {
      $group: {
        _id: { gp: '$gramPanchayat', ward: '$wardNumber', village: '$village' },
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id.gp': 1, '_id.ward': 1, count: -1 } }
  ]).toArray();

  const gpMap = {};
  for (const item of breakdown) {
    const gp = item._id.gp || 'NO_GP';
    const ward = item._id.ward || 'NO_WARD';
    const village = item._id.village || 'NO_VILLAGE';
    if (!gpMap[gp]) gpMap[gp] = {};
    if (!gpMap[gp][ward]) gpMap[gp][ward] = [];
    gpMap[gp][ward].push({ village, count: item.count });
  }

  fs.writeFileSync('scripts/gp_ward_village_breakdown.json', JSON.stringify(gpMap, null, 2));
  console.log('Saved full breakdown to scripts/gp_ward_village_breakdown.json');
  console.log('GPs found:', Object.keys(gpMap));

  await mongoose.disconnect();
}

dumpFullBreakdown().catch(console.error);
