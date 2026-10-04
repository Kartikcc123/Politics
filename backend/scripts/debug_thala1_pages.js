const { execSync } = require('child_process');

const xml = execSync('pdftotext -bbox "C:\\Users\\Ashish Sharma\\Downloads\\THALA\\THALA-Ward No-001.pdf" -', { encoding: 'utf8' });
const pageRegex = /<page\s+width="([\d.]+)"\s+height="([\d.]+)">([\s\S]*?)<\/page>/g;
let pageMatch;
let pIdx = 0;

while ((pageMatch = pageRegex.exec(xml)) !== null) {
  pIdx++;
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
  
  // Serials on this page
  const serials = [];
  for (const w of words) {
    if (w.yMin >= 130 && w.yMin <= 760 && /^[OESR]?\d{1,4}$/.test(w.text)) {
      let col = -1;
      if (w.xMin >= 25 && w.xMin <= 75) col = 0;
      else if (w.xMin >= 205 && w.xMin <= 265) col = 1;
      else if (w.xMin >= 380 && w.xMin <= 445) col = 2;
      if (col !== -1) {
        const isAge = words.some(other =>
          (other.text.includes('आजच') || other.text.includes('आयु')) &&
          Math.abs(other.yMin - w.yMin) <= 6 &&
          Math.abs(other.xMin - w.xMin) < 50
        );
        if (!isAge) {
          serials.push({ text: w.text, col, y: Math.round(w.yMin), num: parseInt(w.text.replace(/^[OESR]/, ''), 10) });
        }
      }
    }
  }
  console.log(`Page ${pIdx}: Found ${serials.length} serials:`, serials.map(s => s.num).join(', '));
}
