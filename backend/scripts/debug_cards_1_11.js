const path = require('path');
const fs = require('fs');
const { ocrPdf } = require('../src/utils/pdfOcr');

async function main() {
  const pdfPath = 'C:\\Users\\Ashish Sharma\\OneDrive\\Documents\\Downloads\\2026-EROLLGEN-S20-179-SIR-FinalRoll-Revision1-HIN-177.pdf';
  const reportPath = 'C:\\Users\\Ashish Sharma\\OneDrive\\Documents\\Downloads\\2026-EROLLGEN-S20-179-SIR-FinalRoll-Revision1-HIN-177_ocr_test_report.json';
  if (fs.existsSync(reportPath)) {
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    console.log('Cards 1 to 11 in Report:');
    report.members.slice(0, 11).forEach((m, idx) => {
      console.log(`Serial ${idx + 1}: Name=${m.name || ''}, Guardian=${m.guardianName || ''}, House=${m.houseNumber}, Age=${m.age}`);
    });
  }
}

main().catch(console.error);
