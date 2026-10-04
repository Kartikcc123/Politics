const mongoose = require('mongoose');

async function inspectWardsAndVillages() {
  await mongoose.connect('mongodb://187.127.173.42:27017/political_crm');
  const db = mongoose.connection.db;

  console.log('=== CHECKING WARD DOC 6abac076eccec0bb503f5935 ===');
  const wardDoc = await db.collection('wards').findOne({ _id: new mongoose.Types.ObjectId('6abac076eccec0bb503f5935') });
  console.log('Ward doc:', wardDoc);

  console.log('=== CHECKING ALL WARDS WITH PartScope IN NUMBER OR NAME ===');
  const partScopeWards = await db.collection('wards').find({
    $or: [
      { number: /PartScope/i },
      { name: /PartScope/i }
    ]
  }).toArray();
  console.log(`Found ${partScopeWards.length} wards with PartScope:`, partScopeWards.map(w => ({ id: w._id, number: w.number, name: w.name, gramPanchayat: w.gramPanchayat })));

  console.log('=== CHECKING DISTINCT VILLAGES PER GRAM PANCHAYAT ===');
  const gps = await db.collection('members').distinct('gramPanchayat');
  console.log('All Gram Panchayats in DB:', gps);

  for (const gp of gps) {
    if (!gp) continue;
    const villages = await db.collection('members').distinct('village', { gramPanchayat: gp });
    const wardNumbers = await db.collection('members').distinct('wardNumber', { gramPanchayat: gp });
    console.log(`\nGP: "${gp}" -> Villages:`, villages, `| WardNumbers:`, wardNumbers);
  }

  await mongoose.disconnect();
}

inspectWardsAndVillages().catch(console.error);
