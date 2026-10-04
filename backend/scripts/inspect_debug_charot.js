const { execSync } = require('child_process');
const { decodeSecHindi } = require('../src/utils/secHindiDecoder');

const xml = execSync('pdftotext -bbox "C:/Users/Ashish Sharma/Downloads/5/CHAROT-Ward No-001.pdf" -', { encoding: 'utf8' });
const pageRegex = /<page\s+width="([\d.]+)"\s+height="([\d.]+)">([\s\S]*?)<\/page>/g;
let pm;
let pIdx = 0;
while ((pm = pageRegex.exec(xml)) !== null) {
  pIdx++;
  const pXml = pm[3];
  const wordRegex = /<word\s+xMin="([\d.]+)"\s+yMin="([\d.]+)"\s+xMax="([\d.]+)"\s+yMax="([\d.]+)">([\s\S]*?)<\/word>/g;
  let wm;
  const words = [];
  while ((wm = wordRegex.exec(pXml)) !== null) {
    words.push({ text: wm[5].trim(), x: parseFloat(wm[1]), y: parseFloat(wm[2]) });
  }

  // Look at cards on page 2
  if (pIdx === 2) {
    console.log(`=== Page 2 Total words: ${words.length} ===`);
    for (const w of words) {
      if (w.y < 200) {
        console.log(`  Word: "${w.text}" (Decoded: "${decodeSecHindi(w.text)}") at x=${Math.round(w.x)}, y=${Math.round(w.y)}`);
      }
    }
  }

  const y2026 = words.find(w => w.text === '2026');
  if (y2026) {
    console.log(`Page ${pIdx} has 2026 at x=${Math.round(y2026.x)}, y=${Math.round(y2026.y)}`);
  }
}
