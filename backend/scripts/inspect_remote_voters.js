const mongoose = require('mongoose');

const URI = process.env.MONGO_URI || 'mongodb://187.127.173.42:27017/political_crm';

async function test() {
  console.log('Connecting to', URI);
  await mongoose.connect(URI, { serverSelectionTimeoutMS: 8000 });
  console.log('Connected successfully!');
  const Member = mongoose.model('Member', new mongoose.Schema({}, { strict: false }));
  
  const count = await Member.countDocuments();
  console.log('Total members in DB:', count);

  const epics = ['SNE1533090', 'SNE0404822', 'SNE0404830', 'SNE0404814', 'SNE0313379', 'RJ/20/152/057399', 'KDY1221381'];
  const members = await Member.find({ 
    $or: [
      { voterId: { $in: epics } },
      { epicNumber: { $in: epics } }
    ]
  }).lean();

  console.log('Members found:', members.length);
  for (const m of members) {
    console.log(JSON.stringify({
      _id: m._id,
      name: m.name,
      guardianName: m.guardianName,
      voterId: m.voterId,
      epicNumber: m.epicNumber,
      hasAssemblyMembership: m.hasAssemblyMembership,
      hasMunicipalMembership: m.hasMunicipalMembership,
      assemblyNumber: m.assemblyNumber,
      partNumber: m.partNumber,
      voterSerial: m.voterSerial,
      wardNumber: m.wardNumber,
      wardVoterSerial: m.wardVoterSerial,
      wardSerialMap: m.wardSerialMap,
      municipalWardNumbers: m.municipalWardNumbers,
      village: m.village,
      gramPanchayat: m.gramPanchayat,
      sourceDocument: m.sourceDocument
    }, null, 2));
  }

  // Let's also find all records for Manisha (by name)
  const manishaRecords = await Member.find({ name: /मनीषा/ }).limit(5).lean();
  console.log('--- Manisha records ---');
  for (const m of manishaRecords) {
    console.log(JSON.stringify({
      _id: m._id,
      name: m.name,
      guardianName: m.guardianName,
      voterId: m.voterId,
      partNumber: m.partNumber,
      voterSerial: m.voterSerial,
      wardNumber: m.wardNumber,
      wardVoterSerial: m.wardVoterSerial,
      hasAssemblyMembership: m.hasAssemblyMembership,
      hasMunicipalMembership: m.hasMunicipalMembership,
      gramPanchayat: m.gramPanchayat,
      village: m.village,
      sourceDocument: m.sourceDocument
    }, null, 2));
  }

  // Let's also check Ward 6 voters
  const ward6Sample = await Member.find({ wardNumber: '6' }).limit(5).lean();
  console.log('--- Ward 6 sample ---');
  for (const m of ward6Sample) {
    console.log(JSON.stringify({
      _id: m._id,
      name: m.name,
      voterId: m.voterId,
      partNumber: m.partNumber,
      voterSerial: m.voterSerial,
      wardNumber: m.wardNumber,
      wardVoterSerial: m.wardVoterSerial,
      hasAssemblyMembership: m.hasAssemblyMembership,
      hasMunicipalMembership: m.hasMunicipalMembership,
      sourceDocument: m.sourceDocument
    }, null, 2));
  }

  process.exit(0);
}
test().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
