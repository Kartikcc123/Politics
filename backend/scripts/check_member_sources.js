const mongoose = require('mongoose');

async function checkMemberFields() {
  await mongoose.connect('mongodb://187.127.173.42:27017/political_crm');
  const Member = mongoose.model('Member', new mongoose.Schema({}, { strict: false }));

  // Check 20 assembly members in Thala / Raipur / Bheeta
  const sample = await Member.find({ hasAssemblyMembership: true, gramPanchayat: 'थला' }).limit(20);
  console.log('Sample 20 from Thala:');
  sample.forEach(m => {
    console.log({
      epic: m.get('voterId'),
      name: m.get('name'),
      guardianName: m.get('guardianName'),
      wardVoterSerial: m.get('wardVoterSerial'),
      partNumber: m.get('partNumber'),
      ocrValues: m.get('ocrValues'),
      ocrRaw: m.get('ocrValues.raw'),
      ocrVerified: m.get('ocrValues.verified')
    });
  });

  // Check if there are other collections like electorallists or electoralmemberships
  const ElectoralList = mongoose.model('ElectoralList', new mongoose.Schema({}, { strict: false }));
  const elCount = await ElectoralList.countDocuments();
  console.log('ElectoralList count:', elCount);
  if (elCount > 0) {
    const elSample = await ElectoralList.find().limit(2);
    console.log('ElectoralList sample:', JSON.stringify(elSample, null, 2));
  }

  const ElectoralMembership = mongoose.model('ElectoralMembership', new mongoose.Schema({}, { strict: false }));
  const emCount = await ElectoralMembership.countDocuments();
  console.log('ElectoralMembership count:', emCount);
  if (emCount > 0) {
    const emSample = await ElectoralMembership.find().limit(2);
    console.log('ElectoralMembership sample:', JSON.stringify(emSample, null, 2));
  }

  await mongoose.disconnect();
}
checkMemberFields().catch(console.error);
