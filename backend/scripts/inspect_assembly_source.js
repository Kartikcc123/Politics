const mongoose = require('mongoose');

async function inspectAssemblySource() {
  await mongoose.connect('mongodb://187.127.173.42:27017/political_crm');
  
  // List collections
  const collections = await mongoose.connection.db.listCollections().toArray();
  console.log('Collections in DB:', collections.map(c => c.name));

  const Member = mongoose.model('Member', new mongoose.Schema({}, { strict: false }));

  // Check some assembly members
  const docs = await Member.find({ hasAssemblyMembership: true }).limit(10);
  console.log('\n--- Assembly docs inspection ---');
  docs.forEach(d => {
    const obj = d.toObject();
    console.log({
      _id: obj._id,
      voterId: obj.voterId,
      name: obj.name,
      guardianName: obj.guardianName,
      relativeName: obj.relativeName,
      sourceDocument: obj.sourceDocument,
      ocrValues: obj.ocrValues,
      assemblyName: obj.assemblyName,
      partNumber: obj.partNumber,
      sectionName: obj.sectionName,
      voterSerial: obj.voterSerial,
      wardVoterSerial: obj.wardVoterSerial
    });
  });

  await mongoose.disconnect();
}

inspectAssemblySource().catch(console.error);
