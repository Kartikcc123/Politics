const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });
const Member = require('../src/models/Member');

async function autoMapMissingWards() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  console.log('Connecting to MongoDB...');
  await mongoose.connect(mongoUri);
  console.log('Connected!');

  const totalMembers = await Member.countDocuments();
  const withoutWardCount = await Member.countDocuments({
    $or: [
      { wardNumber: { $exists: false } },
      { wardNumber: null },
      { wardNumber: '' },
      { hasMunicipalMembership: false }
    ]
  });

  console.log(`Total voters in DB: ${totalMembers}`);
  console.log(`Voters missing Ward Number: ${withoutWardCount}`);

  if (withoutWardCount === 0) {
    console.log('All voters already have ward numbers!');
    process.exit(0);
  }

  // Build lookup maps from voters who HAVE a ward
  console.log('\nIndexing existing ward mappings across the database...');
  
  // Map 1: (village + houseNumber + partNumber) -> wardNumber
  // Map 2: (village + houseNumber) -> wardNumber
  // Map 3: (village + partNumber + sectionName) -> wardNumber
  // Map 4: (village + partNumber) -> wardNumber

  const votersWithWard = await Member.find({
    wardNumber: { $exists: true, $ne: null, $ne: '' }
  }).select('village gramPanchayat partNumber houseNumber sectionName wardNumber').lean();

  console.log(`Loaded ${votersWithWard.length} voters with valid ward numbers.`);

  const housePartWardMap = new Map();
  const houseWardMap = new Map();
  const partSectionWardCount = new Map(); // key -> { ward: count }
  const partWardCount = new Map(); // key -> { ward: count }

  for (const v of votersWithWard) {
    const vName = (v.village || v.gramPanchayat || '').trim().toLowerCase();
    const w = String(v.wardNumber).trim();
    const p = String(v.partNumber || '').trim();
    const h = String(v.houseNumber || '').trim();
    const s = String(v.sectionName || '').trim().toLowerCase();

    if (!w || !vName) continue;

    if (h && p) {
      housePartWardMap.set(`${vName}|${p}|${h}`, w);
    }
    if (h) {
      houseWardMap.set(`${vName}|${h}`, w);
    }
    if (p && s) {
      const key = `${vName}|${p}|${s}`;
      const counts = partSectionWardCount.get(key) || {};
      counts[w] = (counts[w] || 0) + 1;
      partSectionWardCount.set(key, counts);
    }
    if (p) {
      const key = `${vName}|${p}`;
      const counts = partWardCount.get(key) || {};
      counts[w] = (counts[w] || 0) + 1;
      partWardCount.set(key, counts);
    }
  }

  function getDominantWard(countsObj) {
    if (!countsObj) return null;
    let max = 0;
    let best = null;
    for (const [ward, count] of Object.entries(countsObj)) {
      if (count > max) {
        max = count;
        best = ward;
      }
    }
    return best;
  }

  // Find all voters missing ward
  const missingVoters = await Member.find({
    $or: [
      { wardNumber: { $exists: false } },
      { wardNumber: null },
      { wardNumber: '' },
      { hasMunicipalMembership: false }
    ]
  }).select('_id name voterId village gramPanchayat partNumber houseNumber sectionName guardianName relativeName').lean();

  console.log(`\n--- Starting Multi-Tier Ward Auto-Mapping for ${missingVoters.length} voters ---`);

  let pass1HouseMatched = 0;
  let pass2SectionMatched = 0;
  let pass3PartMatched = 0;
  let unmapped = 0;

  const bulkOps = [];

  for (const m of missingVoters) {
    const vName = (m.village || m.gramPanchayat || '').trim().toLowerCase();
    const p = String(m.partNumber || '').trim();
    const h = String(m.houseNumber || '').trim();
    const s = String(m.sectionName || '').trim().toLowerCase();

    let mappedWard = null;

    // Tier 1: Same village + part + house
    if (vName && p && h && housePartWardMap.has(`${vName}|${p}|${h}`)) {
      mappedWard = housePartWardMap.get(`${vName}|${p}|${h}`);
      pass1HouseMatched++;
    }
    // Tier 2: Same village + house
    else if (vName && h && houseWardMap.has(`${vName}|${h}`)) {
      mappedWard = houseWardMap.get(`${vName}|${h}`);
      pass1HouseMatched++;
    }
    // Tier 3: Dominant ward for village + part + section
    else if (vName && p && s && partSectionWardCount.has(`${vName}|${p}|${s}`)) {
      mappedWard = getDominantWard(partSectionWardCount.get(`${vName}|${p}|${s}`));
      pass2SectionMatched++;
    }
    // Tier 4: Dominant ward for village + part
    else if (vName && p && partWardCount.has(`${vName}|${p}`)) {
      mappedWard = getDominantWard(partWardCount.get(`${vName}|${p}`));
      pass3PartMatched++;
    }

    if (mappedWard) {
      bulkOps.push({
        updateOne: {
          filter: { _id: m._id },
          update: {
            $set: {
              wardNumber: mappedWard,
              municipalWardNumbers: [mappedWard],
              hasMunicipalMembership: true,
              hasAssemblyMembership: true,
            }
          }
        }
      });
    } else {
      unmapped++;
    }

    if (bulkOps.length >= 1000) {
      await Member.bulkWrite(bulkOps);
      bulkOps.length = 0;
      console.log(`Saved batch of 1000 ward updates...`);
    }
  }

  if (bulkOps.length > 0) {
    await Member.bulkWrite(bulkOps);
    bulkOps.length = 0;
  }

  console.log('\n--- Ward Mapping Summary ---');
  console.log(`Mapped by Family/House: ${pass1HouseMatched}`);
  console.log(`Mapped by Section: ${pass2SectionMatched}`);
  console.log(`Mapped by Part Dominance: ${pass3PartMatched}`);
  console.log(`Total newly mapped voters: ${pass1HouseMatched + pass2SectionMatched + pass3PartMatched}`);
  console.log(`Unmapped voters: ${unmapped}`);

  const finalWithoutWard = await Member.countDocuments({
    $or: [{ wardNumber: { $exists: false } }, { wardNumber: null }, { wardNumber: '' }]
  });
  console.log(`Final voters without Ward: ${finalWithoutWard} / ${totalMembers}`);

  process.exit(0);
}

autoMapMissingWards().catch(err => {
  console.error('Error during ward auto mapping:', err);
  process.exit(1);
});
