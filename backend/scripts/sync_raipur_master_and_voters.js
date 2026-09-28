require('dotenv').config();
const mongoose = require('mongoose');
const raipurMaster = require('../src/config/raipurLocationMaster');
const Area = require('../src/models/Area');
const Member = require('../src/models/Member');
const User = require('../src/models/User');
const { saveMasterData } = require('../src/controllers/areaController');

async function syncRaipurMasterAndVoters() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('❌ MONGO_URI is missing');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log('========================================================================');
  console.log('🏛️ RAIPUR PANCHAYAT SAMITI & VILLAGE MASTER SYNC ENGINE');
  console.log('========================================================================\n');

  const admin = await User.findOne({ role: 'admin' }).select('_id').lean();
  const adminId = admin?._id || new mongoose.Types.ObjectId();

  console.log('1️⃣ Importing/Syncing Official 29 Gram Panchayats and 90+ Villages...');
  const masterPayload = {
    ...raipurMaster,
    assemblyNumber: '179',
    assemblyName: 'सहाड़ा',
  };

  const importRes = await saveMasterData(masterPayload, adminId);
  console.log('✅ Master Area Hierarchy Synced:', {
    assembly: importRes.assembly?.name,
    tehsil: importRes.tehsil?.name,
    panchayatsCount: importRes.createdPanchayats?.length || raipurMaster.panchayats.length,
    villagesCount: importRes.createdVillages?.length
  });

  // Build standardized dictionary of Village -> Panchayat and variations
  console.log('\n2️⃣ Building Standardized Hindi Village & Panchayat Dictionary...');
  const villageToPanchayat = new Map();
  const canonicalVillageMap = new Map();

  for (const p of raipurMaster.panchayats) {
    const panchayatName = p.name;
    for (const v of p.villages) {
      const vName = v.name;
      villageToPanchayat.set(vName, panchayatName);
      canonicalVillageMap.set(vName.toLowerCase(), vName);
      // Clean phonetic aliases
      const clean = vName.replace(/[^\u0900-\u097F]/g, '');
      canonicalVillageMap.set(clean, vName);
    }
  }

  // Common spelling corrections based on Government Notification
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
    'रायपुर': 'रायपुर'
  };

  for (const [wrong, right] of Object.entries(spellingCorrections)) {
    canonicalVillageMap.set(wrong.toLowerCase(), right);
    canonicalVillageMap.set(wrong.replace(/[^\u0900-\u097F]/g, ''), right);
  }

  // 2b. Map Area ObjectIds for each village and panchayat
  const areaDocs = await Area.find({ active: true }).lean();
  const villageAreaMap = new Map();
  for (const a of areaDocs) {
    if (a.type === 'village') {
      villageAreaMap.set(a.name, a._id);
    }
  }

  console.log('3️⃣ Standardizing Village & Panchayat names and linking Areas across all 197k+ voters...');
  const cursor = Member.find({}).select('_id village gramPanchayat sectionName sectionNumber partNumber area').lean().cursor();

  let bulk = [];
  let updated = 0;
  let batchCount = 0;

  for await (const m of cursor) {
    let rawVillage = String(m.village || '').trim();
    let rawSection = String(m.sectionName || '').trim();
    let standardizedVillage = '';
    let standardizedPanchayat = '';

    // If village is blank, try extracting from sectionName
    let textToMatch = rawVillage || rawSection;

    // Check direct corrections
    for (const [wrong, right] of Object.entries(spellingCorrections)) {
      if (textToMatch.includes(wrong) || textToMatch === wrong) {
        standardizedVillage = right;
        break;
      }
    }

    if (!standardizedVillage && textToMatch) {
      const cleanKey = textToMatch.replace(/[^\u0900-\u097F]/g, '');
      standardizedVillage = canonicalVillageMap.get(cleanKey) || canonicalVillageMap.get(textToMatch.toLowerCase()) || '';
    }

    // Check if sectionName contains any canonical village
    if (!standardizedVillage && rawSection) {
      for (const [vClean, vName] of canonicalVillageMap.entries()) {
        if (vClean.length >= 3 && rawSection.includes(vClean)) {
          standardizedVillage = vName;
          break;
        }
      }
    }

    if (standardizedVillage) {
      standardizedPanchayat = villageToPanchayat.get(standardizedVillage) || m.gramPanchayat || '';
    }

    const targetAreaId = standardizedVillage ? villageAreaMap.get(standardizedVillage) : null;

    const needsVillageUpdate = standardizedVillage && m.village !== standardizedVillage;
    const needsPanchayatUpdate = standardizedPanchayat && m.gramPanchayat !== standardizedPanchayat;
    const needsAreaUpdate = targetAreaId && String(m.area || '') !== String(targetAreaId);

    if (needsVillageUpdate || needsPanchayatUpdate || needsAreaUpdate) {
      const setObj = {};
      if (standardizedVillage) setObj.village = standardizedVillage;
      if (standardizedPanchayat) setObj.gramPanchayat = standardizedPanchayat;
      if (targetAreaId) setObj.area = targetAreaId;

      bulk.push({
        updateOne: {
          filter: { _id: m._id },
          update: { $set: setObj }
        }
      });
    }

    if (bulk.length >= 3000) {
      await Member.bulkWrite(bulk, { ordered: false });
      updated += bulk.length;
      batchCount++;
      console.log(`   ⚡ Standardized & Area-Linked ${updated.toLocaleString()} voter records...`);
      bulk = [];
    }
  }

  if (bulk.length > 0) {
    await Member.bulkWrite(bulk, { ordered: false });
    updated += bulk.length;
  }

  console.log('\n========================================================================');
  console.log(`🎉 MASTER SYNC COMPLETE: ${updated.toLocaleString()} voters standardized with Official Government Panchayat & Village Names!`);
  console.log('========================================================================\n');

  await mongoose.disconnect();
  process.exit(0);
}

syncRaipurMasterAndVoters();
