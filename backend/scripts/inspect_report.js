const fs = require('fs');
const path = require('path');

const reportFile = `C:\\Users\\Ashish Sharma\\OneDrive\\Documents\\Downloads\\2026-EROLLGEN-S20-179-SIR-FinalRoll-Revision1-HIN-177_ocr_test_report.json`;
if (fs.existsSync(reportFile)) {
  const content = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
  console.log("Total members:", content.members.length);
  content.members.forEach(m => {
    console.log(`Serial ${m.serial} | Name: ${m.name} | EPIC: ${m.voterId} | House: "${m.houseNumber}"`);
  });
} else {
  console.log("Report file not found!");
}
