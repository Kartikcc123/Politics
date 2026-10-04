const mongoose = require('mongoose');

async function checkAllGps() {
  await mongoose.connect('mongodb://187.127.173.42:27017/political_crm');
  const db = mongoose.connection.db;

  const gps = await db.collection('members').distinct('gramPanchayat');
  console.log(`Found ${gps.length} distinct gramPanchayats in members collection:`, gps);

  // Check bad Ward objects in members
  const partScopeMembers = await db.collection('members').countDocuments({
    $or: [
      { wardNumber: /PartScope/i },
      { 'ward.number': /PartScope/i }
    ]
  });
  console.log(`Members with PartScope in wardNumber: ${partScopeMembers}`);

  // Check Ward collection
  const wards = await db.collection('wards').find({}).toArray();
  console.log(`Total wards in 'wards' collection: ${wards.length}`);
  for (const w of wards) {
    console.log(`Ward _id: ${w._id}, number: ${w.number}, name: ${w.name}`);
  }

  // Check all village values per GP and Ward
  const breakdown = await db.collection('members').aggregate([
    {
      $group: {
        _id: { gp: '$gramPanchayat', ward: '$wardNumber', village: '$village' },
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id.gp': 1, '_id.ward': 1, count: -1 } }
  ]).toArray();

  console.log(`Total GP-Ward-Village combinations: ${breakdown.length}`);
  
  // Let's filter out only Raipur 29 GPs or all GPs
  const gpMap = {};
  for (const item of breakdown) {
    const gp = item._id.gp || 'NO_GP';
    const ward = item._id.ward || 'NO_WARD';
    const village = item._id.village || 'NO_VILLAGE';
    if (!gpMap[gp]) gpMap[gp] = {};
    if (!gpMap[gp][ward]) gpMap[gp][ward] = [];
    gpMap[gp][ward].push({ village, count: item.count });
  }

  console.log('\n================ ALL GP BREAKDOWN ================');
  for (const gp of Object.keys(gpMap).sort()) {
    console.log(`\n--- GP: "${gp}" ---`);
    for (const ward of Object.keys(gpMap[gp]).sort((a,b) => parseInt(a)||0 - parseInt(b)||0)) {
      console.log(`  Ward ${ward}: ${JSON.stringify(gpMap[gp][ward])}`);
    }
  }

  await mongoose.disconnect();
}

checkAllGps().catch(console.error);
