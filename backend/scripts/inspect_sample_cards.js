const { execSync } = require('child_process');
const { decodeSecHindi } = require('../src/utils/secHindiDecoder');

function inspectPdf(pdfPath) {
  console.log('\n======================================================');
  console.log('Inspecting:', pdfPath);
  console.log('======================================================');
  
  const xml = execSync(`pdftotext -bbox "${pdfPath}" -`, { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 });
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

    // Check if this page has cards
    const serials = words.filter(w => /^[OESR]?\d{1,4}$/.test(w.text) && w.xMin >= 25 && w.xMin <= 70 && w.yMin >= 68 && w.yMin <= 740);
    if (serials.length >= 2) {
      console.log(`Page ${pIdx}: Found ${serials.length} serials in col 0:`, serials.slice(0, 5).map(s => s.text));
      // Inspect first 2 cards in col 0
      for (const sc of serials.slice(0, 2)) {
        const cardWords = words.filter(w =>
          w.xMin >= 20 && w.xMax <= 210 &&
          w.yMin >= sc.yMin - 8 && w.yMax <= sc.yMin + 70
        );
        const raw = cardWords.map(w => w.text).join(' ');
        const decoded = decodeSecHindi(raw);
        console.log(`--- Card Serial ${sc.text} (y: ${sc.yMin}) ---`);
        console.log('RAW:    ', raw);
        console.log('DECODED:', decoded);
      }
      break; // inspect first voter page only
    }
  }
}

inspectPdf('C:\\Users\\Ashish Sharma\\Downloads\\THALA\\THALA-Ward No-001.pdf');
inspectPdf('C:\\Users\\Ashish Sharma\\Downloads\\Raipur\\RAIPUR-Ward No-001.pdf');
inspectPdf('C:\\Users\\Ashish Sharma\\Downloads\\KHEMANA-\\KHEMANA-Ward No-001.pdf');
inspectPdf('C:\\Users\\Ashish Sharma\\Downloads\\5\\CHAROT-Ward No-001.pdf');
