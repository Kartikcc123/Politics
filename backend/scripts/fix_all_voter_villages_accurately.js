const mongoose = require('mongoose');
const MONGO_URI = 'mongodb://187.127.173.42:27017/political_crm';
const Member = require('../src/models/Member');

const SPELLING_CORRECTIONS = {
  'लखाहाली': 'लखाहोली',
  'रामरास': 'राणास',
  'आशाहोलल': 'आशाहोली',
  'देवाड़ा': 'रेवाड़ा',
  'नरियापुरा': 'बोरियापुरा',
  'उड़सीपुरा': 'अडसीपुरा',
  'केमूणीया': 'केमुनिया',
  'गल्यावडी': 'गल्यावड़ी',
  'नान्दशा': 'नान्दशा',
  'सागरेव': 'सगरेव',
  'पानोतिया': 'पानोतिया',
  'सेथुरीया': 'सेंथूरिया',
  'कारोई कला': 'कारोई कलां',
  'हमीरगढ': 'हमीरगढ़',
  'बाँसड़ा': 'बांसड़ा',
  'नाथडियास': 'नाथड़ियास',
  'बाड़िया खुर्द': 'बाड़िया खुर्द',
  'बाड़िया कलां': 'बाड़िया कलां',
  'गंगानगर': 'गंगापुर',
  'सहाड़ा': 'सहाड़ा',
  'मोखुन्दा': 'मोखुंदा',
};

function cleanVillageName(rawVillage) {
  if (!rawVillage || typeof rawVillage !== 'string') return '';
  let v = rawVillage.trim();
  // Remove trailing OCR noise / symbols
  v = v.replace(/[\(\)\[\]\{\}\<\>\+\=\*\#\$\%\^\&\_\:\;\/\\]/g, ' ').trim();
  v = v.replace(/[0-9\.\-]/g, '').trim();
  v = v.replace(/^(ग्राम|मुखय ग्राम|मुख्य ग्राम|सम्पूर्ण ग्राम|सर्म्पुण गांव|वार्ड नं|वार्ड)\s*/i, '').trim();
  v = v.split(/\s{2,}/)[0].trim();

  for (const [wrong, right] of Object.entries(SPELLING_CORRECTIONS)) {
    if (v === wrong || v.startsWith(wrong)) {
      return right;
    }
  }
  return v;
}

function extractVillageFromSection(section) {
  if (!section || typeof section !== 'string') return '';
  let s = section.trim();
  if (s.startsWith("'-")) s = s.substring(2).trim();
  if (s.includes('परिवर्धन') || s.includes('घटक') || s.includes('सूची') || s === 'पुरुष' || s === 'महिला') {
    return '';
  }
  let candidate = '';
  if (s.includes(',')) {
    const parts = s.split(',');
    candidate = parts[parts.length - 1].trim();
  } else if (s.includes('-')) {
    const parts = s.split('-');
    candidate = parts[parts.length - 1].trim();
  } else {
    candidate = s;
  }
  return cleanVillageName(candidate);
}

async function runAccurateVillageFix() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB.');

  // Step 1: Update at Section Level
  console.log('Step 1: Extracting and updating village names by Section...');
  const distinctSections = await Member.distinct('sectionName', { sectionName: { $nin: ['', null, 'undefined'] } });
  console.log(`Found ${distinctSections.length} unique section names.`);

  let sectionsUpdated = 0;
  let votersUpdatedBySection = 0;

  for (const sec of distinctSections) {
    const cleanV = extractVillageFromSection(sec);
    if (cleanV && cleanV.length >= 2 && !cleanV.includes('undefined')) {
      const res = await Member.updateMany(
        { sectionName: sec, village: { $ne: cleanV } },
        { $set: { village: cleanV } }
      );
      if (res.modifiedCount > 0) {
        sectionsUpdated++;
        votersUpdatedBySection += res.modifiedCount;
      }
    }
  }
  console.log(`Step 1 Complete: Updated ${votersUpdatedBySection} voters across ${sectionsUpdated} sections.`);

  // Step 2: For any remaining voters without village or empty village, fallback to Part primary village
  console.log('\nStep 2: Resolving remaining blank/empty village voters by Part consensus...');
  const partVillages = await Member.aggregate([
    { $match: { village: { $nin: ['', null, 'undefined'] } } },
    { $group: {
      _id: { partNumber: '$partNumber', village: '$village' },
      count: { $sum: 1 }
    } },
    { $sort: { '_id.partNumber': 1, count: -1 } }
  ]);

  const partPrimaryMap = new Map();
  for (const row of partVillages) {
    const p = String(row._id.partNumber || '').trim();
    if (p && !partPrimaryMap.has(p)) {
      partPrimaryMap.set(p, row._id.village);
    }
  }

  let remainingFixed = 0;
  for (const [part, primaryVillage] of partPrimaryMap.entries()) {
    const res = await Member.updateMany(
      { partNumber: part, $or: [{ village: '' }, { village: null }, { village: { $exists: false } }, { village: 'undefined' }] },
      { $set: { village: primaryVillage } }
    );
    remainingFixed += res.modifiedCount;
  }
  console.log(`Step 2 Complete: Filled ${remainingFixed} remaining voters with part primary village.`);

  // Summary Verification
  const totalMembers = await Member.countDocuments();
  const stillBlank = await Member.countDocuments({ $or: [{ village: '' }, { village: null }, { village: { $exists: false } }, { village: 'undefined' }] });
  console.log(`\n=== FINAL VERIFICATION ===`);
  console.log(`Total Voters: ${totalMembers}`);
  console.log(`Voters with Corrected/Populated Village: ${totalMembers - stillBlank}`);
  console.log(`Remaining blank voters: ${stillBlank}`);

  // Test Raipur sample parts
  console.log('\nRaipur sample verification:');
  const sampleParts = ['62', '65', '70', '71', '72', '73', '91', '92', '93', '97'];
  for (const p of sampleParts) {
    const sample = await Member.findOne({ partNumber: p }).select('name partNumber sectionName village').lean();
    console.log(`Part ${p}: Voter "${sample?.name}" -> Village: "${sample?.village}" (Section: "${sample?.sectionName}")`);
  }

  await mongoose.disconnect();
}

runAccurateVillageFix().catch(console.error);
