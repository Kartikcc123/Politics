const mongoose = require('mongoose');
const Member = require('../src/models/Member');

async function check() {
  await mongoose.connect('mongodb://187.127.173.42:27017/political_crm');
  const countWithCaste = await Member.countDocuments({ caste: { $exists: true, $ne: '' } });
  const countWithMobile = await Member.countDocuments({ mobile: { $exists: true, $ne: '' } });
  console.log({ countWithCaste, countWithMobile });
  await mongoose.disconnect();
}
check().catch(console.error);
