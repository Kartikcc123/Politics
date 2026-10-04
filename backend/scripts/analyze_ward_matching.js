const mongoose = require('mongoose');
const Member = require('../src/models/Member');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://187.127.173.42:27017/political_crm';

async function analyze() {
  await mongoose.connect(MONGO_URI);
  console.log('MongoDB connected');

  const totalWardOnly = await Member.countDocuments({ hasMunicipalMembership: true, hasAssemblyMembership: false });
  const totalBoth = await Member.countDocuments({ hasMunicipalMembership: true, hasAssemblyMembership: { $ne: false } });
  const totalAssemblyOnly = await Member.countDocuments({ hasAssemblyMembership: { $ne: false }, hasMunicipalMembership: { $ne: true } });

  console.log(`\n=== OVERALL DATABASE STATS ===`);
  console.log(`Matched in Both (Assembly + Ward): ${totalBoth}`);
  console.log(`Ward Only (Not in Assembly): ${totalWardOnly}`);
  console.log(`Assembly Only (Not linked to any Ward): ${totalAssemblyOnly}\n`);

  // Analyze Ward-Only Sample
  const sample = await Member.find({ hasMunicipalMembership: true, hasAssemblyMembership: false }).limit(2000).select('name guardianName voterId gramPanchayat wardNumber');
  
  let noEpic = 0;
  let hasEpic = 0;
  let epicSamples = [];

  for (const v of sample) {
    if (!v.voterId || v.voterId.trim() === '' || v.voterId === '-') {
      noEpic++;
    } else {
      hasEpic++;
      if (epicSamples.length < 15) {
        epicSamples.push({ gp: v.gramPanchayat, ward: v.wardNumber, name: v.name, epic: v.voterId });
      }
    }
  }

  console.log(`Sample Size: ${sample.length}`);
  console.log(`1. Ward Cards with NO EPIC printed in PDF (वार्ड सूची में EPIC नहीं छपा है): ${noEpic} (${((noEpic/sample.length)*100).toFixed(1)}%)`);
  console.log(`2. Ward Cards WITH EPIC (EPIC छपा है, लेकिन विधानसभा सूची में नहीं है): ${hasEpic} (${((hasEpic/sample.length)*100).toFixed(1)}%)\n`);

  console.log('Sample Ward-Only Voters who HAVE an EPIC:');
  for (const s of epicSamples) {
    // Check if this EPIC exists anywhere in DB
    const inDb = await Member.find({ voterId: s.epic });
    console.log(`- [${s.gp} W${s.ward}] "${s.name}" | EPIC: "${s.epic}" | Total Docs in DB with this EPIC: ${inDb.length}`);
  }

  await mongoose.disconnect();
}

analyze().catch(err => {
  console.error(err);
  process.exit(1);
});
