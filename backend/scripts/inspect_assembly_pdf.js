const { execSync } = require('child_process');
const fs = require('fs');

const samplePart = 'D:\\Randeep Trivedi Voter list\\Final Publication 21.02.2026\\2026-EROLLGEN-S20-179-SIR-FinalRoll-Revision1-HIN-2.pdf';

if (fs.existsSync(samplePart)) {
  console.log('Found Part 2 PDF!');
  const txt = execSync(`pdftotext -f 3 -l 3 -layout -enc UTF-8 "${samplePart}" -`, { maxBuffer: 10 * 1024 * 1024 }).toString('utf8');
  console.log('--- Page 3 of Part 2 (Assembly Roll) ---');
  console.log(txt.slice(0, 3000));
} else {
  console.log('Part 2 PDF not found at path');
}
