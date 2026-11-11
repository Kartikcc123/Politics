const fs = require('fs');
const path = require('path');
const { boothToVillageMap } = require('../src/config/boothToVillageMaster');

const outJsonPath = path.join(__dirname, '../src/config/official_315_verified_master.json');

const TYPO_FIXES = {
  'कोशीधल': 'कोशीथल',
  'कोशीयथल': 'कोशीथल',
  'धोरिया खेड़ा': 'थोरिया खेड़ा',
  'झलामली': 'जलामली',
  'टूणगाच': 'टूंगच',
  'ठिकरीया': 'ठिकरिया',
  'बागोलियां': 'बागोलिया',
  'अमली': 'आमली',
  'अर्सीपुरा': 'अड़सीपुरा',
  'गल्यावाडी': 'गल्यावड़ी',
  'खूटियां': 'खुटिया',
  'नोंगावा': 'नौगांवा',
  'नोगावां': 'नौगांवा',
  'महेन्द्रगढ़': 'महेन्द्रगढ',
  'भोपालगढ़': 'भोपालगढ',
  'तखतपुरा': 'तख्तपुरा',
  'दादिया': 'दादीया',
  'सेथुरिया': 'सैथुरिया',
  'दूडिया': 'दुडिया',
  'बीकराई': 'बिकराई',
  'सूरजपुरा': 'सुरजपुरा'
};

// Explicit disambiguation for genuine duplicate villages in different areas/panchayats
const EXPLICIT_DISAMBIGUATION = {
  // गाडरी खेड़ा (3 different villages)
  57: { village: 'गाडरी खेड़ा (बागोलिया)', tehsil: 'रायपुर', gp: 'बागोलिया' },
  119: { village: 'गाडरी खेड़ा (कांगणी)', tehsil: 'सहाड़ा', gp: 'कांगणी' },
  145: { village: 'गाडरी खेड़ा (साहड़ा)', tehsil: 'सहाड़ा', gp: 'गाडरीखेड़ा' },

  // रूपपुरा (2 different villages)
  139: { village: 'रूपपुरा (सहाड़ा)', tehsil: 'सहाड़ा', gp: 'गोवलिया' },
  270: { village: 'रूपपुरा (सुवाणा)', tehsil: 'सुवाणा', gp: 'कोचरिया' },

  // रामपुरिया (2 different villages)
  215: { village: 'रामपुरिया (सहाड़ा)', tehsil: 'सहाड़ा', gp: 'अरनिया खालसा' },
  258: { village: 'रामपुरिया (सुवाणा)', tehsil: 'सुवाणा', gp: 'रामपुरिया' },

  // देवली (2 different villages)
  296: { village: 'देवली (हमीरगढ़)', tehsil: 'सुवाणा', gp: 'देवली' },
  297: { village: 'देवली (हमीरगढ़)', tehsil: 'सुवाणा', gp: 'देवली' },
  300: { village: 'देवली (नाथड़ियास)', tehsil: 'सुवाणा', gp: 'नाथड़ियास' },
};

const results = {};

for (let p = 1; p <= 315; p++) {
  const item = boothToVillageMap[p];
  if (!item) continue;

  let vil = item.village.trim();
  if (TYPO_FIXES[vil]) vil = TYPO_FIXES[vil];

  // Default Tehsil & Samiti
  let tehsil = p <= 98 ? 'रायपुर' : (p <= 240 ? 'सहाड़ा' : 'सुवाणा');
  let samiti = tehsil;
  let municipality = '';

  if (p >= 177 && p <= 192) {
    tehsil = 'सहाड़ा';
    samiti = 'गंगापुर (नगर पालिका)';
    municipality = 'गंगापुर';
  } else if (p >= 305 && p <= 314) {
    tehsil = 'हमीरगढ़';
    samiti = 'हमीरगढ़ (नगर पालिका)';
    municipality = 'हमीरगढ़';
  } else if (p === 108) {
    tehsil = 'रायपुर';
    samiti = 'रायपुर';
  }

  // Apply explicit disambiguation if applicable
  if (EXPLICIT_DISAMBIGUATION[p]) {
    vil = EXPLICIT_DISAMBIGUATION[p].village;
    tehsil = EXPLICIT_DISAMBIGUATION[p].tehsil || tehsil;
  }

  results[p] = {
    partNumber: p,
    village: vil,
    building: item.building,
    label: `भाग ${p} - ${vil}`,
    tehsil,
    samiti,
    municipality,
    district: 'भीलवाड़ा'
  };
}

console.log(`Successfully mapped all ${Object.keys(results).length} parts with verified village names and disambiguation.`);

fs.writeFileSync(outJsonPath, JSON.stringify(results, null, 2), 'utf-8');
console.log(`Saved to ${outJsonPath}`);
