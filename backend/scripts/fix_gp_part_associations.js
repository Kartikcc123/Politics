const mongoose = require('mongoose');
const MONGO_URI = 'mongodb://187.127.173.42:27017/political_crm';
const Member = require('../src/models/Member');

async function fixGpAssociations() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to DB. Cleaning mismatched gramPanchayat fields...');

  // 1. Clean parts 104+ that had gramPanchayat == 'रायपुर'
  const nonRaipur = await Member.updateMany(
    { partNumber: { $in: ['186', '188', '207', '117', '175', '101'] }, gramPanchayat: 'रायपुर' },
    { $set: { gramPanchayat: '' } }
  );
  console.log(`Cleaned ${nonRaipur.modifiedCount} voters in non-Raipur parts (186, 188, 207, etc.)`);

  // 2. Clean parts 51-56 (Koshithal) that had gramPanchayat == 'रायपुर'
  const koshithal = await Member.updateMany(
    { partNumber: { $in: ['51', '52', '53', '54', '55', '56'] }, gramPanchayat: 'रायपुर' },
    { $set: { gramPanchayat: 'कोशीथल' } }
  );
  console.log(`Updated ${koshithal.modifiedCount} voters in Koshithal parts to gramPanchayat = 'कोशीथल'`);

  // 3. Clean parts 57-61 (Sagrew) that had gramPanchayat == 'रायपुर'
  const sagrew = await Member.updateMany(
    { partNumber: { $in: ['57', '58', '59', '60', '61'] }, gramPanchayat: 'रायपुर' },
    { $set: { gramPanchayat: 'सगरेव' } }
  );
  console.log(`Updated ${sagrew.modifiedCount} voters in Sagrew parts to gramPanchayat = 'सगरेव'`);

  // 4. Set true parts 62 to 68 strictly to gramPanchayat = 'रायपुर'
  const raipur = await Member.updateMany(
    { partNumber: { $in: ['62', '63', '64', '65', '66', '67', '68'] } },
    { $set: { gramPanchayat: 'रायपुर', village: 'रायपुर' } }
  );
  console.log(`Ensured ${raipur.modifiedCount} voters in Parts 62-68 are strictly in Raipur GP`);

  // Check Raipur GP parts now
  const raipurPartsNow = await Member.aggregate([
    { $match: { gramPanchayat: 'रायपुर' } },
    { $group: { _id: '$partNumber', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
  console.log('\nRaipur GP Parts NOW:', raipurPartsNow);

  await mongoose.disconnect();
}

fixGpAssociations().catch(console.error);
