const mongoose = require('mongoose');
const Member = require('../src/models/Member');

async function checkKdy() {
  await mongoose.connect('mongodb://187.127.173.42:27017/political_crm');
  const m = await Member.findOne({ voterId: 'KDY0970392' });
  console.log('Member in DB:', m);
  process.exit(0);
}
checkKdy();
