const mongoose = require('mongoose');
const Member = require('../src/models/Member');

async function testVoter() {
  await mongoose.connect('mongodb://187.127.173.42:27017/political_crm');
  
  const v = await Member.findOne({ voterId: 'KDY0970392' });
  console.log('KDY0970392 doc:', v);

  // Also search for "शीतल" with father "राधेश्याम" in Assembly voters
  const asmMatches = await Member.find({
    name: /शीतल/i,
    guardianName: /राधेश्याम/i
  });
  console.log('Assembly matches for शीतल:', asmMatches.map(m => ({
    name: m.name,
    guardianName: m.guardianName,
    voterId: m.voterId,
    hasAssemblyMembership: m.hasAssemblyMembership,
    hasMunicipalMembership: m.hasMunicipalMembership
  })));

  process.exit(0);
}
testVoter();
