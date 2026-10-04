const mongoose = require('mongoose');

async function checkIndexes() {
  await mongoose.connect('mongodb://187.127.173.42:27017/political_crm');
  const Member = mongoose.model('Member', new mongoose.Schema({}, { strict: false }));
  const indexes = await Member.collection.indexes();
  console.log('Indexes on members collection:');
  console.log(JSON.stringify(indexes, null, 2));
  await mongoose.disconnect();
}

checkIndexes().catch(console.error);
