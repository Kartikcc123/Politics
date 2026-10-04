const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

const dir = 'D:\\Randeep Trivedi Voter list\\SONU BHAISAB ALL DETAIL BOOTH WISE';
const files = fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith('.xls') || f.toLowerCase().endsWith('.xlsx'));

console.log(`Checking column formats across 10 sample files...`);

for (const file of files.slice(0, 10)) {
  const filePath = path.join(dir, file);
  try {
    const wb = xlsx.readFile(filePath);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    const header = rows[0] || [];
    console.log(`\nFile: ${file} (${rows.length} rows)`);
    console.log('Header:', header);
    if (rows[1]) {
      console.log('Row 1 sample:', rows[1]);
    }
  } catch (e) {
    console.log(`Error reading ${file}:`, e.message);
  }
}
