const fs = require('fs');
const path = require('path');

const dirList = [
  'THALA', 'Mobile Devices', 'KHEMANA-', 'Nathdiyas', 'panotiya', 'palra', 'Raipur', 'sagrev', 
  'suras', 'mokhunda', 'Masinghpura_Wards', 'Masinghpur', 'Nahri_Wards', 'Nahri', '5', 
  'boriyapur', 'w', 'Borana', 'o', 'c', 'narayankhera', 'nandasa', 'WithoutPhoto'
];

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
      res.push({ path: full, name: item, dir: path.basename(dir) });
    }
  }
  return res;
}

const allPdfs = [];
for (const d of dirList) {
  const p = path.join('C:\\Users\\Ashish Sharma\\Downloads', d);
  allPdfs.push(...scanAll(p));
}

console.log('Total PDFs found across all 23 folders:', allPdfs.length);

const gpMap = {};
for (const pdf of allPdfs) {
  const m = pdf.name.match(/([A-Za-z\s-]+?)-Ward\s*No-?0*(\d+)/i);
  if (m) {
    const gp = m[1].trim().toUpperCase().replace(/[-_]/g, ' ').replace(/\s+/g, ' ');
    const ward = parseInt(m[2], 10);
    if (!gpMap[gp]) gpMap[gp] = {};
    if (!gpMap[gp][ward]) gpMap[gp][ward] = [];
    gpMap[gp][ward].push(pdf.path);
  } else {
    if (!gpMap['OTHER']) gpMap['OTHER'] = {};
    if (!gpMap['OTHER'][pdf.name]) gpMap['OTHER'][pdf.name] = [];
    gpMap['OTHER'][pdf.name].push(pdf.path);
  }
}

console.log('Detected Gram Panchayats and Ward counts:');
for (const [gp, wards] of Object.entries(gpMap)) {
  if (gp === 'OTHER') {
    console.log('OTHER files:', Object.keys(wards));
  } else {
    const wardNums = Object.keys(wards).map(Number).sort((a,b)=>a-b);
    console.log(`GP: ${gp.padEnd(20)} -> ${wardNums.length} Wards (${wardNums.join(', ')})`);
  }
}
