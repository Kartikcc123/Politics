const path = require('path');
const { ocrPdf } = require('../src/utils/pdfOcr');

async function test() {
  const pdfPath = path.resolve(__dirname, '../../sample-data/DOC-3pages.pdf');
  console.log('Running local OCR on 3-page PDF:', pdfPath);
  const result = await ocrPdf(pdfPath, 'DOC-3pages.pdf', {
    firstPage: 1,
    lastPage: 3
  });
  console.log('Total OCR Voter Records:', result.voterRecords.length);
  result.voterRecords.forEach((v, i) => {
    console.log(`[${i+1}] Name: ${v.name} | Guardian: ${v.guardianName} | EPIC: ${v.voterId} | House: "${v.houseNumber}" | Raw House: "${v.rawFields?.houseNumber || ''}"`);
  });
}
test().catch(console.error);
