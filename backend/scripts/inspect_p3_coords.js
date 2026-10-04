const { execSync } = require('child_process');

const pdfPath = 'C:\\Users\\Ashish Sharma\\Downloads\\THALA\\THALA-Ward No-001.pdf';
const xml = execSync(`pdftotext -f 3 -l 3 -bbox "${pdfPath}" -`, { encoding: 'utf8' });

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

console.log(`Total words on Page 3: ${words.length}`);
// Print words that look like serial or EPIC
const epics = words.filter(w => /(?:[A-Z]{3}\d{7})|(?:RJ\/\d+\/\d+\/\d+)/.test(w.text));
console.log('EPICs on page 3:', epics.map(w => `x=${w.xMin.toFixed(1)}, y=${w.yMin.toFixed(1)} -> ${w.text}`));

// Print numbers
const nums = words.filter(w => /^\d{1,4}$/.test(w.text) && w.yMin > 100 && w.yMin < 750);
console.log('Numbers on page 3:', nums.map(w => `x=${w.xMin.toFixed(1)}, y=${w.yMin.toFixed(1)} -> ${w.text}`));
