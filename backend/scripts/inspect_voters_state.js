const mongoose = require('mongoose');
const Member = require('../src/models/Member');

async function inspect() {
  await mongoose.connect('mongodb://187.127.173.42:27017/political_crm');
  console.log('Connected to DB');

  const totalMembers = await Member.countDocuments();
  const assemblyCount = await Member.countDocuments({ hasAssemblyMembership: true });
  const wardOnlyCount = await Member.countDocuments({ hasAssemblyMembership: false });
  console.log({ totalMembers, assemblyCount, wardOnlyCount });

  const sampleAssembly = await Member.findOne({ hasAssemblyMembership: true, voterId: { $exists: true, $ne: '' } });
  console.log('\n--- Sample Assembly Member ---');
  console.log(JSON.stringify(sampleAssembly, null, 2));

  const sampleWardOnly = await Member.findOne({ hasAssemblyMembership: false });
  console.log('\n--- Sample Ward-Only Member ---');
  console.log(JSON.stringify(sampleWardOnly, null, 2));

  // Check some members with assembly membership to see what names they have
  const someAssembly = await Member.find({ hasAssemblyMembership: true }).limit(5);
  console.log('\n--- 5 Assembly Members ---');
  someAssembly.forEach(m => console.log({ id: m._id, name: m.name, relativeName: m.relativeName, voterId: m.voterId, wardNumber: m.wardNumber, gramPanchayat: m.gramPanchayat, hasAssemblyMembership: m.hasAssemblyMembership, ocrValues: m.ocrValues }));

  await mongoose.disconnect();
}

inspect().catch(err => {
  console.error(err);
  process.exit(1);
});
