const mongoose = require('mongoose');
const Member = require('../src/models/Member');

async function run() {
  await mongoose.connect('mongodb://187.127.173.42:27017/political_crm');

  // 1. Update Semlat voters in Booth 1
  const semlatRes = await Member.updateMany(
    { partNumber: { $in: ['1', 1] }, sectionName: /सेमलाट/i },
    { $set: { village: 'सेमलाट', gramPanchayat: 'भींटा', tehsil: 'रायपुर' } }
  );
  console.log('✅ Semlat voters tagged in Booth 1:', semlatRes.modifiedCount);

  // 2. Check if other voters have specific majras/villages
  const semlatCount = await Member.countDocuments({ village: 'सेमलाट' });
  console.log('Total Semlat voters in DB now:', semlatCount);

  process.exit(0);
}

run().catch(console.error);
