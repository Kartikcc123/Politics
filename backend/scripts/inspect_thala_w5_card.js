const { execSync } = require('child_process');
const fs = require('fs');

const xml = execSync(`pdftohtml -xml -stdout "C:\\Users\\Ashish Sharma\\Downloads\\THALA\\THALA-Ward No-005.pdf"`, { maxBuffer: 25 * 1024 * 1024 }).toString('utf8');

const pageMatches = xml.split(/<page\s+/).slice(1);
console.log('Total pages in Thala Ward 5:', pageMatches.length);

for (let pIdx = 0; pIdx < pageMatches.length; pIdx++) {
  const pNum = pIdx + 1;
  if (pNum < 3 || pIdx === pageMatches.length - 1) continue;
  const pContent = pageMatches[pIdx];
  const textMatches = [...pContent.matchAll(/<text\s+top="(\d+)"\s+left="(\d+)"\s+width="(\d+)"\s+height="(\d+)"[^>]*>(.*?)<\/text>/gs)];
  
  for (const m of textMatches) {
    const t = m[5].replace(/<[^>]+>/g, '').trim();
    if (t.includes('SNE0689166')) {
      console.log(`Found SNE0689166 on page ${pNum}:`, t);
    }
  }
}
