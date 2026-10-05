const mongoose = require('mongoose');
const MONGO_URI = 'mongodb://187.127.173.42:27017/political_crm';
const Member = require('../src/models/Member');

// Comprehensive dictionary of standard village spellings in the region
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
};

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
  // Clean special characters, numbers, parentheses
  candidate = candidate.replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').trim();
  candidate = candidate.replace(/[0-9\.\-\_\#\:\;]/g, '').trim();
  candidate = candidate.replace(/^(ग्राम|मुखय ग्राम|मुख्य ग्राम|सम्पूर्ण ग्राम|सर्म्पुण गांव|वार्ड नं)\s*/i, '').trim();

  // Apply spelling dictionary
  for (const [wrong, right] of Object.entries(SPELLING_CORRECTIONS)) {
    if (candidate === wrong || candidate.includes(wrong)) {
      candidate = right;
      break;
    }
  }

  return candidate;
}

async function dryRunSync() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to database. Analyzing all voters...');

  // Build part-to-village consensus map from sections
  const partSections = await Member.aggregate([
    { $match: { sectionName: { $nin: ['', null, 'undefined'] } } },
    { $group: {
      _id: { partNumber: '$partNumber', sectionName: '$sectionName' },
      count: { $sum: 1 }
    } },
    { $sort: { count: -1 } }
  ]);

  const partToVillages = new Map();
  for (const row of partSections) {
    const p = String(row._id.partNumber || '').trim();
    if (!p) continue;
    const v = extractVillageFromSection(row._id.sectionName);
    if (v && v.length >= 2) {
      if (!partToVillages.has(p)) {
        partToVillages.set(p, new Map());
      }
      const vMap = partToVillages.get(p);
      vMap.set(v, (vMap.get(v) || 0) + row.count);
    }
  }

  console.log(`\nDiscovered Village Mapping for ${partToVillages.size} parts.`);
  console.log('\nSample Part to Consensus Village Mappings:');
  const sortedParts = Array.from(partToVillages.keys()).sort((a, b) => Number(a) - Number(b));
  for (const p of sortedParts.slice(0, 40)) {
    const vMap = partToVillages.get(p);
    const sortedVs = Array.from(vMap.entries()).sort((a, b) => b[1] - a[1]);
    const topV = sortedVs[0][0];
    console.log(`Part ${p} -> Primary Village: "${topV}" (${sortedVs.map(x => `${x[0]}:${x[1]}`).join(', ')})`);
  }

  // Count how many voters would be updated
  let totalFixable = 0;
  for (const [p, vMap] of partToVillages.entries()) {
    const sortedVs = Array.from(vMap.entries()).sort((a, b) => b[1] - a[1]);
    const topV = sortedVs[0][0];
    const countMismatched = await Member.countDocuments({
      partNumber: p,
      village: { $ne: topV }
    });
    totalFixable += countMismatched;
  }

  console.log(`\nTotal Voters that will be corrected / filled with proper village names: ${totalFixable}`);

  await mongoose.disconnect();
}

dryRunSync().catch(console.error);
