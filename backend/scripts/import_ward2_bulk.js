const fs = require('fs');
const mongoose = require('mongoose');

async function runBulkImportWard2() {
  await mongoose.connect('mongodb://187.127.173.42:27017/political_crm');
  console.log('Connected to MongoDB');
  const Member = require('../src/models/Member');

  const fullText = fs.readFileSync('scratch_ward2_text.txt', 'utf8');
  const pattern = /(?:[A-Z]{3}\d{7})|(?:RJ\/\d+\/\d+\/\d+)/g;
  const epics = fullText.match(pattern) || [];
  const uniqueEpics = [...new Set(epics.map(e => e.trim()))];

  console.log(`📋 Total Unique EPICs extracted from Ward 2: ${uniqueEpics.length}`);

  // Fetch all existing members in bulk
  const existingMembers = await Member.find({
    voterId: { $in: uniqueEpics }
  }).select('_id voterId name village gramPanchayat municipalWardNumbers');

  console.log(`✅ Found ${existingMembers.length} matching voters in database (${((existingMembers.length/uniqueEpics.length)*100).toFixed(1)}%).`);

  const existingEpicSet = new Set(existingMembers.map(m => m.voterId));
  const missingEpics = uniqueEpics.filter(e => !existingEpicSet.has(e));

  // Bulk update matched members
  const matchedIds = existingMembers.map(m => m._id);
  const updateRes = await Member.updateMany(
    { _id: { $in: matchedIds } },
    {
      $set: {
        wardNumber: '2',
        gramPanchayat: 'पीथाकाखेड़ा',
        village: 'लड़की',
        hasMunicipalMembership: true
      },
      $addToSet: {
        municipalWardNumbers: '2'
      }
    }
  );

  console.log(`🔄 Updated ${updateRes.modifiedCount} voters with Ward 2 membership.`);

  // If there are missing EPICs, create them
  let createdCount = 0;
  for (const epic of missingEpics) {
    await Member.create({
      voterId: epic,
      name: 'वार्ड 2 मतदाता',
      gramPanchayat: 'पीथाकाखेड़ा',
      village: 'लड़की',
      tehsil: 'रायपुर',
      wardNumber: '2',
      hasAssemblyMembership: true,
      hasMunicipalMembership: true,
      municipalWardNumbers: ['2'],
      contactType: 'voter',
      verificationStatus: 'verified',
      partNumber: '75'
    });
    createdCount++;
  }

  if (createdCount > 0) {
    console.log(`🆕 Created ${createdCount} missing voters.`);
  }

  // Count total voters in Ward 2 in DB
  const inDb = await Member.countDocuments({
    gramPanchayat: /पीथा/i,
    municipalWardNumbers: '2'
  });

  console.log('\n=============================================================');
  console.log(`📊 WARD 2 IMPORT FINAL STATUS:`);
  console.log(`• Total Voters in Document:  ${uniqueEpics.length}`);
  console.log(`• Matched with Existing DB:  ${existingMembers.length} (${((existingMembers.length/uniqueEpics.length)*100).toFixed(1)}%)`);
  console.log(`• Newly Added / Created:     ${createdCount}`);
  console.log(`• Total Active in Ward 2 DB: ${inDb}`);
  console.log('=============================================================\n');

  process.exit(0);
}

runBulkImportWard2().catch(console.error);
