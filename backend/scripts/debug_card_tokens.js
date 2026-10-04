const { execSync } = require('child_process');
const { decodeSecHindi } = require('../src/utils/secHindiDecoder');

const testPdfs = [
  'C:\\Users\\Ashish Sharma\\Downloads\\THALA\\THALA-Ward No-001.pdf',
  'C:\\Users\\Ashish Sharma\\Downloads\\Raipur\\RAIPUR-Ward No-001.pdf',
  'C:\\Users\\Ashish Sharma\\Downloads\\KHEMANA-\\KHEMANA-Ward No-001.pdf',
  'C:\\Users\\Ashish Sharma\\Downloads\\Nathdiyas\\NATHDIYAAS-Ward No-001.pdf'
];

testPdfs.forEach(pdf => {
  console.log('================================================================');
  console.log('PDF:', pdf);
  console.log('================================================================');
  const xml = execSync(`pdftotext -bbox "${pdf}" -`, { encoding: 'utf8' });
  const pageRegex = /<page\s+width="([\d.]+)"\s+height="([\d.]+)">([\s\S]*?)<\/page>/g;
  let pageMatch = pageRegex.exec(xml); // page 1
  pageMatch = pageRegex.exec(xml); // page 2
  pageMatch = pageRegex.exec(xml); // page 3 (first voter page)

  if (pageMatch) {
    const pageXml = pageMatch[3];
    const wordRegex = /<word\s+xMin="([\d.]+)"\s+yMin="([\d.]+)"\s+xMax="([\d.]+)"\s+yMax="([\d.]+)">([\s\S]*?)<\/word>/g;
    let wordMatch;
    const words = [];
    while ((wordMatch = wordRegex.exec(pageXml)) !== null) {
      words.push({
        xMin: parseFloat(wordMatch[1]),
        yMin: parseFloat(wordMatch[2]),
        xMax: parseFloat(wordMatch[3]),
        yMax: parseFloat(wordMatch[4]),
        text: wordMatch[5].trim()
      });
    }

    // Print first 3 cards bounding words
    const serialWords = words.filter(w => /^[OESR]?\d{1,4}$/.test(w.text) && w.xMin < 80 && w.yMin >= 68 && w.yMin <= 740);
    console.log('Found serial candidates in col 0:', serialWords.map(s => s.text));

    serialWords.slice(0, 3).forEach(sc => {
      const cardWords = words.filter(w =>
        w.xMin >= 20 && w.xMax <= 215 &&
        w.yMin >= sc.yMin - 10 && w.yMax <= sc.yMin + 75
      );
      const rawText = cardWords.map(w => w.text).join(' ');
      const decodedText = decodeSecHindi(rawText);
      console.log(`\n--- Card Serial ${sc.text} ---`);
      console.log('RAW:\n', rawText);
      console.log('DECODED:\n', decodedText);
    });
  }
});
