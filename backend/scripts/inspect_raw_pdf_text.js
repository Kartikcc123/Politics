const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function testPdfRawText() {
  const samplePdf = 'C:\\Users\\Ashish Sharma\\Downloads\\THALA\\1.pdf';
  if (!fs.existsSync(samplePdf)) {
    console.log('File not found:', samplePdf);
    return;
  }

  // Extract raw text using pdftotext
  const txt = execSync(`pdftotext -layout -enc UTF-8 "${samplePdf}" -`, { maxBuffer: 10 * 1024 * 1024 }).toString('utf8');
  console.log('--- Sample text from 1.pdf (first 2500 chars) ---');
  console.log(txt.slice(0, 2500));

  // Let's print character codes of a few words
  const lines = txt.split('\n').filter(l => l.includes('नाम') || l.includes('नरम') || l.includes('नपतर') || l.includes('पनत') || l.includes('पिता') || l.includes('पति'));
  console.log('\n--- Sample name lines ---');
  lines.slice(0, 15).forEach(l => {
    console.log(l);
  });
}

testPdfRawText().catch(console.error);
