const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

const EXCEL_DIR = 'D:\\Randeep Trivedi Voter list\\SONU BHAISAB ALL DETAIL BOOTH WISE';
const files = fs.readdirSync(EXCEL_DIR).filter(f => f.toLowerCase().endsWith('.xls') || f.toLowerCase().endsWith('.xlsx'));

console.log('Searching for SNE0802660 and SNE0102244 across all Excel files...');

for (const file of files) {
  const filePath = path.join(EXCEL_DIR, file);
  try {
    const wb = xlsx.readFile(filePath);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    if (!rows || rows.length < 2) continue;
    const header = rows[0].map(h => String(h || '').trim());
    const epicIdx = header.findIndex(h => /EPIC/i.test(h));
    if (epicIdx === -1) continue;

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      const epic = String(row[epicIdx] || '').trim().toUpperCase();
      if (epic === 'SNE0802660' || epic === 'SNE0102244') {
        console.log(`\nFound ${epic} in ${file} at row ${r}:`);
        console.log('Header:', header);
        console.log('Row:', row);
      }
    }
  } catch (e) {}
}
