const mongoose = require('mongoose');

async function cleanAll() {
  await mongoose.connect('mongodb://187.127.173.42:27017/political_crm');
  const res = await mongoose.connection.db.collection('members').updateMany(
    { ward: { $ne: null } },
    { $set: { ward: null } }
  );
  console.log('Unset legacy ward field for:', res.modifiedCount);
  await mongoose.disconnect();
}

cleanAll().catch(console.error);
