const { execSync } = require('child_process');

const pdfPath = 'C:\\Users\\Ashish Sharma\\Downloads\\THALA\\THALA-Ward No-001.pdf';
const xml = execSync(`pdftotext -bbox "${pdfPath}" -`, { encoding: 'utf8', maxBuffer: 100 * 1024 * 1024 });

const pageRegex = /<page\s+width="([\d.]+)"\s+height="([\d.]+)">([\s\S]*?)<\/page>/g;
let pageMatch;
let pageIndex = 0;

while ((pageMatch = pageRegex.exec(xml)) !== null) {
  pageIndex++;
  const pageContent = pageMatch[3];
  const epicRegex = /(?:[A-Z]{3}\d{7})|(?:RJ\/\d+\/\d+\/\d+)/g;
  const epics = (pageContent.match(epicRegex) || []);
  console.log(`Page ${pageIndex}: ${epics.length} EPICs found -> ${epics.slice(0, 3).join(', ')} ...`);
}
