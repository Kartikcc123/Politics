const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

const EXCEL_DIR = 'D:\\Randeep Trivedi Voter list\\SONU BHAISAB ALL DETAIL BOOTH WISE';
const files = fs.readdirSync(EXCEL_DIR).filter(f => f.toLowerCase().endsWith('.xls') || f.toLowerCase().endsWith('.xlsx'));

console.log('Sample file:', files[0]);
const wb = xlsx.readFile(path.join(EXCEL_DIR, files[0]));
const sheet = wb.Sheets[wb.SheetNames[0]];
const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

console.log('Header columns:', rows[0]);
console.log('First 5 rows:');
for (let i = 1; i <= Math.min(5, rows.length - 1); i++) {
  console.log(`Row ${i}:`, rows[i]);
}
