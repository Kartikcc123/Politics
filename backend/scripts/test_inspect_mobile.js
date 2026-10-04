const { execSync } = require('child_process');
const path = require('path');
const { decodeSecHindi } = require('../src/utils/secHindiDecoder');

const files = [
  'C:\\Users\\Ashish Sharma\\Downloads\\Mobile Devices\\Gram panchyat  (1).pdf',
  'C:\\Users\\Ashish Sharma\\Downloads\\Mobile Devices\\Gram panchyat .pdf'
];

files.forEach(f => {
  try {
    const text = execSync(`pdftotext -l 2 "${f}" -`, { encoding: 'utf8' });
    console.log('===', path.basename(f), '===');
    console.log('RAW:\n', text.slice(0, 500));
    console.log('DECODED:\n', decodeSecHindi(text.slice(0, 500)));
  } catch (e) {
    console.error(e.message);
  }
});
