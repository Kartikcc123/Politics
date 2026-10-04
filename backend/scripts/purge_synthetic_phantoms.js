const mongoose = require('mongoose');
const Member = require('../src/models/Member');

async function purgeSyntheticPhantoms() {
  await mongoose.connect('mongodb://187.127.173.42:27017/political_crm');
  console.log('Connected to DB');

  // Find all pairs of (gramPanchayat, wardNumber, wardVoterSerial) where count > 1
  const duplicates = await Member.aggregate([
    { $match: { hasMunicipalMembership: true, wardVoterSerial: { $exists: true, $ne: '' } } },
    {
      $group: {
        _id: { gp: '$gramPanchayat', ward: '$wardNumber', serial: '$wardVoterSerial' },
        count: { $sum: 1 },
        docs: { $push: { id: '$_id', voterId: '$voterId', hasAssembly: '$hasAssemblyMembership', name: '$name' } }
      }
    },
    { $match: { count: { $gt: 1 } } }
  ]);

  console.log(`Found ${duplicates.length} duplicate slots.`);

  let deletedCount = 0;
  const toDeleteIds = [];

  for (const group of duplicates) {
    const assemblyDocs = group.docs.filter(d => d.hasAssembly);
    const syntheticDocs = group.docs.filter(d => !d.hasAssembly && d.voterId && d.voterId.startsWith('WARD_'));

    if (assemblyDocs.length > 0 && syntheticDocs.length > 0) {
      // Keep assembly doc, delete synthetic phantom
      for (const s of syntheticDocs) {
        toDeleteIds.push(s.id);
      }
    } else if (group.docs.length > 1) {
      // If multiple synthetic docs or multiple assembly docs, keep the best one (the one with longest name or real EPIC)
      const sorted = group.docs.sort((a, b) => {
        const aIsEpic = /^[A-Z]{3}\d{7}|RJ\//.test(a.voterId || '');
        const bIsEpic = /^[A-Z]{3}\d{7}|RJ\//.test(b.voterId || '');
        if (aIsEpic && !bIsEpic) return -1;
        if (!aIsEpic && bIsEpic) return 1;
        return (b.name || '').length - (a.name || '').length;
      });

      // Keep index 0, delete others
      for (let i = 1; i < sorted.length; i++) {
        toDeleteIds.push(sorted[i].id);
      }
    }
  }

  console.log(`Deleting ${toDeleteIds.length} duplicate / phantom records...`);
  if (toDeleteIds.length > 0) {
    const res = await Member.deleteMany({ _id: { $in: toDeleteIds } });
    console.log(`Deleted ${res.deletedCount} phantoms.`);
  }

  // Re-verify duplicates
  const remaining = await Member.aggregate([
    { $match: { hasMunicipalMembership: true, wardVoterSerial: { $exists: true, $ne: '' } } },
    {
      $group: {
        _id: { gp: '$gramPanchayat', ward: '$wardNumber', serial: '$wardVoterSerial' },
        count: { $sum: 1 }
      }
    },
    { $match: { count: { $gt: 1 } } }
  ]);

  console.log(`Remaining duplicates: ${remaining.length}`);

  await mongoose.disconnect();
}

purgeSyntheticPhantoms().catch(console.error);
