const { execSync } = require('child_process');
const fs = require('fs');

const pdfPath = 'C:\\Users\\Ashish Sharma\\Downloads\\KHEMANA-\\KHEMANA-Ward No-001.pdf';
const xml = execSync(`pdftotext -bbox -f 3 -l 3 "${pdfPath}" -`, { encoding: 'utf8' });
console.log('XML snippet from page 3:');
console.log(xml.slice(0, 4000));
