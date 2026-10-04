const { execSync } = require('child_process');
const fs = require('fs');

const text = execSync('pdftotext "C:\\Users\\Ashish Sharma\\Downloads\\Mobile Devices\\Gram panchyat .pdf" -', { encoding: 'utf8' });
fs.writeFileSync('scripts/raipur_gazette_text.txt', text);
console.log('Saved gazette text. Total chars:', text.length);
console.log(text.slice(0, 2000));
