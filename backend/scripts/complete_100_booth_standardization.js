const mongoose = require('mongoose');
const Member = require('../src/models/Member');
const { boothToVillageMap } = require('../src/config/boothToVillageMaster');

async function run() {
  await mongoose.connect('mongodb://187.127.173.42:27017/political_crm');
  console.log('Connected to MongoDB');

  let totalVoters = 0;
  let totalUpdated = 0;

  for (const [partStr, info] of Object.entries(boothToVillageMap)) {
    const partNum = parseInt(partStr, 10);
    const partQueries = [
      { partNumber: String(partNum) },
      { partNumber: partNum }
    ];

    const votersCount = await Member.countDocuments({ $or: partQueries });
    totalVoters += votersCount;

    if (votersCount > 0) {
      const res = await Member.updateMany(
        { $or: partQueries },
        {
          $set: {
            village: info.village,
            gramPanchayat: info.gramPanchayat,
            tehsil: 'रायपुर',
            hasAssemblyMembership: true,
          }
        }
      );
      totalUpdated += res.modifiedCount;
      console.log(`✅ भाग ${String(partNum).padStart(3, ' ')}: गाँव "${info.village}" | GP "${info.gramPanchayat}" -> ${votersCount} voters updated`);
    } else {
      console.log(`⏳ भाग ${String(partNum).padStart(3, ' ')}: गाँव "${info.village}" | GP "${info.gramPanchayat}" -> 0 voters (PDF Pending)`);
    }
  }

  console.log('\n========================================================================');
  console.log(`• Total Voters Processed (Booths 1-103): ${totalVoters.toLocaleString()}`);
  console.log(`• Total Records Fully Standardized:     ${totalUpdated.toLocaleString()}`);
  console.log('========================================================================\n');

  process.exit(0);
}

run().catch(console.error);
