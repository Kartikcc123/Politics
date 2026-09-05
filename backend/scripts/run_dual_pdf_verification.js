const path = require('path');
const fs = require('fs');
const { ocrPdf } = require('../src/utils/pdfOcr');

async function testPdf(pdfPath, name, firstPage, lastPage) {
  console.log(`\n========================================================================`);
  console.log(` TESTING: ${name} (${path.basename(pdfPath)}) Pages ${firstPage}-${lastPage || 'end'}`);
  console.log(`========================================================================`);
  const result = await ocrPdf(pdfPath, path.basename(pdfPath), { firstPage, lastPage });
  const records = result.voterRecords || [];
  console.log(`Total Voters Extracted: ${records.length}\n`);
  
  console.log('Serial'.padEnd(8) + 'Voter ID'.padEnd(18) + 'Name'.padEnd(20) + 'House'.padEnd(10) + 'Age'.padEnd(6));
  console.log('-'.repeat(62));
  for (const r of records) {
    console.log(
      String(r.voterSerial || '-').padEnd(8) +
      String(r.voterId || 'N/A').padEnd(18) +
      String(r.name || '').padEnd(20).slice(0, 19) +
      String(r.houseNumber || '-').padEnd(10) +
      String(r.age || '-').padEnd(6)
    );
  }
  return records;
}

async function main() {
  const pdf1 = 'd:/Users/Ashish Sharma/OneDrive/Documents/Downloads/Politics-main/Politics-main/sample-data/DOC-3pages.pdf';
  const pdf2 = 'C:/Users/Ashish Sharma/OneDrive/Documents/Downloads/2026-EROLLGEN-S20-179-SIR-FinalRoll-Revision1-HIN-177.pdf';

  if (fs.existsSync(pdf1)) {
    await testPdf(pdf1, 'PDF 1 (Bheeta Part 7)', 1, 3);
  }
  if (fs.existsSync(pdf2)) {
    await testPdf(pdf2, 'PDF 2 (Part 177)', 1, 3);
  }
}

main().catch(console.error);
