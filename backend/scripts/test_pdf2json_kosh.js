const fs = require('fs');
const PDFParser = require('pdf2json');
const { decodeSecHindi } = require('../src/utils/secHindiDecoder');

const pdfParser = new PDFParser();

pdfParser.on('pdfParser_dataError', errData => console.error(errData.parserError));
pdfParser.on('pdfParser_dataReady', pdfData => {
  console.log('Total Pages:', pdfData.Pages.length);
  // Inspect Page 3 (first voter page)
  const p3 = pdfData.Pages[2];
  console.log('Page 3 Texts count:', p3.Texts.length);

  // Group texts by Y coordinate or print raw texts
  const texts = p3.Texts.map(t => {
    const raw = decodeURIComponent(t.R[0].T);
    return {
      x: t.x,
      y: t.y,
      w: t.w,
      raw: raw,
      decoded: decodeSecHindi(raw)
    };
  });

  console.log('\n--- Sample 40 texts on Page 3 ---');
  texts.slice(0, 40).forEach(t => {
    console.log(`(x: ${t.x.toFixed(2)}, y: ${t.y.toFixed(2)}) | Raw: "${t.raw}" | Decoded: "${t.decoded}"`);
  });
});

pdfParser.loadPDF('C:/Users/pc/Downloads/koshithal/WithPhoto_KOSHITHAL-Ward No-001.pdf');
