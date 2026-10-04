const { execSync } = require('child_process');

const txt = execSync(`pdftotext -f 3 -l 3 -layout -enc UTF-8 "C:\\Users\\Ashish Sharma\\Downloads\\panotiya\\PANOTIYA-Ward No-004.pdf" -`, { maxBuffer: 10 * 1024 * 1024 }).toString('utf8');

console.log('--- pdftotext -layout page 3 of Panotiya Ward 4 ---');
console.log(txt);
