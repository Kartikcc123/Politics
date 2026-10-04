const mongoose = require('mongoose');

async function testNativeBulk() {
  await mongoose.connect('mongodb://187.127.173.42:27017/political_crm');
  const collection = mongoose.connection.db.collection('members');

  console.time('nativeBulkWrite');
  const ops = [
    {
      updateOne: {
        filter: { voterId: 'SNE1307248' },
        update: { $set: { caste: 'गुर्जर', name: 'लक्ष्मी देवी' } }
      }
    }
  ];
  const res = await collection.bulkWrite(ops, { ordered: false });
  console.timeEnd('nativeBulkWrite');
  console.log('Result:', res.modifiedCount);

  await mongoose.disconnect();
}

testNativeBulk().catch(console.error);
