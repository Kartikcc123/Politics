const { execSync } = require('child_process');
const fs = require('fs');

const txt = execSync(`pdftotext -f 3 -l 3 -layout -enc UTF-8 "C:\\Users\\Ashish Sharma\\Downloads\\panotiya\\PANOTIYA-Ward No-004.pdf" -`, { maxBuffer: 10 * 1024 * 1024 }).toString('utf8');
const lines = txt.split('\n');

for (const l of lines) {
  if (l.includes('आजच') || l.includes('ललग') || l.includes('लिंग') || l.includes('आयु')) {
    console.log('Age line:', l);
  }
}
