const mongoose = require('mongoose');
const Member = require('../src/models/Member');

async function auditWardOnly() {
  await mongoose.connect('mongodb://187.127.173.42:27017/political_crm');
  
  const wardOnlyTotal = await Member.countDocuments({ hasAssemblyMembership: false });
  console.log(`Total { hasAssemblyMembership: false } documents: ${wardOnlyTotal}`);

  // Check how many have voterId undefined vs generated vs real EPIC
  const withUndefinedVoterId = await Member.countDocuments({
    hasAssemblyMembership: false,
    $or: [{ voterId: { $exists: false } }, { voterId: null }, { voterId: '' }]
  });
  console.log(`Ward-only with undefined/null voterId: ${withUndefinedVoterId}`);

  // Check how many have synthetic voterId (WARD_*)
  const withSyntheticVoterId = await Member.countDocuments({
    hasAssemblyMembership: false,
    voterId: /^WARD_/
  });
  console.log(`Ward-only with synthetic voterId (WARD_*): ${withSyntheticVoterId}`);

  // Check how many have real EPIC
  const withRealEpic = await Member.countDocuments({
    hasAssemblyMembership: false,
    voterId: { $exists: true, $ne: null, $nin: ['', /^WARD_/] }
  });
  console.log(`Ward-only with real EPIC: ${withRealEpic}`);

  // Find duplicates where both an Assembly member AND a Ward-only member exist for same GP + Ward + Serial
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

  console.log(`\nDuplicate (GP + Ward + Serial) collision groups: ${duplicates.length}`);
  if (duplicates.length > 0) {
    console.log('Sample duplicates:');
    duplicates.slice(0, 10).forEach(d => {
      console.log(`   [${d._id.gramPanchayat} W${d._id.wardNumber} #${d._id.serial}] Count: ${d.count}`);
      d.docs.forEach(doc => {
        console.log(`      -> ID: ${doc.id} | Name: "${doc.name}" | EPIC: ${doc.voterId} | Assembly: ${doc.hasAssembly}`);
      });
    });
  }

  await mongoose.disconnect();
}

auditWardOnly().catch(console.error);
