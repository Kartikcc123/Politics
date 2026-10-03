require('dotenv').config();
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');

const srcDir = fs.existsSync(path.join(__dirname, 'src')) 
  ? path.join(__dirname, 'src') 
  : path.join(__dirname, '../src');

const { boothToVillageMap, getMasterLocationForBooth } = require(path.join(srcDir, 'config/boothToVillageMaster'));
const Member = require(path.join(srcDir, 'models/Member'));
const Area = require(path.join(srcDir, 'models/Area'));
const User = require(path.join(srcDir, 'models/User'));

async function updateBoothVillages() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://187.127.173.42:27017/political_crm';
  console.log('========================================================================');
  console.log('🏛️ UPDATING BOOTH 1 TO 103+ VILLAGE NAMES (OFFICIAL 179 MASTER)');
  console.log('========================================================================\n');
  console.log(`Connecting to Mongo: ${mongoUri}...`);

  await mongoose.connect(mongoUri);
  console.log('✅ Connected to MongoDB successfully!\n');

  const admin = await User.findOne({ role: 'admin' }).select('_id').lean();
  const adminId = admin?._id || new mongoose.Types.ObjectId();

  // 1. Summarize Village to Booths Mapping from Master
  const villageToBooths = new Map();
  for (const [partStr, loc] of Object.entries(boothToVillageMap)) {
    const p = parseInt(partStr, 10);
    const v = loc.village;
    if (!villageToBooths.has(v)) {
      villageToBooths.set(v, { gp: loc.gramPanchayat, booths: [] });
    }
    villageToBooths.get(v).booths.push(p);
  }

  console.log('📋 MASTER VILLAGE & BOOTH ROSTER (Parts 1 to 103):');
  console.log('------------------------------------------------------------------------');
  for (const [vName, vInfo] of villageToBooths.entries()) {
    console.log(`• गाँव: ${vName.padEnd(20, ' ')} | ग्राम पंचायत: ${vInfo.gp.padEnd(16, ' ')} | कुल भाग (${vInfo.booths.length}): भाग [ ${vInfo.booths.join(', ')} ]`);
  }
  console.log('------------------------------------------------------------------------\n');

  // 2. Perform bulk update for all voters in DB for parts 1 to 103+
  let totalUpdated = 0;
  let totalVotersFound = 0;
  const boothCountsInDB = {};

  const allBoothsInMaster = Object.keys(boothToVillageMap).map(n => parseInt(n, 10));

  for (const partNum of allBoothsInMaster) {
    const loc = boothToVillageMap[partNum];
    const partQueries = [
      { partNumber: String(partNum) },
      { partNumber: partNum }
    ];

    const votersInPart = await Member.countDocuments({ $or: partQueries });
    boothCountsInDB[partNum] = votersInPart;
    totalVotersFound += votersInPart;

    if (votersInPart > 0) {
      const res = await Member.updateMany(
        { $or: partQueries },
        {
          $set: {
            village: loc.village,
            gramPanchayat: loc.gramPanchayat,
            hasAssemblyMembership: true
          }
        }
      );
      totalUpdated += (res.modifiedCount || 0);
      console.log(`✅ भाग ${String(partNum).padStart(3, ' ')}: ${loc.village.padEnd(18, ' ')} -> ${votersInPart} voters (${res.modifiedCount} updated)`);
    } else {
      console.log(`⏳ भाग ${String(partNum).padStart(3, ' ')}: ${loc.village.padEnd(18, ' ')} -> 0 voters in DB (PDF Pending)`);
    }
  }

  console.log('\n========================================================================');
  console.log('📊 EXECUTION SUMMARY');
  console.log('========================================================================');
  console.log(`• Total Master Booths Mapped: ${allBoothsInMaster.length}`);
  console.log(`• Total Unique Villages:       ${villageToBooths.size}`);
  console.log(`• Total Voters in DB (1-103):  ${totalVotersFound.toLocaleString()}`);
  console.log(`• Total Records Standardized:  ${totalUpdated.toLocaleString()}`);
  console.log('========================================================================\n');

  console.log('🎯 Automatic system is active: Whenever any missing PDF is uploaded,');
  console.log('   the server will automatically assign these exact village names!\n');

  await mongoose.disconnect();
  process.exit(0);
}

updateBoothVillages().catch(err => {
  console.error('❌ Error updating booth villages:', err);
  process.exit(1);
});
