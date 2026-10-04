const path = require('path');
const { ocrPdf } = require('../src/utils/pdfOcr');

const pdfPath = 'C:/Users/Ashish Sharma/.gemini/antigravity-ide/brain/4dd17233-d015-41cc-ac50-77ae6e2f7142/.user_uploaded/media_1789959456440.pdf';

console.log('====================================================');
console.log('Testing Software OCR on media_1789959456440.pdf (Amli)');
console.log('Pages 1 to 3');
console.log('====================================================');

async function test() {
  try {
    const res = await ocrPdf(pdfPath, 'media_1789959456440.pdf', { firstPage: 1, lastPage: 3 });
    console.log('Status:', res.status);
    const records = res.voterRecords || [];
    console.log('Total Extracted Records:', records.length);
    records.forEach((r, i) => {
      console.log(`Record #${i+1} | Serial: ${r.voterSerial || r.serial || 'N/A'} | EPIC: ${r.voterId || r.epic || 'N/A'} | Name: ${r.name || 'N/A'} | House: ${r.houseNumber || r.house || 'N/A'} | Page: ${r.page || 'N/A'}`);
    });
  } catch (err) {
    console.error('Error during test:', err);
  }
}

test();
