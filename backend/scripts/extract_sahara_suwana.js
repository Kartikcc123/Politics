const mongoose = require('mongoose');
const MONGO_URI = 'mongodb://187.127.173.42:27017/political_crm';
const Member = require('../src/models/Member');

async function getSaharaData() {
  await mongoose.connect(MONGO_URI);

  // Sahara parts 104 to 244
  const saharaParts = [];
  for (let i = 104; i <= 244; i++) saharaParts.push(String(i));

  const saharaAgg = await Member.aggregate([
    { $match: { partNumber: { $in: saharaParts } } },
    { $group: {
      _id: { village: '$village', part: '$partNumber' },
      count: { $sum: 1 }
    } },
    { $sort: { '_id.village': 1, '_id.part': 1 } }
  ]);

  const saharaVillages = {};
  saharaAgg.forEach(row => {
    const v = row._id.village || 'अज्ञात';
    if (!saharaVillages[v]) saharaVillages[v] = { parts: [], total: 0 };
    saharaVillages[v].parts.push(row._id.part);
    saharaVillages[v].total += row.count;
  });

  console.log('=== SAHARA SAMITI (Parts 104-244) VILLAGES & PARTS ===');
  Object.entries(saharaVillages)
    .sort((a, b) => b[1].total - a[1].total)
    .forEach(([v, data]) => {
      console.log(`"${v}": Parts [${data.parts.join(', ')}], Total: ${data.total} voters`);
    });

  // Suwana parts 245 to 301
  const suwanaParts = [];
  for (let i = 245; i <= 301; i++) suwanaParts.push(String(i));
  const suwanaAgg = await Member.aggregate([
    { $match: { partNumber: { $in: suwanaParts } } },
    { $group: {
      _id: { village: '$village', part: '$partNumber' },
      count: { $sum: 1 }
    } },
    { $sort: { '_id.village': 1, '_id.part': 1 } }
  ]);
  const suwanaVillages = {};
  suwanaAgg.forEach(row => {
    const v = row._id.village || 'अज्ञात';
    if (!suwanaVillages[v]) suwanaVillages[v] = { parts: [], total: 0 };
    suwanaVillages[v].parts.push(row._id.part);
    suwanaVillages[v].total += row.count;
  });
  console.log('\n=== SUWANA SAMITI (Parts 245-301) VILLAGES & PARTS ===');
  Object.entries(suwanaVillages)
    .sort((a, b) => b[1].total - a[1].total)
    .forEach(([v, data]) => {
      console.log(`"${v}": Parts [${data.parts.join(', ')}], Total: ${data.total} voters`);
    });

  await mongoose.disconnect();
}

getSaharaData().catch(console.error);
