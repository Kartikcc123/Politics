const { execSync } = require('child_process');

const pdfPath = 'C:\\Users\\Ashish Sharma\\Downloads\\THALA\\THALA-Ward No-001.pdf';
const bboxText = execSync(`pdftotext -f 3 -l 3 -bbox "${pdfPath}" -`, { encoding: 'utf8' });
console.log(bboxText.slice(0, 2000));
