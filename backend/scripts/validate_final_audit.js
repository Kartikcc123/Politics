const mongoose = require('mongoose');
const Member = require('../src/models/Member');

async function validateFinal() {
  await mongoose.connect('mongodb://187.127.173.42:27017/political_crm');
  console.log('Connected to DB for final audit validation');

  // Check total municipal voters
  const totalMunicipal = await Member.countDocuments({ hasMunicipalMembership: true });
  const totalWardOnly = await Member.countDocuments({ hasMunicipalMembership: true, hasAssemblyMembership: false });
  const totalAssemblyMatched = await Member.countDocuments({ hasMunicipalMembership: true, hasAssemblyMembership: true });

  console.log({ totalMunicipal, totalWardOnly, totalAssemblyMatched });

  // Check 10 Ward-Only Voters
  const wardOnlySamples = await Member.find({ hasMunicipalMembership: true, hasAssemblyMembership: false }).limit(10);
  console.log('\n--- 10 Ward-Only Voters Sample ---');
  wardOnlySamples.forEach(m => {
    console.log({
      gp: m.gramPanchayat,
      ward: m.wardNumber,
      serial: m.wardVoterSerial,
      name: m.name,
      relativeName: m.relativeName,
      relation: m.relationType,
      house: m.houseNumber,
      age: m.age,
      gender: m.gender,
      village: m.village,
      voterId: m.voterId
    });
  });

  // Check 10 Assembly Matched Voters
  const assemblySamples = await Member.find({ hasMunicipalMembership: true, hasAssemblyMembership: true }).limit(10);
  console.log('\n--- 10 Assembly Matched Voters Sample ---');
  assemblySamples.forEach(m => {
    console.log({
      gp: m.gramPanchayat,
      ward: m.wardNumber,
      serial: m.wardVoterSerial,
      name: m.name,
      relativeName: m.relativeName || m.guardianName,
      relation: m.relationType,
      village: m.village,
      voterId: m.voterId
    });
  });

  // Check for any serial duplicates within (gramPanchayat, wardNumber, wardVoterSerial)
  const duplicates = await Member.aggregate([
    { $match: { hasMunicipalMembership: true, wardVoterSerial: { $exists: true, $ne: '' } } },
    {
      $group: {
        _id: { gp: '$gramPanchayat', ward: '$wardNumber', serial: '$wardVoterSerial' },
        count: { $sum: 1 },
        ids: { $push: '$_id' },
        names: { $push: '$name' },
        epics: { $push: '$voterId' }
      }
    },
    { $match: { count: { $gt: 1 } } },
    { $limit: 10 }
  ]);

  console.log(`\nDuplicate check (multiple records for same GP + Ward + Serial): ${duplicates.length} duplicates found.`);
  if (duplicates.length > 0) {
    console.log('Sample duplicates:', JSON.stringify(duplicates, null, 2));
  }

  await mongoose.disconnect();
}

validateFinal().catch(console.error);
