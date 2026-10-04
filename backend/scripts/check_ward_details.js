const mongoose = require('mongoose');

async function checkWard() {
  await mongoose.connect('mongodb://187.127.173.42:27017/political_crm');
  const db = mongoose.connection.db;

  const w = await db.collection('wards').findOne({ _id: new mongoose.Types.ObjectId('6abac076eccec0bb503f5935') });
  console.log('Ward 6abac076eccec0bb503f5935:', w);

  const allWards = await db.collection('wards').find({}).toArray();
  console.log(`Total wards in DB: ${allWards.length}`);
  const badWards = allWards.filter(x => x.number && x.number.includes('PartScope'));
  console.log(`Wards with PartScope in number: ${badWards.length}`);
  if (badWards.length > 0) {
    console.log('Sample bad wards:', badWards.slice(0, 10));
  }

  await mongoose.disconnect();
}

checkWard().catch(console.error);
