const { execSync } = require('child_process');
const fs = require('fs');

async function testPdfRaw() {
  const pdfPath = 'C:\\Users\\Ashish Sharma\\Downloads\\THALA\\THALA-Ward No-001.pdf';
  const txt = execSync(`pdftotext -layout -enc UTF-8 "${pdfPath}" -`, { maxBuffer: 10 * 1024 * 1024 }).toString('utf8');
  console.log('--- Raw text page 2/3 snippet ---');
  const lines = txt.split('\n');
  for (let i = 0; i < Math.min(lines.length, 100); i++) {
    console.log(`${i+1}: ${lines[i]}`);
  }
}

testPdfRaw().catch(console.error);
