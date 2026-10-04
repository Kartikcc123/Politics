require('dotenv').config();
const path = require('path');
const { ocrPdf } = require('../src/utils/pdfOcr');

async function runSectionTest() {
  console.log('====================================================');
  console.log('    TESTING REAL ANUBHAG (SECTION) OCR FETCHING     ');
  console.log('====================================================');

  const pdfPath = path.resolve(__dirname, '../../sample-data/DOC-4pages.pdf');
  console.log('Target PDF:', pdfPath);

  const start = Date.now();
  const ocrResult = await ocrPdf(pdfPath, 'DOC-4pages.pdf', {
    firstPage: 1,
    lastPage: 4,
    onProgress: (p) => {
      if (p.phase === 'ocr') {
        process.stdout.write(`\r[OCR Progress] Page ${p.processedPages}/${p.totalPages} | Cards: ${p.processedCards}`);
      }
    },
  });

  console.log(`\n\nCompleted in ${((Date.now() - start) / 1000).toFixed(1)}s`);
  console.log('\n--- 1. MASTER SECTION MAP (From Page 2 Table) ---');
  console.log(JSON.stringify(ocrResult.header?.sectionMap || {}, null, 2));

  console.log('\n--- 2. HEADER DETAILS ---');
  console.log('Assembly Number:', ocrResult.header?.assemblyNumber);
  console.log('Assembly Name:', ocrResult.header?.assemblyName);
  console.log('Part Number:', ocrResult.header?.partNumber);
  console.log('Village:', ocrResult.header?.village);

  const voterRecords = ocrResult.voterRecords || [];
  console.log(`\n--- 3. VOTER RECORDS (${voterRecords.length} Total) ---`);

  const sectionCounts = {};
  voterRecords.forEach((r, idx) => {
    const key = `Section ${r.sectionNumber || 'MISSING'}: "${r.sectionName || 'MISSING'}"`;
    sectionCounts[key] = (sectionCounts[key] || 0) + 1;
    if (idx < 6) {
      console.log(`Card #${r.voterSerial || (idx + 1)} | Name: "${r.name}" | SecNum: "${r.sectionNumber}" | SecName: "${r.sectionName}"`);
    }
  });

  console.log('\n--- 4. SECTION DISTRIBUTION ACROSS ALL VOTERS ---');
  console.log(JSON.stringify(sectionCounts, null, 2));

  const hasMissing = voterRecords.some(r => !r.sectionNumber || !r.sectionName);
  if (hasMissing) {
    console.log('\n❌ WARNING: Some voters have missing sectionNumber or sectionName!');
  } else {
    console.log('\n✅ SUCCESS: All voters have valid sectionNumber and sectionName!');
  }

  process.exit(hasMissing ? 1 : 0);
}

runSectionTest().catch(err => {
  console.error('\n❌ Test Error:', err);
  process.exit(1);
});
