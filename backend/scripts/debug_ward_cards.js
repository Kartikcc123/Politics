const { execSync } = require('child_process');

const pdfPath = 'C:\\Users\\Ashish Sharma\\Downloads\\KHEMANA-\\KHEMANA-Ward No-001.pdf';
const xml = execSync(`pdftotext -bbox -f 3 -l 3 "${pdfPath}" -`, { encoding: 'utf8' });

// Print words between y 135 and 300
const wordRegex = /<word\s+xMin="([\d.]+)"\s+yMin="([\d.]+)"\s+xMax="([\d.]+)"\s+yMax="([\d.]+)">([^<]+)<\/word>/g;
let m;
let words = [];
while ((m = wordRegex.exec(xml)) !== null) {
  words.push({
    x: parseFloat(m[1]),
    y: parseFloat(m[2]),
    text: m[5].trim()
  });
}

// Group into cards
console.log('Words on page 3:');
words.filter(w => w.y >= 130 && w.y < 300).forEach(w => {
  console.log(`y=${w.y.toFixed(1)}, x=${w.x.toFixed(1)}: ${w.text}`);
});
