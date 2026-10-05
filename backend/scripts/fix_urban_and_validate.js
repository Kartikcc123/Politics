const mongoose = require('mongoose');
const MONGO_URI = 'mongodb://187.127.173.42:27017/political_crm';
const Member = require('../src/models/Member');

async function fixUrbanAndValidate() {
  await mongoose.connect(MONGO_URI);
  
  // Ganga पुर parts (151 to 191)
  const gangapurRes = await Member.updateMany(
    { partNumber: { $in: ['151', '152', '153', '154', '155', '178', '179', '180', '181', '182', '183', '184', '185', '186', '187', '188', '189', '190', '191'] }, village: { $in: ['न॑', '', null, 'undefined'] } },
    { $set: { village: 'गंगापुर', municipality: 'गंगापुर' } }
  );
  console.log('Fixed Gangapur voters:', gangapurRes.modifiedCount);

  // Part 3 voters
  const part3Res = await Member.updateMany(
    { partNumber: '3', village: { $in: ['न॑', '', null, 'undefined'] } },
    { $set: { village: 'थोरिया खेड़ा' } }
  );
  console.log('Fixed Part 3 voters:', part3Res.modifiedCount);

  // Check top 25 villages now
  const topVillages = await Member.aggregate([
    { $match: { village: { $nin: ['', null, 'undefined'] } } },
    { $group: { _id: '$village', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 25 }
  ]);
  console.log('\nTop 25 Villages Across Entire DB:');
  topVillages.forEach((v, idx) => console.log(`  ${idx + 1}. "${v._id}": ${v.count} voters`));

  const total = await Member.countDocuments();
  const populated = await Member.countDocuments({ village: { $nin: ['', null, 'undefined'] } });
  console.log(`\nOverall Success: ${populated} / ${total} (${((populated/total)*100).toFixed(2)}%) voters have valid clean village names.`);

  await mongoose.disconnect();
}

fixUrbanAndValidate().catch(console.error);
