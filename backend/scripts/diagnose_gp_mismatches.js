const mongoose = require('mongoose');
const URI = process.env.MONGO_URI || 'mongodb://187.127.173.42:27017/political_crm';

async function test() {
  await mongoose.connect(URI);
  const Member = mongoose.model('Member', new mongoose.Schema({}, { strict: false }));
  
  const nath6 = await Member.find({ 'sourceDocument.file': 'NATHDIYAAS-Ward No-006.pdf' }).lean();
  console.log(`Found ${nath6.length} voters from NATHDIYAAS-Ward No-006.pdf`);
  for (const m of nath6.slice(0, 10)) {
    console.log({
      name: m.name,
      voterId: m.voterId,
      gramPanchayat: m.gramPanchayat,
      village: m.village,
      wardNumber: m.wardNumber,
      wardVoterSerial: m.wardVoterSerial,
      voterSerial: m.voterSerial,
      partNumber: m.partNumber,
      hasAssemblyMembership: m.hasAssemblyMembership,
      hasMunicipalMembership: m.hasMunicipalMembership
    });
  }

  // Also check all other Nathdiyas files
  const nathAll = await Member.find({ 'sourceDocument.file': { $regex: /NATHDIYAAS/i } }).lean();
  console.log(`\nTotal voters from all NATHDIYAAS files: ${nathAll.length}`);
  const gpCounts = {};
  for (const m of nathAll) {
    gpCounts[m.gramPanchayat] = (gpCounts[m.gramPanchayat] || 0) + 1;
  }
  console.log('Gram Panchayats for NATHDIYAAS files:', gpCounts);

  // Check how many voters in the entire database have a sourceDocument.file starting with a GP name that doesn't match their gramPanchayat
  const mismatches = await Member.aggregate([
    {
      $match: {
        'sourceDocument.file': { $regex: /Ward No/i }
      }
    },
    {
      $project: {
        file: '$sourceDocument.file',
        gramPanchayat: '$gramPanchayat',
        village: '$village',
        wardNumber: '$wardNumber',
        partNumber: '$partNumber',
        hasAssemblyMembership: '$hasAssemblyMembership',
        hasMunicipalMembership: '$hasMunicipalMembership'
      }
    }
  ]);
  console.log(`\nTotal Ward PDF voters in DB: ${mismatches.length}`);

  // Group by (file prefix vs gramPanchayat)
  const fileGpMap = {};
  for (const m of mismatches) {
    const filePrefix = (m.file || '').split('-')[0].trim().toUpperCase();
    const key = `${filePrefix} -> GP: ${m.gramPanchayat}`;
    fileGpMap[key] = (fileGpMap[key] || 0) + 1;
  }
  console.log('File prefix vs Gram Panchayat mapping:');
  for (const [k, v] of Object.entries(fileGpMap)) {
    console.log(`  ${k}: ${v}`);
  }

  process.exit(0);
}
test().catch(e => { console.error(e); process.exit(1); });
