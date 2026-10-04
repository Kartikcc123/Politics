const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const thalaDir = 'C:\\Users\\Ashish Sharma\\Downloads\\THALA';
const files = fs.readdirSync(thalaDir).filter(f => f.endsWith('.pdf'));

console.log(`Found ${files.length} PDF files in ${thalaDir}:\n`);

for (const file of files) {
  const fullPath = path.join(thalaDir, file);
  try {
    const text = execSync(`pdftotext "${fullPath}" -`, { encoding: 'utf8' });
    const epics = text.match(/(?:[A-Z]{3}\d{7})|(?:RJ\/\d+\/\d+\/\d+)/g) || [];
    const uniqueEpics = [...new Set(epics)];
    
    // Extract cover page metadata
    const gpMatch = text.match(/(?:ग्रामपंचायत|गरमपपचरजत)\s*:\s*([^\n\r]+)/i);
    const wardMatch = text.match(/(?:वार्ड क्रमांक|ररडर कमरपक)\s*:\s*(\d+)/i) || file.match(/Ward\s*No-?0*(\d+)/i);
    const villageMatch = text.match(/(?:मुख्य गांव|मचखज गरपर)\s*:\s*([^\n\r]+)/i);
    const boothMatch = text.match(/(?:मतदान बूथ|मतदरन बबस)[^\n\r]*:\s*([^\n\r]+)/i);

    console.log(`📄 [${file}]`);
    console.log(`   GP: ${gpMatch ? gpMatch[1].trim() : 'थला'} | Ward: ${wardMatch ? wardMatch[1] : '?'} | Main Village: ${villageMatch ? villageMatch[1].trim() : '?'}`);
    console.log(`   Booth: ${boothMatch ? boothMatch[1].trim() : '?'}`);
    console.log(`   Total Unique EPICs: ${uniqueEpics.length} | Total EPIC mentions: ${epics.length}\n`);
  } catch (e) {
    console.error(`Error reading ${file}:`, e.message);
  }
}
