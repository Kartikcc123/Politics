const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

const sampleFile = 'D:\\Randeep Trivedi Voter list\\SONU BHAISAB ALL DETAIL BOOTH WISE\\S20_179_2.xls';

if (fs.existsSync(sampleFile)) {
  const workbook = xlsx.readFile(sampleFile);
  const sheetNames = workbook.SheetNames;
  console.log('Sheet names:', sheetNames);

  const sheet = workbook.Sheets[sheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  console.log('Total rows:', rows.length);
  console.log('\n--- Header rows (first 5 rows) ---');
  rows.slice(0, 5).forEach((r, i) => console.log(`Row ${i}:`, r));

  console.log('\n--- Sample data rows (rows 5 to 15) ---');
  rows.slice(5, 15).forEach((r, i) => console.log(`Data ${i}:`, r));
} else {
  console.log('Sample file not found:', sampleFile);
}
