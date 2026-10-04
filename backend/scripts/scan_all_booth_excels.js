const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

const dir = 'D:\\Randeep Trivedi Voter list\\SONU BHAISAB ALL DETAIL BOOTH WISE';
const files = fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith('.xls') || f.toLowerCase().endsWith('.xlsx'));

console.log(`Processing ${files.length} Excel files...`);

let totalExcelRows = 0;
let totalValidEpics = 0;
let totalWithCaste = 0;
let totalWithMobile = 0;
let totalWithNameHindi = 0;

const sampleRecords = [];

for (const file of files) {
  const filePath = path.join(dir, file);
  try {
    const wb = xlsx.readFile(filePath);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    if (!rows || rows.length < 2) continue;

    const header = rows[0].map(h => String(h || '').trim());
    const epicIdx = header.findIndex(h => /EPIC/i.test(h));
    const nameHindiIdx = header.findIndex(h => /NameHindi/i.test(h));
    const parentHindiIdx = header.findIndex(h => /PartentNameHindi|ParentNameHindi|FatherHindi/i.test(h));
    const casteIdx = header.findIndex(h => /Caste/i.test(h));
    const mobileIdx = header.findIndex(h => /Mobile/i.test(h));
    const villageIdx = header.findIndex(h => /Villege|Village/i.test(h));

    if (epicIdx === -1) {
      console.log(`File ${file} missing EPIC column.`);
      continue;
    }

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || row.length === 0) continue;
      totalExcelRows++;

      const rawEpic = String(row[epicIdx] || '').trim().toUpperCase();
      if (!rawEpic || rawEpic === '0' || rawEpic === 'UNDEFINED') continue;

      totalValidEpics++;

      const nameHindi = nameHindiIdx !== -1 ? String(row[nameHindiIdx] || '').trim() : '';
      const parentHindi = parentHindiIdx !== -1 ? String(row[parentHindiIdx] || '').trim() : '';
      const caste = casteIdx !== -1 ? String(row[casteIdx] || '').trim() : '';
      const mobile = mobileIdx !== -1 ? String(row[mobileIdx] || '').replace(/\D/g, '').trim() : '';
      const village = villageIdx !== -1 ? String(row[villageIdx] || '').trim() : '';

      if (nameHindi && nameHindi !== '0') totalWithNameHindi++;
      if (caste && caste !== '0') totalWithCaste++;
      if (mobile && mobile.length >= 10 && mobile !== '0000000000') totalWithMobile++;

      if (sampleRecords.length < 5 && caste && caste !== '0' && nameHindi && nameHindi !== '0') {
        sampleRecords.push({ epic: rawEpic, nameHindi, parentHindi, caste, mobile, village, file });
      }
    }
  } catch (e) {
    console.log(`Error reading ${file}:`, e.message);
  }
}

console.log('\n========================================================================');
console.log('                          EXCEL SCAN SUMMARY                            ');
console.log('========================================================================');
console.log(`Total Excel Files Processed:  ${files.length}`);
console.log(`Total Excel Rows:             ${totalExcelRows}`);
console.log(`Total Valid EPICs:            ${totalValidEpics}`);
console.log(`Total with Hindi Name:        ${totalWithNameHindi}`);
console.log(`Total with Caste (जाति):      ${totalWithCaste}`);
console.log(`Total with Valid Mobile:      ${totalWithMobile}`);
console.log('========================================================================\n');

console.log('Sample parsed records:');
console.log(JSON.stringify(sampleRecords, null, 2));
