const { execSync } = require('child_process');

const pdfPath = 'C:\\Users\\Ashish Sharma\\Downloads\\THALA\\THALA-Ward No-001.pdf';
const xml = execSync(`pdftotext -f 4 -l 4 -bbox "${pdfPath}" -`, { encoding: 'utf8' });

const wordRegex = /<word\s+xMin="([\d.]+)"\s+yMin="([\d.]+)"\s+xMax="([\d.]+)"\s+yMax="([\d.]+)">([^<]+)<\/word>/g;
let wMatch;
const words = [];
while ((wMatch = wordRegex.exec(xml)) !== null) {
  words.push({
    xMin: parseFloat(wMatch[1]),
    yMin: parseFloat(wMatch[2]),
    xMax: parseFloat(wMatch[3]),
    yMax: parseFloat(wMatch[4]),
    text: wMatch[5].trim()
  });
}

console.log('Words on page 4 (first 60):');
words.slice(0, 60).forEach(w => {
  console.log(`x=${w.xMin.toFixed(1)}, y=${w.yMin.toFixed(1)} -> ${w.text}`);
});
