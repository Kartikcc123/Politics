const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;

  const Member = mongoose.model('Member', new mongoose.Schema({}, { strict: false }));
  const ElectoralMembership = mongoose.model('ElectoralMembership', new mongoose.Schema({}, { strict: false }));

  const epics = ['SNE1533090', 'SNE0404822', 'SNE0404830', 'SNE0404814', 'SNE0313379'];
  const members = await Member.find({ epicNumber: { $in: epics } }).lean();
  console.log('--- MEMBERS ---');
  for (const m of members) {
    console.log({
      _id: m._id,
      name: m.name,
      epicNumber: m.epicNumber,
      hasAssemblyMembership: m.hasAssemblyMembership,
      hasMunicipalMembership: m.hasMunicipalMembership,
      partNumber: m.partNumber,
      voterSerial: m.voterSerial,
      wardNumber: m.wardNumber,
      wardVoterSerial: m.wardVoterSerial,
      assemblyList: m.assemblyList,
      sourceDocument: m.sourceDocument,
      source: m.source,
      wardSourceDocument: m.wardSourceDocument,
      metadata: m.metadata,
      electoralMemberships: m.electoralMemberships
    });
  }

  console.log('--- ELECTORAL MEMBERSHIPS ---');
  const memberships = await ElectoralMembership.find({
    $or: [
      { memberId: { $in: members.map(m => m._id) } },
      { epicNumber: { $in: epics } }
    ]
  }).lean();
  console.log(JSON.stringify(memberships, null, 2));

  // Also check if there are other voters with partNumber: 67 and voterSerial: 19
  console.log('--- PART 67 SERIAL 19 ---');
  const part67serial19 = await Member.find({ partNumber: 67, voterSerial: 19 }).lean();
  console.log(part67serial19.map(m => ({ _id: m._id, name: m.name, epicNumber: m.epicNumber, partNumber: m.partNumber, voterSerial: m.voterSerial, wardNumber: m.wardNumber, wardVoterSerial: m.wardVoterSerial })));

  // Also check Raipur ward 6 voters
  console.log('--- WARD 6 SAMPLE ---');
  const ward6 = await Member.find({ wardNumber: 6 }).limit(10).lean();
  console.log(ward6.map(m => ({ name: m.name, epicNumber: m.epicNumber, partNumber: m.partNumber, voterSerial: m.voterSerial, wardNumber: m.wardNumber, wardVoterSerial: m.wardVoterSerial, hasAssemblyMembership: m.hasAssemblyMembership, hasMunicipalMembership: m.hasMunicipalMembership })));

  process.exit(0);
}
check().catch(err => {
  console.error(err);
  process.exit(1);
});
