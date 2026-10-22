const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

function normalizeName(str) {
  if (!str) return '';
  return str.replace(/[\s\-_]/g, '')
            .replace(/खेडी/g, 'खेड़ी')
            .replace(/वडी/g, 'वड़ी')
            .replace(/डा/g, 'ड़ा')
            .replace(/डी/g, 'ड़ी')
            .replace(/भीटा/g, 'भींटा')
            .replace(/पालरां/g, 'पालरा')
            .replace(/सहाडा/g, 'सहाड़ा')
            .replace(/गढ/g, 'गढ़')
            .replace(/गुढा/g, 'गुढ़ा')
            .trim();
}

async function syncSamitiWards() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/politics';
  console.log(`Connecting to MongoDB at ${mongoUri}...`);
  await mongoose.connect(mongoUri);
  const Member = mongoose.model('Member', new mongoose.Schema({}, { strict: false }));

  const hierarchyPath = path.join(__dirname, '../src/config/official_samiti_ward_hierarchy.json');
  const hierarchy = JSON.parse(fs.readFileSync(hierarchyPath, 'utf8'));

  let totalUpdated = 0;

  for (const samitiName of Object.keys(hierarchy)) {
    console.log(`\n================== SYNCING SAMITI: ${samitiName} ==================`);
    const wards = hierarchy[samitiName].wards;

    for (const [wardKey, wardData] of Object.entries(wards)) {
      let wardUpdated = 0;

      for (const [gpName, gpData] of Object.entries(wardData.panchayats)) {
        const normGp = normalizeName(gpName);
        const villages = (gpData.villages || []).map(v => v.name).filter(Boolean);
        const allVillageVariants = new Set();

        for (const v of villages) {
          allVillageVariants.add(v);
          allVillageVariants.add(normalizeName(v));
          // Common devanagari spelling variations
          allVillageVariants.add(v.replace(/खेडी/g, 'खेड़ी'));
          allVillageVariants.add(v.replace(/खेड़ी/g, 'खेडी'));
          allVillageVariants.add(v.replace(/वडी/g, 'वड़ी'));
          allVillageVariants.add(v.replace(/वड़ी/g, 'वडी'));
          allVillageVariants.add(v.replace(/डा/g, 'ड़ा'));
          allVillageVariants.add(v.replace(/ड़ा/g, 'डा'));
        }

        const villageList = Array.from(allVillageVariants).filter(Boolean);

        // 1. Tag by village match
        if (villageList.length > 0) {
          const res = await Member.updateMany(
            {
              $or: [
                { village: { $in: villageList } },
                { sectionName: { $in: villageList } },
                { address: { $in: villageList } }
              ]
            },
            {
              $set: {
                panchayatSamiti: samitiName,
                panchayatSamitiWard: wardKey
              }
            }
          );
          wardUpdated += res.modifiedCount;
        }

        // 2. For GP match where panchayatSamitiWard is still not set
        const gpVariants = [gpName, normGp, gpName.replace(/भीटा/g, 'भींटा'), gpName.replace(/पालरां/g, 'पालरा')];
        const resGp = await Member.updateMany(
          {
            gramPanchayat: { $in: gpVariants },
            $or: [
              { panchayatSamitiWard: { $exists: false } },
              { panchayatSamitiWard: null },
              { panchayatSamitiWard: '' }
            ]
          },
          {
            $set: {
              panchayatSamiti: samitiName,
              panchayatSamitiWard: wardKey
            }
          }
        );
        wardUpdated += resGp.modifiedCount;
      }

      console.log(`  ✅ ${wardKey} (${samitiName}): ${wardUpdated} voters tagged`);
      totalUpdated += wardUpdated;
    }
  }

  // Verification counts
  const totalWithSamitiWard = await Member.countDocuments({
    panchayatSamitiWard: { $exists: true, $nin: ['', null] }
  });

  console.log(`\n================== SYNC COMPLETE ==================`);
  console.log(`Total Updates Made: ${totalUpdated}`);
  console.log(`Total Voters with panchayatSamitiWard in DB: ${totalWithSamitiWard}`);

  for (const samitiName of Object.keys(hierarchy)) {
    const sCount = await Member.countDocuments({ panchayatSamiti: samitiName });
    console.log(`  ${samitiName} total voters in DB: ${sCount}`);
  }

  await mongoose.disconnect();
}

syncSamitiWards().catch(err => {
  console.error('Error during sync:', err);
  process.exit(1);
});
