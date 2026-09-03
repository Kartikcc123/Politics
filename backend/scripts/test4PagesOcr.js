require('dotenv').config();
const path = require('path');
const { ocrPdf } = require('../src/utils/pdfOcr');

async function test4Pages() {
  console.log('--- Testing OCR Parsing for Pages 1 to 4 ---');
  const pdfPath = path.resolve(__dirname, '../../sample-data/DOC-20260424-WA0137..pdf');
  
  const ocrResult = await ocrPdf(pdfPath, 'DOC-20260424-WA0137..pdf', {
    firstPage: 1,
    lastPage: 4,
    onProgress: (p) => {
      if (p.phase === 'ocr') {
        process.stdout.write(`\rProgress: Page ${p.processedPages}/${p.totalPages}`);
      }
    },
  });

  console.log('\n\n========== OCR RESULT SUMMARY ==========');
  console.log('Header Section Map:', JSON.stringify(ocrResult.header?.sectionMap, null, 2));
  console.log('Header Section Number:', ocrResult.header?.sectionNumber);
  console.log('Header Section Name:', ocrResult.header?.sectionName);
  console.log('Header Assembly:', ocrResult.header?.assemblyNumber, ocrResult.header?.assemblyName);
  console.log('Header Part:', ocrResult.header?.partNumber);

  const voterRecords = ocrResult.voterRecords || [];
  console.log('\nTotal Extracted Voter Records:', voterRecords.length);

  const sectionDistribution = {};
  voterRecords.forEach((r, idx) => {
    const secKey = `${r.sectionNumber || 'EMPTY'} - ${r.sectionName || 'EMPTY'}`;
    sectionDistribution[secKey] = (sectionDistribution[secKey] || 0) + 1;
    if (idx < 5 || idx >= voterRecords.length - 5) {
      console.log(`Voter #${r.voterSerial || idx+1}: Name="${r.name}", SecNum="${r.sectionNumber}", SecName="${r.sectionName}"`);
    }
  });

  console.log('\nSection Distribution Across Cards:', JSON.stringify(sectionDistribution, null, 2));
  process.exit(0);
}

test4Pages().catch(err => {
  console.error('Error running test:', err);
  process.exit(1);
});
