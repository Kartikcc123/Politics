const fs = require('fs');
const PDFParser = require('pdf2json');
const { decodeSecHindi } = require('../src/utils/secHindiDecoder');

const pdfParser = new PDFParser();

pdfParser.on('pdfParser_dataReady', pdfData => {
  const p3 = pdfData.Pages[2];
  const texts = p3.Texts.map(t => ({
    x: t.x,
    y: t.y,
    text: decodeSecHindi(decodeURIComponent(t.R[0].T))
  })).filter(t => t.text.trim().length > 0 && t.y > 6);

  // Group into columns: col 1 (x ~ 1..13), col 2 (x ~ 13..25), col 3 (x ~ 25..38)
  console.log(`Voter area texts on Page 3: ${texts.length}`);
  
  // Print first 50 lines in voter area
  texts.slice(0, 60).forEach(t => {
    console.log(`(x: ${t.x.toFixed(2)}, y: ${t.y.toFixed(2)}) ${t.text}`);
  });
});

pdfParser.loadPDF('C:/Users/pc/Downloads/koshithal/WithPhoto_KOSHITHAL-Ward No-001.pdf');
