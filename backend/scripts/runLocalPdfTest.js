const path = require('path');
const fs = require('fs');
const { ocrPdf } = require('../src/utils/pdfOcr');
const { safeSectionMap } = require('../src/controllers/importController');

async function main() {
  const pdfPath = process.argv[2];
  if (!pdfPath || !fs.existsSync(pdfPath)) {
    console.error('Usage: node backend/scripts/runLocalPdfTest.js <path-to-pdf>');
    process.exit(1);
  }

  console.log(`========================================================================`);
  console.log(`       STARTING LOCAL BACKEND OCR TEST ON: ${path.basename(pdfPath)}   `);
  console.log(`========================================================================`);
  console.log('Processing page-by-page using low-memory pipeline...\n');

  const startTime = Date.now();
  let lastLoggedPage = -1;
  const firstPage = process.argv[3] ? parseInt(process.argv[3], 10) : 1;
  const lastPage = process.argv[4] ? parseInt(process.argv[4], 10) : undefined;

  const result = await ocrPdf(pdfPath, path.basename(pdfPath), {
    firstPage,
    lastPage,
    onProgress: (progress) => {
      if (progress.phase === 'ocr' && progress.processedPages !== lastLoggedPage) {
        lastLoggedPage = progress.processedPages;
        console.log(`[PROGRESS] Page ${progress.processedPages}/${progress.totalPages} processed (${progress.processedCards || 0} cards parsed)`);
      }
    }
  });

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
  const records = result.voterRecords || [];
  const docSectionMap = safeSectionMap(result.header?.sectionMap || {});

  console.log(`\n========================================================================`);
  console.log(`          LOCAL BACKEND OCR TEST COMPLETED IN ${durationSec}s           `);
  console.log(`========================================================================`);
  console.log(`Assembly Name: ${result.header?.assemblyName || 'N/A'}`);
  console.log(`Part Number: ${result.header?.partNumber || 'N/A'}`);
  console.log(`Master Section Map:`, JSON.stringify(docSectionMap, null, 2));
  console.log(`Total Voters Extracted: ${records.length}`);
  
  // Section breakdown
  const sectionCounts = {};
  for (const m of records) {
    const secKey = `${m.sectionNumber || '-'}: ${m.sectionName || 'N/A'}`;
    sectionCounts[secKey] = (sectionCounts[secKey] || 0) + 1;
  }
  console.log(`\n--- Section Breakdown ---`);
  for (const [sec, count] of Object.entries(sectionCounts)) {
    console.log(`  - Section [${sec}] => ${count} voters`);
  }

  console.log(`\n--- Sample Voters (First 5, Middle 5, Last 5) ---`);
  const samples = [
    ...records.slice(0, 5),
    ...records.slice(Math.max(0, Math.floor(records.length / 2) - 2), Math.min(records.length, Math.floor(records.length / 2) + 3)),
    ...records.slice(-5)
  ];

  console.log(
    'S.No'.padEnd(8) +
    'EPIC / Voter ID'.padEnd(18) +
    'Name (नाम)'.padEnd(22) +
    'Guardian (पिता/पति)'.padEnd(22) +
    'House'.padEnd(8) +
    'Age'.padEnd(6) +
    'Section'.padEnd(25)
  );
  console.log('-'.repeat(109));

  for (const m of samples) {
    console.log(
      String(m.voterSerial || '-').padEnd(8) +
      String(m.voterId || 'N/A').padEnd(18) +
      String(m.name || '').padEnd(22).slice(0, 21) +
      String(m.guardianName || '').padEnd(22).slice(0, 21) +
      String(m.houseNumber || '-').padEnd(8) +
      String(m.age || '-').padEnd(6) +
      String(m.sectionName || '-').padEnd(25).slice(0, 24)
    );
  }

  // Save JSON report
  const reportPath = path.join(path.dirname(pdfPath), `${path.basename(pdfPath, path.extname(pdfPath))}_ocr_test_report.json`);
  fs.writeFileSync(reportPath, JSON.stringify({
    header: result.header,
    totalVoters: records.length,
    sectionBreakdown: sectionCounts,
    members: records.map(m => ({
      serial: m.voterSerial,
      voterId: m.voterId,
      name: m.name,
      guardianName: m.guardianName,
      houseNumber: m.houseNumber,
      age: m.age,
      gender: m.gender,
      sectionNumber: m.sectionNumber,
      sectionName: m.sectionName,
    }))
  }, null, 2));

  console.log(`\nFull OCR Test JSON report saved to: ${reportPath}`);
}

main().catch(err => {
  console.error('Error running PDF test:', err);
  process.exit(1);
});
