const { execSync } = require('child_process');
const fs = require('fs');

const xml = execSync(`pdftohtml -xml -stdout "C:\\Users\\Ashish Sharma\\Downloads\\panotiya\\PANOTIYA-Ward No-004.pdf"`, { maxBuffer: 25 * 1024 * 1024 }).toString('utf8');

const pageMatches = xml.split(/<page\s+/).slice(1);
console.log('Total pages in Panotiya Ward 4:', pageMatches.length);

const p3 = pageMatches[2]; // Page 3
const textMatches = [...p3.matchAll(/<text\s+top="(\d+)"\s+left="(\d+)"\s+width="(\d+)"\s+height="(\d+)"[^>]*>(.*?)<\/text>/gs)];

const items = textMatches.map(m => ({
  top: parseInt(m[1], 10),
  left: parseInt(m[2], 10),
  text: m[5].replace(/<[^>]+>/g, '').trim()
})).filter(i => i.text.length > 0 && i.top > 120 && i.top < 1200);

// Sort by Row (top +- 15) then Left
items.sort((a, b) => {
  if (Math.abs(a.top - b.top) > 15) return a.top - b.top;
  return a.left - b.left;
});

console.log('--- Page 3 items (first 40 items in row reading order) ---');
items.slice(0, 40).forEach(i => console.log(`top: ${i.top.toString().padStart(4)}, left: ${i.left.toString().padStart(3)} | ${i.text}`));
