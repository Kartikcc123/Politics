const path = require('path');
const { ocrPdf } = require('../src/utils/pdfOcr');

const pdfPath = path.resolve(__dirname, '../../sample-data/DOC-3pages.pdf');

async function testHouseNumbers() {
  console.log('========================================================================');
  console.log('   LOCAL OCR PROOF: TESTING HOUSE NUMBER EXTRACTION ON DOC-3pages.pdf');
  console.log('========================================================================\n');

  const result = await ocrPdf(pdfPath, 'DOC-3pages.pdf');
  const voterRecords = result.voterRecords || [];

  console.log('------------------------------------------------------------------------');
  console.log('Serial'.padEnd(8) + 'EPIC'.padEnd(16) + 'Name'.padEnd(20) + 'House Number (गृह संख्या)');
  console.log('------------------------------------------------------------------------');

  for (let i = 0; i < Math.min(voterRecords.length, 30); i++) {
    const v = voterRecords[i];
    const serial = String(v.voterSerial || (i + 1)).padEnd(8);
    const epic = String(v.voterId || 'N/A').padEnd(16);
    const name = String(v.name || '').padEnd(20).slice(0, 19);
    const house = String(v.houseNumber || '-');

    console.log(`${serial}${epic}${name}${house}`);
  }
  console.log('------------------------------------------------------------------------\n');
}

testHouseNumbers().catch(console.error);
