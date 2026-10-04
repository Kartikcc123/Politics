const fs = require('fs');
const path = require('path');

const dir = 'D:\\Randeep Trivedi Voter list\\SONU BHAISAB ALL DETAIL BOOTH WISE';
const files = fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith('.xls') || f.toLowerCase().endsWith('.xlsx'));

console.log(`Total Excel files found: ${files.length}`);
console.log('First 10 files:', files.slice(0, 10));
console.log('Last 10 files:', files.slice(-10));
