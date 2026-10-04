const { execSync } = require('child_process');
const fs = require('fs');

const pdfPath = 'C:\\Users\\Ashish Sharma\\Downloads\\THALA\\THALA-Ward No-001.pdf';
const text = execSync(`pdftotext "${pdfPath}" -`, { encoding: 'utf8' });

console.log('Sample Page 3 text snippet from THALA Ward 1:\n');
const lines = text.split('\n');
console.log(lines.slice(80, 200).join('\n'));
