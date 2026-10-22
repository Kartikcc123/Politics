const fs = require('fs');
const pdfParse = require('pdf-parse');

async function testPdf() {
  const filePath = 'C:/Users/pc/Downloads/koshithal/WithPhoto_KOSHITHAL-Ward No-001.pdf';
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdfParse(dataBuffer);

  console.log('Total pages:', data.numpages);
  console.log('Sample text (first 1000 chars):');
  console.log(data.text.substring(0, 1000));
}

testPdf().catch(console.error);
