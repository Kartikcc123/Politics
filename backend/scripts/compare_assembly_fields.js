const mongoose = require('mongoose');

async function inspectAssemblyAllFields() {
  await mongoose.connect('mongodb://187.127.173.42:27017/political_crm');
  const Member = mongoose.model('Member', new mongoose.Schema({}, { strict: false }));

  // Check 5 assembly members that were NOT touched by ward sync (e.g. partNumber 150 or 200)
  const untouchedSample = await Member.find({ hasAssemblyMembership: true, hasMunicipalMembership: { $ne: true } }).limit(5);
  console.log('--- 5 Untouched Assembly Members ---');
  untouchedSample.forEach(m => {
    console.log({
      epic: m.get('voterId'),
      name: m.get('name'),
      guardian: m.get('guardianName'),
      relativeName: m.get('relativeName'),
      partNumber: m.get('partNumber'),
      hasMunicipal: m.get('hasMunicipalMembership')
    });
  });

  // Check 5 Assembly members that WERE touched by ward sync
  const touchedSample = await Member.find({ hasAssemblyMembership: true, hasMunicipalMembership: true }).limit(5);
  console.log('\n--- 5 Touched Assembly Members ---');
  touchedSample.forEach(m => {
    console.log({
      epic: m.get('voterId'),
      name: m.get('name'),
      guardian: m.get('guardianName'),
      relativeName: m.get('relativeName'),
      partNumber: m.get('partNumber'),
      hasMunicipal: m.get('hasMunicipalMembership')
    });
  });

  await mongoose.disconnect();
}

inspectAssemblyAllFields().catch(console.error);
