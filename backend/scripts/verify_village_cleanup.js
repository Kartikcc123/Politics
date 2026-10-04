const mongoose = require('mongoose');

async function verify() {
  await mongoose.connect('mongodb://187.127.173.42:27017/political_crm');
  const db = mongoose.connection.db;

  const bheetaW1 = await db.collection('members').findOne({ voterId: 'SNE0151910' });
  console.log('--- VERIFYING SNE0151910 ---');
  console.log({
    name: bheetaW1.name,
    voterId: bheetaW1.voterId,
    gramPanchayat: bheetaW1.gramPanchayat,
    wardNumber: bheetaW1.wardNumber,
    ward: bheetaW1.ward,
    village: bheetaW1.village
  });

  const partScopeLeft = await db.collection('members').countDocuments({
    $or: [{ wardNumber: /PartScope/i }, { ward: { $ne: null } }]
  });
  console.log('Members with remaining ward object or PartScope:', partScopeLeft);

  const distinctBheetaVillages = await db.collection('members').distinct('village', { gramPanchayat: 'भींटा' });
  console.log('All villages under GP भींटा:', distinctBheetaVillages);

  await mongoose.disconnect();
}

verify().catch(console.error);
