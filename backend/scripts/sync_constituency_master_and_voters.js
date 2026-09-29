require('dotenv').config();
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');

const srcDir = fs.existsSync(path.join(__dirname, 'src')) 
  ? path.join(__dirname, 'src') 
  : path.join(__dirname, '../src');

const constituencyMaster = require(path.join(srcDir, 'config/constituencyMaster'));
const Area = require(path.join(srcDir, 'models/Area'));
const Member = require(path.join(srcDir, 'models/Member'));
const User = require(path.join(srcDir, 'models/User'));

async function syncAllMasterAndVoters() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('❌ MONGO_URI is missing');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log('========================================================================');
  console.log('🏛️ COMPLETE CONSTITUENCY MASTER SYNC (RAIPUR, SAHARA, SUWANA)');
  console.log('========================================================================\n');

  const admin = await User.findOne({ role: 'admin' }).select('_id').lean();
  const adminId = admin?._id || new mongoose.Types.ObjectId();

  // 1. Ensure Assembly Area
  let assemblyArea = await Area.findOne({ type: 'assembly', code: constituencyMaster.assemblyNumber });
  if (!assemblyArea) {
    assemblyArea = await Area.create({
      type: 'assembly',
      name: constituencyMaster.assemblyName || 'सहाड़ा',
      code: constituencyMaster.assemblyNumber,
      assemblyNumber: constituencyMaster.assemblyNumber,
      district: constituencyMaster.district || 'भीलवाड़ा',
      createdBy: adminId,
      active: true
    });
  }
  console.log(`✅ Assembly Area: ${assemblyArea.name} (Code: ${assemblyArea.code})`);

  // 2. Sync Samitis, Gram Panchayats and Revenue Villages in Area Collection
  const villageToPanchayat = new Map();
  const panchayatToSamiti = new Map();
  const canonicalVillageMap = new Map();
  const areaLookupByVillage = new Map();
  const areaLookupByPanchayat = new Map();

  let totalPanchayatsCreated = 0;
  let totalVillagesCreated = 0;

  for (const [samitiName, samitiData] of Object.entries(constituencyMaster.samitis)) {
    console.log(`\n📁 Syncing Panchayat Samiti: ${samitiName}...`);
    
    // Tehsil / Samiti Area
    let samitiArea = await Area.findOne({ type: 'tehsil', name: samitiName, parent: assemblyArea._id });
    if (!samitiArea) {
      samitiArea = await Area.create({
        type: 'tehsil',
        name: samitiName,
        parent: assemblyArea._id,
        assemblyNumber: constituencyMaster.assemblyNumber,
        district: constituencyMaster.district,
        createdBy: adminId,
        active: true
      });
    }

    for (const [gpName, gpData] of Object.entries(samitiData.panchayats)) {
      panchayatToSamiti.set(gpName, samitiName);
      
      let gpArea = await Area.findOne({ type: 'gram_panchayat', name: gpName, parent: samitiArea._id });
      if (!gpArea) {
        gpArea = await Area.create({
          type: 'gram_panchayat',
          name: gpName,
          parent: samitiArea._id,
          assemblyNumber: constituencyMaster.assemblyNumber,
          wardCount: gpData.wardCount || 0,
          population: gpData.population || 0,
          createdBy: adminId,
          active: true
        });
        totalPanchayatsCreated++;
      } else {
        gpArea.wardCount = gpData.wardCount || gpArea.wardCount;
        gpArea.population = gpData.population || gpArea.population;
        await gpArea.save();
      }
      areaLookupByPanchayat.set(gpName, gpArea._id);

      for (const v of gpData.villages) {
        const vName = v.name;
        villageToPanchayat.set(vName, gpName);
        canonicalVillageMap.set(vName.toLowerCase(), vName);
        const cleanV = vName.replace(/[^\u0900-\u097F]/g, '');
        canonicalVillageMap.set(cleanV, vName);

        let vArea = await Area.findOne({ type: 'village', name: vName, parent: gpArea._id });
        if (!vArea) {
          vArea = await Area.create({
            type: 'village',
            name: vName,
            parent: gpArea._id,
            assemblyNumber: constituencyMaster.assemblyNumber,
            population: v.population || 0,
            createdBy: adminId,
            active: true
          });
          totalVillagesCreated++;
        }
        areaLookupByVillage.set(vName, vArea._id);
      }
    }
  }

  console.log(`\n✅ Area Hierarchy Sync Finished!`);
  console.log(`   Total Gram Panchayats Mapped: ${areaLookupByPanchayat.size}`);
  console.log(`   Total Revenue Villages Mapped: ${areaLookupByVillage.size}`);

  // Common spelling corrections based on field election documents
  const spellingCorrections = {
    'भीटा': 'भींटा',
    'छतोल': 'छातोल',
    'दवेरिया': 'देवरिया',
    'देवेरिया': 'देवरिया',
    'कालाखेड़ी': 'कलालखेड़ी',
    'सरेवडी': 'सरेवड़ी',
    'रूपाखेडा': 'रूपाखेड़ा',
    'पचातरो का खेडा': 'पचातरों का खेड़ा',
    'रेबारियो की ढाणी': 'रेबारियों की ढाणी',
    'नांदडुडा': 'नान्दूड़ा',
    'नांदुडा': 'नान्दूड़ा',
    'गढवा': 'गलवा',
    'मोखुन्दा': 'मोखुन्दा',
    'मासिंगपुरा': 'मासिंगपुरा',
    'नाथडियास': 'नाथड़ियास',
    'आसुणा': 'आसूणा',
    'सगरेव': 'सगरेव',
    'नारायणखेडा': 'नारायणखेड़ा',
    'बागोलीया': 'बागोलिया',
    'पालरा': 'पालरां',
    'आशाहोली': 'आशाहोली',
    'बोराणा': 'बोराणा',
    'बकाण': 'बकाण',
    'नान्दशा': 'नान्दशा जागीर',
    'बोरियापुरा': 'बोरियापुरा',
    'कोट': 'कोट',
    'बागड़': 'बागड़',
    'रायपुर': 'रायपुर',
    'दियास SE': 'दियास',
    'दियास': 'दियास'
  };

  for (const [wrong, right] of Object.entries(spellingCorrections)) {
    canonicalVillageMap.set(wrong.toLowerCase(), right);
    canonicalVillageMap.set(wrong.replace(/[^\u0900-\u097F]/g, ''), right);
  }

  // Helper: Match text against canonical villages
  function findCanonicalVillage(raw) {
    if (!raw || typeof raw !== 'string') return null;
    const clean = raw.trim();
    if (canonicalVillageMap.has(clean.toLowerCase())) return canonicalVillageMap.get(clean.toLowerCase());
    const stripped = clean.replace(/[^\u0900-\u097F]/g, '');
    if (canonicalVillageMap.has(stripped)) return canonicalVillageMap.get(stripped);

    // Search substring match
    for (const [key, canonical] of canonicalVillageMap.entries()) {
      if (key.length >= 3 && clean.includes(key)) return canonical;
    }
    return null;
  }

  console.log('\n3️⃣ Pass 1: Scanning Part Numbers & Voter Consensus...');
  const partStats = await Member.aggregate([
    { $match: { partNumber: { $nin: ['', null] } } },
    {
      $group: {
        _id: { part: '$partNumber', village: '$village', section: '$sectionName' },
        count: { $sum: 1 }
      }
    }
  ]);

  const partConsensus = new Map();
  for (const row of partStats) {
    const part = row._id.part;
    const rawV = row._id.village;
    const rawS = row._id.section;
    const count = row.count;

    let matched = findCanonicalVillage(rawV) || findCanonicalVillage(rawS);
    if (matched) {
      if (!partConsensus.has(part)) partConsensus.set(part, new Map());
      const cMap = partConsensus.get(part);
      cMap.set(matched, (cMap.get(matched) || 0) + count);
    }
  }

  const partDominantVillage = new Map();
  for (const [part, counts] of partConsensus.entries()) {
    let topV = null;
    let max = -1;
    for (const [v, c] of counts.entries()) {
      if (c > max) { max = c; topV = v; }
    }
    if (topV) partDominantVillage.set(part, topV);
  }

  console.log(`✅ Booth/Part Consensus established for ${partDominantVillage.size} polling parts.`);

  console.log('\n4️⃣ Pass 2: Updating Voters with Official Gram Panchayats & Villages...');
  const cursor = Member.find({}).cursor({ batchSize: 2000 });
  let totalProcessed = 0;
  let updatedCount = 0;
  let bulkOps = [];

  for await (const doc of cursor) {
    totalProcessed++;
    let canonVillage = findCanonicalVillage(doc.village) || 
                       findCanonicalVillage(doc.sectionName) || 
                       (doc.partNumber ? partDominantVillage.get(doc.partNumber) : null);

    if (!canonVillage && doc.village) canonVillage = doc.village.trim();

    const canonGP = canonVillage ? (villageToPanchayat.get(canonVillage) || doc.gramPanchayat || '') : (doc.gramPanchayat || '');
    const canonSamiti = canonGP ? (panchayatToSamiti.get(canonGP) || doc.tehsil || '') : (doc.tehsil || '');
    const linkedAreaId = canonVillage && areaLookupByVillage.has(canonVillage) 
      ? areaLookupByVillage.get(canonVillage) 
      : (canonGP && areaLookupByPanchayat.has(canonGP) ? areaLookupByPanchayat.get(canonGP) : assemblyArea._id);

    const needsUpdate = (canonVillage && doc.village !== canonVillage) ||
                        (canonGP && doc.gramPanchayat !== canonGP) ||
                        (canonSamiti && doc.tehsil !== canonSamiti) ||
                        !doc.hasAssemblyMembership ||
                        (doc.area && String(doc.area) !== String(linkedAreaId));

    if (needsUpdate) {
      bulkOps.push({
        updateOne: {
          filter: { _id: doc._id },
          update: {
            $set: {
              village: canonVillage || doc.village,
              gramPanchayat: canonGP || doc.gramPanchayat,
              tehsil: canonSamiti || doc.tehsil,
              hasAssemblyMembership: true,
              contactType: 'electoral',
              area: linkedAreaId
            }
          }
        }
      });
      updatedCount++;
    }

    if (bulkOps.length >= 1000) {
      await Member.bulkWrite(bulkOps, { ordered: false });
      process.stdout.write(`\r   Progress: ${totalProcessed} scanned | ${updatedCount} standardized...`);
      bulkOps = [];
    }
  }

  if (bulkOps.length > 0) {
    await Member.bulkWrite(bulkOps, { ordered: false });
  }

  console.log(`\n\n🎉 ALL-CONSTITUENCY MASTER SYNC COMPLETED!`);
  console.log(`   Total Voters Scanned: ${totalProcessed}`);
  console.log(`   Total Standardized: ${updatedCount}`);
  console.log(`========================================================================\n`);

  await mongoose.disconnect();
}

syncAllMasterAndVoters().catch(err => {
  console.error('Fatal Sync Error:', err);
  process.exit(1);
});
