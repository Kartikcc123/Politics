const { execSync } = require('child_process');

const xml = execSync('pdftotext -bbox "C:\\Users\\Ashish Sharma\\Downloads\\THALA\\THALA-Ward No-001.pdf" -', { encoding: 'utf8' });
const pageRegex = /<page\s+width="([\d.]+)"\s+height="([\d.]+)">([\s\S]*?)<\/page>/g;
let pageMatch = pageRegex.exec(xml); // 1
pageMatch = pageRegex.exec(xml); // 2
pageMatch = pageRegex.exec(xml); // 3

const pageXml = pageMatch[3];
const wordRegex = /<word\s+xMin="([\d.]+)"\s+yMin="([\d.]+)"\s+xMax="([\d.]+)"\s+yMax="([\d.]+)">([\s\S]*?)<\/word>/g;
let wMatch;
const words = [];
while ((wMatch = wordRegex.exec(pageXml)) !== null) {
  words.push({
    xMin: parseFloat(wMatch[1]),
    yMin: parseFloat(wMatch[2]),
    xMax: parseFloat(wMatch[3]),
    yMax: parseFloat(wMatch[4]),
    text: wMatch[5].trim()
  });
}

// Print all words in column 0 (xMin between 20 and 205) sorted by yMin
const col0 = words.filter(w => w.xMin >= 20 && w.xMax <= 205).sort((a,b) => a.yMin - b.yMin);
console.log('--- ALL WORDS IN COLUMN 0 (PAGE 3) ---');
col0.forEach(w => {
  console.log(`y: ${w.yMin.toFixed(1)}-${w.yMax.toFixed(1)} | x: ${w.xMin.toFixed(1)}-${w.xMax.toFixed(1)} | "${w.text}"`);
});
