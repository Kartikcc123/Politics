const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function getPdfCoverInfo(pdfPath) {
  const text = execSync(`pdftotext -f 1 -l 2 "${pdfPath}" -`, { encoding: 'utf8' });
  const gpMatch = text.match(/(?:ग्रामपंचायत|गरमपपचरजत)\s*:\s*([^\n\r]+)/i);
  const wardMatch = text.match(/(?:वार्ड क्रमांक|ररडर कमरपक)\s*:\s*(\d+)/i) || pdfPath.match(/Ward\s*No-?0*(\d+)/i);
  const villageMatch = text.match(/(?:मुख्य गांव|मचखज गरपर)\s*:\s*([^\n\r]+)/i);
  
  return {
    gramPanchayat: gpMatch ? gpMatch[1].trim() : '',
    wardNumber: wardMatch ? String(parseInt(wardMatch[1], 10)) : '',
    village: villageMatch ? villageMatch[1].trim() : ''
  };
}

const sets = [
  { name: 'BORANA', dir: 'C:\\Users\\Ashish Sharma\\Downloads\\Borana', prefix: 'BORANA-' },
  { name: 'BORIYAPURA', dir: 'C:\\Users\\Ashish Sharma\\Downloads\\boriyapur', prefix: 'BORIYAPURA-' },
  { name: 'DEVRIYA', dir: 'C:\\Users\\Ashish Sharma\\Downloads\\WithoutPhoto', prefix: 'DEVRIYA-' }
];

for (const s of sets) {
  console.log(`\n=== INSPECTING ${s.name} WARD PDFS ===\n`);
  const files = fs.readdirSync(s.dir).filter(f => f.startsWith(s.prefix) && f.endsWith('.pdf')).sort((a, b) => {
    const numA = parseInt(a.match(/\d+/)?.[0] || '0', 10);
    const numB = parseInt(b.match(/\d+/)?.[0] || '0', 10);
    return numA - numB;
  });

  for (const file of files) {
    const fullPath = path.join(s.dir, file);
    const info = getPdfCoverInfo(fullPath);
    console.log(`📁 ${file}: GP='${info.gramPanchayat}', Ward=${info.wardNumber}, Village='${info.village}'`);
  }
}
