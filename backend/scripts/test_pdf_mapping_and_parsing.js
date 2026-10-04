const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { decodeSecHindi } = require('../src/utils/secHindiDecoder');

const dirList = [
  'THALA', 'Mobile Devices', 'KHEMANA-', 'Nathdiyas', 'panotiya', 'palra', 'Raipur', 'sagrev', 
  'suras', 'mokhunda', 'Masinghpura_Wards', 'Masinghpur', 'Nahri_Wards', 'Nahri', '5', 
  'boriyapur', 'w', 'Borana', 'o', 'c', 'narayankhera', 'nandasa', 'WithoutPhoto'
];

const GP_CONFIG = {
  'AASHAHOLI': { hindi: 'आशाहोली', defaultVillage: 'आशाहोली' },
  'BAGAR': { hindi: 'बागड़', defaultVillage: 'बागड़' },
  'BAGOLIYA': { hindi: 'बागोलिया', defaultVillage: 'बागोलिया' },
  'BAKAN': { hindi: 'बकाण', defaultVillage: 'बकाण' },
  'BHEETA': { hindi: 'भींटा', defaultVillage: 'भींटा' },
  'BORANA': { hindi: 'बोराणा', defaultVillage: 'बोराणा' },
  'BORIYAPURA': { hindi: 'बोरियापुरा', defaultVillage: 'बोरियापुरा' },
  'CHAROT': { hindi: 'चारोट', defaultVillage: 'चारोट' },
  'DEVRIYA': { hindi: 'देवरिया', defaultVillage: 'देवरिया' },
  'GALWA': { hindi: 'गलवा', defaultVillage: 'गलवा' },
  'GALYAWADI': { hindi: 'गल्यावड़ी', defaultVillage: 'गल्यावड़ी' },
  'JHADOL': { hindi: 'झाड़ोल', defaultVillage: 'झाड़ोल' },
  'KALALKHEDI': { hindi: 'कलालखेड़ी', defaultVillage: 'कलालखेड़ी' },
  'KHAKHAR MALA': { hindi: 'खाखरमाला', defaultVillage: 'खाखरमाला' },
  'KHEMANA': { hindi: 'खेमाणा', defaultVillage: 'खेमाणा' },
  'KOT': { hindi: 'कोट', defaultVillage: 'कोट' },
  'MASINGHPURA': { hindi: 'मासिंगपुरा', defaultVillage: 'मासिंगपुरा' },
  'MOKHUNDA': { hindi: 'मोखुन्दा', defaultVillage: 'मोखुन्दा' },
  'NAHRI': { hindi: 'नाहरी', defaultVillage: 'नाहरी' },
  'NANDSHA JAGEER': { hindi: 'नान्दशा जागीर', defaultVillage: 'नान्दशा जागीर' },
  'NARAYAN KHERA': { hindi: 'नारायणखेड़ा', defaultVillage: 'नारायणखेड़ा' },
  'NATHDIYAAS': { hindi: 'नाथड़ियास', defaultVillage: 'नाथड़ियास' },
  'PALRA': { hindi: 'पालरा', defaultVillage: 'पालरा' },
  'PANOTIYA': { hindi: 'पानोतिया', defaultVillage: 'पानोतिया' },
  'PEETHA KA KHERA': { hindi: 'पीथा का खेड़ा', defaultVillage: 'पीथा का खेड़ा' },
  'RAIPUR': { hindi: 'रायपुर', defaultVillage: 'रायपुर' },
  'SAGREV': { hindi: 'सागरेव', defaultVillage: 'सागरेव' },
  'SURAS': { hindi: 'सुरास', defaultVillage: 'सुरास' },
  'THALA': { hindi: 'थला', defaultVillage: 'थला' }
};

// Aliases for normalisation
const GP_ALIASES = {
  'NATHDIYAS': 'NATHDIYAAS',
  'NANDSHA': 'NANDSHA JAGEER',
  'NARAYANKHERA': 'NARAYAN KHERA',
  'KHAKHARMALA': 'KHAKHAR MALA',
  'PEETHA': 'PEETHA KA KHERA',
  'PEETHAKAKHERA': 'PEETHA KA KHERA',
  'BORIYAPUR': 'BORIYAPURA',
  'MASINGHPUR': 'MASINGHPURA'
};

function normalizeGp(name) {
  let clean = name.trim().toUpperCase().replace(/[-_]/g, ' ').replace(/\s+/g, ' ');
  const noSpace = clean.replace(/\s+/g, '');
  if (GP_CONFIG[clean]) return clean;
  if (GP_ALIASES[clean]) return GP_ALIASES[clean];
  if (GP_ALIASES[noSpace]) return GP_ALIASES[noSpace];
  for (const k of Object.keys(GP_CONFIG)) {
    if (clean.startsWith(k) || k.startsWith(clean)) return k;
  }
  return clean;
}

function scanAll(dir) {
  let res = [];
  if (!fs.existsSync(dir)) return res;
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const full = path.join(dir, item);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      res = res.concat(scanAll(full));
    } else if (item.toLowerCase().endsWith('.pdf')) {
      res.push({ path: full, name: item });
    }
  }
  return res;
}

const allPdfs = [];
for (const d of dirList) {
  const p = path.join('C:\\Users\\Ashish Sharma\\Downloads', d);
  allPdfs.push(...scanAll(p));
}

const gpWardPdfs = {};
for (const pdf of allPdfs) {
  const m = pdf.name.match(/([A-Za-z\s-]+?)-Ward\s*No-?0*(\d+)\.pdf/i);
  if (m) {
    const rawGp = m[1].trim();
    const gpKey = normalizeGp(rawGp);
    const wardNo = parseInt(m[2], 10);
    if (!gpWardPdfs[gpKey]) gpWardPdfs[gpKey] = {};
    // Use the latest or largest file if duplicates
    gpWardPdfs[gpKey][wardNo] = pdf.path;
  }
}

console.log('=== DISCOVERED GRAM PANCHAYATS & WARDS ===');
let totalWardsCount = 0;
for (const [gp, wards] of Object.entries(gpWardPdfs)) {
  const wardNums = Object.keys(wards).map(Number).sort((a,b)=>a-b);
  totalWardsCount += wardNums.length;
  console.log(`${gp.padEnd(20)}: ${wardNums.length} Wards (${wardNums.join(', ')})`);
}
console.log(`\nTotal Gram Panchayats: ${Object.keys(gpWardPdfs).length}`);
console.log(`Total Unique Ward PDFs: ${totalWardsCount}`);
