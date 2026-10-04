const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const folders = [
  "C:\\Users\\Ashish Sharma\\Downloads\\THALA",
  "C:\\Users\\Ashish Sharma\\Downloads\\Mobile Devices",
  "C:\\Users\\Ashish Sharma\\Downloads\\KHEMANA-",
  "C:\\Users\\Ashish Sharma\\Downloads\\Nathdiyas",
  "C:\\Users\\Ashish Sharma\\Downloads\\panotiya",
  "C:\\Users\\Ashish Sharma\\Downloads\\palra",
  "C:\\Users\\Ashish Sharma\\Downloads\\Raipur",
  "C:\\Users\\Ashish Sharma\\Downloads\\sagrev",
  "C:\\Users\\Ashish Sharma\\Downloads\\suras",
  "C:\\Users\\Ashish Sharma\\Downloads\\mokhunda",
  "C:\\Users\\Ashish Sharma\\Downloads\\Masinghpur",
  "C:\\Users\\Ashish Sharma\\Downloads\\Nahri",
  "C:\\Users\\Ashish Sharma\\Downloads\\5",
  "C:\\Users\\Ashish Sharma\\Downloads\\boriyapur",
  "C:\\Users\\Ashish Sharma\\Downloads\\w",
  "C:\\Users\\Ashish Sharma\\Downloads\\Borana",
  "C:\\Users\\Ashish Sharma\\Downloads\\o",
  "C:\\Users\\Ashish Sharma\\Downloads\\c",
  "C:\\Users\\Ashish Sharma\\Downloads\\narayankhera",
  "C:\\Users\\Ashish Sharma\\Downloads\\nandasa",
  "C:\\Users\\Ashish Sharma\\Downloads\\WithoutPhoto"
];

const wordFrequency = new Map();

for (const dir of folders) {
  if (!fs.existsSync(dir)) continue;
  const files = fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith('.pdf'));
  for (const f of files.slice(0, 2)) { // take 2 PDFs per folder for deep word analysis
    const pdfPath = path.join(dir, f);
    try {
      const txt = execSync(`pdftotext -layout -enc UTF-8 "${pdfPath}" -`, { maxBuffer: 10 * 1024 * 1024 }).toString('utf8');
      const lines = txt.split('\n');
      for (const line of lines) {
        if (line.includes('नरम:') || line.includes('नपतर कर नरम:') || line.includes('पनत कर नरम:') || line.includes('मरतर कर नरम:')) {
          const words = line.split(/[:\s]+/).filter(w => w.length > 1 && !['नरम', 'नपतर', 'पनत', 'मरतर', 'कर', 'सपखजर', 'मकरन', 'आजच', 'ललग', 'पचरष', 'सल', 'Photo', 'is', 'Available'].includes(w));
          for (const w of words) {
            wordFrequency.set(w, (wordFrequency.get(w) || 0) + 1);
          }
        }
      }
    } catch (e) {}
  }
}

// Sort by frequency
const sortedWords = Array.from(wordFrequency.entries()).sort((a, b) => b[1] - a[1]);
console.log(`Extracted ${sortedWords.length} distinct raw words from SEC PDFs.`);
console.log('Top 150 raw words:');
console.log(sortedWords.slice(0, 150).map(([w, c]) => `${w} (${c})`).join(', '));

fs.writeFileSync('scripts/top_sec_words.json', JSON.stringify(sortedWords, null, 2));
