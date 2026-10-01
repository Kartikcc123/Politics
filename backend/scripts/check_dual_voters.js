const mongoose = require('mongoose');

async function checkDualMembership() {
  await mongoose.connect('mongodb://187.127.173.42:27017/political_crm');
  const Member = require('../src/models/Member');

  console.log('🔍 Analyzing Dual Membership (Vidhan Sabha + Ward / Panchayat)...\n');

  // 1. In Peetha ka Kheda Ward 1 specifically
  const peethaWard1Total = await Member.countDocuments({
    gramPanchayat: /पीथा/i,
    municipalWardNumbers: '1'
  });

  const peethaWard1Both = await Member.countDocuments({
    gramPanchayat: /पीथा/i,
    municipalWardNumbers: '1',
    hasAssemblyMembership: true,
    hasMunicipalMembership: true
  });

  const peethaWard1WithPart = await Member.countDocuments({
    gramPanchayat: /पीथा/i,
    municipalWardNumbers: '1',
    partNumber: { $exists: true, $ne: '' }
  });

  console.log(`📌 ग्राम पंचायत "पीथाकाखेड़ा" (वार्ड 1):`);
  console.log(`• कुल वार्ड 1 मतदाता: ${peethaWard1Total}`);
  console.log(`• दोनों जगह (विधानसभा + वार्ड) मौजूद मतदाता: ${peethaWard1Both}`);
  console.log(`• भाग संख्या (Booth/Part) सहित लिंक मतदाता: ${peethaWard1WithPart}`);

  // Fetch sample of these voters
  const sampleVoters = await Member.find({
    gramPanchayat: /पीथा/i,
    municipalWardNumbers: '1'
  })
  .select('name guardianName relationType voterId houseNumber age gender partNumber sectionName village gramPanchayat municipalWardNumbers hasAssemblyMembership hasMunicipalMembership')
  .limit(25)
  .lean();

  console.log('\n📋 Sample Voters in both Ward 1 & Vidhan Sabha:');
  sampleVoters.forEach((v, idx) => {
    console.log(`${idx + 1}. [EPIC: ${v.voterId || 'N/A'}] ${v.name} (${v.relationType === 'husband' ? 'पति' : 'पिता'}: ${v.guardianName}) | मकान: ${v.houseNumber} | गाँव: ${v.village} | भाग संख्या: ${v.partNumber || '-'} | वार्ड: ${v.municipalWardNumbers.join(', ')}`);
  });

  // 2. Database-wide statistics
  const totalInDb = await Member.countDocuments({});
  const totalAssembly = await Member.countDocuments({ hasAssemblyMembership: true });
  const totalWard = await Member.countDocuments({ 
    $or: [
      { hasMunicipalMembership: true },
      { 'municipalWardNumbers.0': { $exists: true } }
    ]
  });
  const totalBothInAllDb = await Member.countDocuments({
    hasAssemblyMembership: true,
    $or: [
      { hasMunicipalMembership: true },
      { 'municipalWardNumbers.0': { $exists: true } }
    ]
  });

  console.log('\n=============================================================');
  console.log('📊 पूरे डेटाबेस (Database-wide) का विश्लेषण:');
  console.log(`• कुल मतदाता (Total in DB): ${totalInDb}`);
  console.log(`• विधानसभा मतदाता (Assembly): ${totalAssembly}`);
  console.log(`• वार्ड / पंचायत मतदाता (Municipal/Ward): ${totalWard}`);
  console.log(`• दोनों सूचियों में एकीकृत मतदाता (Dual Synced): ${totalBothInAllDb}`);
  console.log('=============================================================\n');

  process.exit(0);
}

checkDualMembership().catch(console.error);
