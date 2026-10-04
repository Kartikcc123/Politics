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

const dir = 'C:\\Users\\Ashish Sharma\\Downloads\\WithoutPhoto';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.pdf')).sort();

for (const file of files) {
  const fullPath = path.join(dir, file);
  const info = getPdfCoverInfo(fullPath);
  console.log(`📁 ${file.padEnd(30, ' ')}: GP='${info.gramPanchayat.padEnd(12, ' ')}', Ward=${info.wardNumber}, Village='${info.village}'`);
}
