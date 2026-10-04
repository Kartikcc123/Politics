const mongoose = require('mongoose');
const Member = require('../src/models/Member');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://187.127.173.42:27017/political_crm';

async function purgeStalePhantoms() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB.\n');

  // 1. Find all stale phantom documents
  const staleQuery = {
    hasAssemblyMembership: { $ne: true },
    $or: [
      { voterId: { $exists: false } },
      { voterId: null },
      { voterId: '' }
    ]
  };

  const staleCount = await Member.countDocuments(staleQuery);
  console.log(`Found ${staleCount} stale phantom documents without voterId.`);

  if (staleCount > 0) {
    const res = await Member.deleteMany(staleQuery);
    console.log(`Deleted ${res.deletedCount} stale phantom records!`);
  }

  // 2. Check remaining duplicates where more than 1 voter has the same GP + Ward + Serial
  const duplicates = await Member.aggregate([
    {
      $match: {
        hasMunicipalMembership: true,
        wardNumber: { $exists: true, $ne: '' },
        wardVoterSerial: { $exists: true, $ne: '' }
      }
    },
    {
      $group: {
        _id: {
          gramPanchayat: '$gramPanchayat',
          wardNumber: '$wardNumber',
          serial: '$wardVoterSerial'
        },
        count: { $sum: 1 },
        docs: { $push: { id: '$_id', name: '$name', voterId: '$voterId', hasAssembly: '$hasAssemblyMembership' } }
      }
    },
    {
      $match: { count: { $gt: 1 } }
    }
  ]);

  console.log(`\nRemaining collision groups: ${duplicates.length}`);
  if (duplicates.length > 0) {
    console.log('Resolving remaining collision groups (keeping Assembly member or valid record)...');
    let resolved = 0;
    for (const group of duplicates) {
      // If one has assembly membership and one does not, delete the non-assembly one
      const assemblyDoc = group.docs.find(d => d.hasAssembly);
      const wardOnlyDoc = group.docs.find(d => !d.hasAssembly);
      if (assemblyDoc && wardOnlyDoc) {
        await Member.deleteOne({ _id: wardOnlyDoc.id });
        resolved++;
      }
    }
    console.log(`Resolved ${resolved} collisions!`);
  }

  // 3. Verify Bheeta Ward 1 Serial 28
  const bheetaW1S28 = await Member.find({
    gramPanchayat: 'भींटा',
    wardNumber: '1',
    wardVoterSerial: '28'
  });
  console.log('\nFinal Bheeta Ward 1 Serial 28 in Database:');
  bheetaW1S28.forEach(d => {
    console.log(`   ID: ${d._id} | Name: "${d.name}" | Guardian: "${d.guardianName}" | EPIC: "${d.voterId}" | Assembly: ${d.hasAssemblyMembership} | Municipal: ${d.hasMunicipalMembership}`);
  });

  // 4. Verify "साचि" in Database
  const sachi = await Member.find({ name: /साचि/ });
  console.log(`\nRemaining records matching /साचि/: ${sachi.length}`);
  sachi.forEach(d => {
    console.log(`   ID: ${d._id} | Name: "${d.name}" | GP: ${d.gramPanchayat} | W${d.wardNumber} #${d.wardVoterSerial}`);
  });

  await mongoose.disconnect();
}

purgeStalePhantoms().catch(console.error);
