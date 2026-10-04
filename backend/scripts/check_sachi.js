const mongoose = require('mongoose');
const Member = require('../src/models/Member');

async function findSachi() {
  await mongoose.connect('mongodb://187.127.173.42:27017/political_crm');
  
  const docs = await Member.find({ name: /साचि/ });
  console.log('Found docs matching /साचि/:', docs.map(d => ({
    _id: d._id,
    name: d.name,
    voterId: d.voterId,
    wardVoterSerial: d.wardVoterSerial,
    voterSerial: d.voterSerial,
    wardNumber: d.wardNumber,
    gramPanchayat: d.gramPanchayat,
    village: d.village,
    hasAssemblyMembership: d.hasAssemblyMembership,
    hasMunicipalMembership: d.hasMunicipalMembership,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt
  })));

  const epicDoc = await Member.findOne({ voterId: 'SNE1013739' });
  console.log('\nFound doc with EPIC SNE1013739:', epicDoc ? {
    _id: epicDoc._id,
    name: epicDoc.name,
    guardianName: epicDoc.guardianName,
    voterId: epicDoc.voterId,
    wardVoterSerial: epicDoc.wardVoterSerial,
    voterSerial: epicDoc.voterSerial,
    wardNumber: epicDoc.wardNumber,
    gramPanchayat: epicDoc.gramPanchayat,
    village: epicDoc.village,
    hasAssemblyMembership: epicDoc.hasAssemblyMembership,
    hasMunicipalMembership: epicDoc.hasMunicipalMembership,
    municipalWardNumbers: epicDoc.municipalWardNumbers
  } : 'NOT FOUND');

  const allBheetaW1S28 = await Member.find({
    gramPanchayat: 'भींटा',
    wardNumber: '1',
    $or: [{ wardVoterSerial: '28' }, { voterSerial: '28' }]
  });
  console.log('\nAll Bheeta Ward 1 Serial 28:', allBheetaW1S28.map(d => ({
    _id: d._id,
    name: d.name,
    guardianName: d.guardianName,
    voterId: d.voterId,
    wardVoterSerial: d.wardVoterSerial,
    voterSerial: d.voterSerial,
    hasAssemblyMembership: d.hasAssemblyMembership,
    hasMunicipalMembership: d.hasMunicipalMembership
  })));

  await mongoose.disconnect();
}

findSachi().catch(console.error);
