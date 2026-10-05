const mongoose = require('mongoose');
const MONGO_URI = 'mongodb://187.127.173.42:27017/political_crm';
const Member = require('../src/models/Member');

async function check() {
  await mongoose.connect(MONGO_URI);
  const total = await Member.countDocuments();
  console.log('Total members in DB:', total);

  // Group by village
  const villages = await Member.aggregate([
    { $group: { _id: '$village', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 30 }
  ]);
  console.log('Top 30 village field values in Member collection:');
  villages.forEach(v => console.log(`  - "${v._id}": ${v.count} voters`));

  // Check some samples with strange village names
  const samples = await Member.find({})
    .select('name voterId partNumber sectionName village gramPanchayat location')
    .limit(10)
    .lean();
  console.log('\nSample Voters:');
  samples.forEach(s => {
    console.log(`Name: ${s.name}, Part: ${s.partNumber}, Section: "${s.sectionName}", Village: "${s.village}", GP: "${s.gramPanchayat}", Location: "${s.location}"`);
  });

  // Check how many have partNumber vs village discrepancies (e.g. part 62-73 are Raipur, what villages do they have?)
  const raipurParts = await Member.aggregate([
    { $match: { partNumber: { $in: ['62', '63', '64', '65', '66', '67', '68', '69', '70', '71', '72', '73'] } } },
    { $group: { _id: { partNumber: '$partNumber', village: '$village', sectionName: '$sectionName' }, count: { $sum: 1 } } },
    { $sort: { '_id.partNumber': 1, count: -1 } }
  ]);
  console.log('\nRaipur Parts (62-73) Village and Section breakdown:');
  raipurParts.forEach(r => console.log(`  Part ${r._id.partNumber} -> Village: "${r._id.village}" | Section: "${r._id.sectionName}" (${r.count} voters)`));

  // Also check other parts like 1-61 or 74+
  const otherParts = await Member.aggregate([
    { $match: { partNumber: { $nin: ['62', '63', '64', '65', '66', '67', '68', '69', '70', '71', '72', '73'] } } },
    { $group: { _id: { partNumber: '$partNumber', village: '$village' }, count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 20 }
  ]);
  console.log('\nOther Parts Sample Village mappings:');
  otherParts.forEach(r => console.log(`  Part ${r._id.partNumber} -> Village: "${r._id.village}" (${r.count} voters)`));

  await mongoose.disconnect();
}

check().catch(console.error);
