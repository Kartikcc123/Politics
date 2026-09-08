require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { ocrPdf } = require('../src/utils/pdfOcr');

async function main() {
  console.log('================================================================');
  console.log('   PROCESSING 4 PAGES VOTER LIST & SAVING EXTRACTED DATA TO D:/data');
  console.log('================================================================\n');

  const targetDir = 'D:\\data';
  if (!fs.existsSync(targetDir)) {
    console.log(`Directory ${targetDir} does not exist. Creating directory...`);
    fs.mkdirSync(targetDir, { recursive: true });
    console.log(`✅ Created directory: ${targetDir}`);
  } else {
    console.log(`✅ Found target directory: ${targetDir}`);
  }

  const pdfPath = path.resolve(__dirname, '../../sample-data/DOC-4pages.pdf');
  console.log(`Target PDF File: ${pdfPath}`);

  if (!fs.existsSync(pdfPath)) {
    throw new Error(`PDF file not found at ${pdfPath}`);
  }

  console.log('\nRunning 4-page OCR extraction...');
  const startTime = Date.now();

  const ocrResult = await ocrPdf(pdfPath, 'DOC-4pages.pdf', {
    firstPage: 1,
    lastPage: 4,
    onProgress: (p) => {
      if (p.phase === 'ocr') {
        process.stdout.write(`\rProgress: Page ${p.processedPages || 0}/${p.totalPages || 4} | Cards: ${p.processedCards || 0}/${p.totalCards || 120}`);
      }
    }
  });

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n\n✅ OCR Extraction Completed in ${durationSec} seconds!`);

  const voterRecords = ocrResult.voterRecords || [];
  const header = ocrResult.header || {};

  console.log(`Total Extracted Voter Records: ${voterRecords.length}`);
  console.log('Header Information:', JSON.stringify(header, null, 2));

  // Prepare Output Data
  const jsonPath = path.join(targetDir, 'voters_4pages_extracted.json');
  const csvPath = path.join(targetDir, 'voters_4pages_extracted.csv');
  const txtPath = path.join(targetDir, 'voters_4pages_summary.txt');

  const exportData = {
    processedAt: new Date().toISOString(),
    pdfName: 'DOC-4pages.pdf',
    pagesProcessed: 4,
    totalRecords: voterRecords.length,
    header,
    voters: voterRecords
  };

  // 1. Write JSON
  fs.writeFileSync(jsonPath, JSON.stringify(exportData, null, 2), 'utf-8');
  console.log(`\n✅ Saved JSON file: ${jsonPath} (${(fs.statSync(jsonPath).size / 1024).toFixed(2)} KB)`);

  // 2. Write CSV
  const csvHeaders = ['Serial', 'VoterID_EPIC', 'Name', 'GuardianName', 'Gender', 'Age', 'HouseNumber', 'SectionName', 'SectionNumber'];
  const csvRows = voterRecords.map(v => [
    `"${v.voterSerial || ''}"`,
    `"${v.voterId || ''}"`,
    `"${v.name || ''}"`,
    `"${v.guardianName || ''}"`,
    `"${v.gender || ''}"`,
    `"${v.age || ''}"`,
    `"${v.houseNumber || ''}"`,
    `"${v.sectionName || ''}"`,
    `"${v.sectionNumber || ''}"`
  ].join(','));

  const csvContent = [csvHeaders.join(','), ...csvRows].join('\n');
  fs.writeFileSync(csvPath, csvContent, 'utf-8');
  console.log(`✅ Saved CSV file: ${csvPath} (${(fs.statSync(csvPath).size / 1024).toFixed(2)} KB)`);

  // 3. Write Readable Summary TXT
  let txtContent = `========================================================================\n`;
  txtContent += `ELECTORAL ROLL DATA EXTRACTION REPORT (4 PAGES)\n`;
  txtContent += `Extracted Date: ${new Date().toLocaleString()}\n`;
  txtContent += `Total Voters Extracted: ${voterRecords.length}\n`;
  txtContent += `Assembly: ${header.assemblyNumber || ''} - ${header.assemblyName || ''}\n`;
  txtContent += `Part: ${header.partNumber || ''}\n`;
  txtContent += `========================================================================\n\n`;

  txtContent += `S.No | EPIC / Voter ID | Voter Name | Guardian Name | House | Age | Gender | Section\n`;
  txtContent += `--------------------------------------------------------------------------------------------------------\n`;

  voterRecords.forEach((v, idx) => {
    const sNo = String(v.voterSerial || (idx + 1)).padEnd(5);
    const epic = String(v.voterId || 'N/A').padEnd(16);
    const name = String(v.name || 'N/A').padEnd(20);
    const guardian = String(v.guardianName || 'N/A').padEnd(20);
    const house = String(v.houseNumber || '-').padEnd(8);
    const age = String(v.age || '-').padEnd(5);
    const gender = String(v.gender || '-').padEnd(8);
    const sec = String(v.sectionName || '-');

    txtContent += `${sNo} | ${epic} | ${name} | ${guardian} | ${house} | ${age} | ${gender} | ${sec}\n`;
  });

  fs.writeFileSync(txtPath, txtContent, 'utf-8');
  console.log(`✅ Saved Summary TXT file: ${txtPath} (${(fs.statSync(txtPath).size / 1024).toFixed(2)} KB)`);

  console.log('\n================================================================');
  console.log('   SAMPLE EXTRACTED RECORDS (FIRST 10 VOTERS):');
  console.log('================================================================');
  voterRecords.slice(0, 10).forEach(v => {
    console.log(`#${v.voterSerial} | ${v.voterId} | ${v.name} | S/D/W: ${v.guardianName} | House: ${v.houseNumber} | Age: ${v.age} | ${v.gender}`);
  });
  console.log('================================================================\n');
}

main().catch(err => {
  console.error('\n❌ Error running 4-page extraction:', err);
  process.exit(1);
});
