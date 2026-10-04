const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { decodeSecHindi } = require('../src/utils/secHindiDecoder');

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

// Group by Panchayat & Ward
const gpWard = {};
for (const pdf of allPdfs) {
  const m = pdf.name.match(/([A-Za-z\s-]+?)-Ward\s*No-?0*(\d+)\.pdf/i);
  if (m) {
    const gp = m[1].trim().toUpperCase().replace(/[-_]/g, ' ').replace(/\s+/g, ' ');
    const ward = parseInt(m[2], 10);
    if (!gpWard[gp]) gpWard[gp] = {};
    gpWard[gp][ward] = pdf.path;
  }
}

console.log('Inspecting Page 1 village/area descriptions for all Panchayats:');
for (const [gp, wards] of Object.entries(gpWard)) {
  console.log(`\n=== GP: ${gp} ===`);
  for (const [wNo, pPath] of Object.entries(wards)) {
    try {
      const xml = execSync(`pdftotext -f 1 -l 1 -bbox "${pPath}" -`, { encoding: 'utf8' });
      const textOnly = xml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
      const decoded = decodeSecHindi(textOnly);
      
      let village = '';
      // Look for patterns like मुख्य ग्राम / ग्राम / मोहल्ला
      const villM = decoded.match(/(?:मुख्य\s*ग्राम|ग्राम|गांव|गाँव|महरललर|मोहल्ला|वार्ड\s*का\s*नाम|वार्ड)\s*:\s*([^:,;\n\r]+)/);
      if (villM) village = villM[1].trim();
      console.log(`   Ward ${wNo.padEnd(2)} -> Village/Area: "${village}"`);
    } catch (e) {
      console.log(`   Ward ${wNo.padEnd(2)} -> Error reading`);
    }
  }
}
