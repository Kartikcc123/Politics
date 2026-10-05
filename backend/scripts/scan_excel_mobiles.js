const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

async function scanExcelMobileNumbers() {
  const dir = 'D:\\Randeep Trivedi Voter list\\SONU BHAISAB ALL DETAIL BOOTH WISE';
  if (!fs.existsSync(dir)) {
    console.log('Directory not found:', dir);
    return;
  }

  const files = fs.readdirSync(dir).filter(f => f.endsWith('.xlsx') || f.endsWith('.xls'));
  console.log(`Found ${files.length} Excel files.`);

  let totalRows = 0;
  let totalMobiles = 0;
  let totalValidMobiles = 0;
  let filesWithMobile = 0;

  for (const file of files) {
    try {
      const filePath = path.join(dir, file);
      const workbook = xlsx.readFile(filePath);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = xlsx.utils.sheet_to_json(sheet);
      
      let fileMobileCount = 0;
      for (const row of rows) {
        totalRows++;
        // Check all fields for mobile pattern
        for (const [key, val] of Object.entries(row)) {
          const str = String(val || '').replace(/\D/g, '');
          if (str.length === 10 && /^[6-9]/.test(str)) {
            totalValidMobiles++;
            fileMobileCount++;
            break;
          } else if (str.length >= 10 && (key.toLowerCase().includes('mobile') || key.toLowerCase().includes('phone') || key.toLowerCase().includes('फोन') || key.toLowerCase().includes('मो.'))) {
            totalMobiles++;
            fileMobileCount++;
            break;
          }
        }
      }
      if (fileMobileCount > 0) filesWithMobile++;
    } catch (e) {
      console.error('Error reading', file, e.message);
    }
  }

  console.log({
    totalFiles: files.length,
    filesWithMobile,
    totalRows,
    totalValid10DigitMobilesInExcel: totalValidMobiles,
    totalMobiles
  });
}
scanExcelMobileNumbers();
