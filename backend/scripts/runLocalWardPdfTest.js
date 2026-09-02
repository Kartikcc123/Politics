const path = require('path');
const fs = require('fs');
const { ocrWardPdf } = require('../src/utils/wardPdfOcr');

async function main() {
  const pdfPath = process.argv[2] || path.resolve(__dirname, '../../sample-data/DOC-20260424-WA0137..pdf');
  if (!fs.existsSync(pdfPath)) {
    console.error(`PDF path not found: ${pdfPath}`);
    process.exit(1);
  }

  console.log(`========================================================================`);
  console.log(`  STARTING LOCAL BACKEND WARD PDF OCR TEST ON: ${path.basename(pdfPath)} `);
  console.log(`========================================================================\n`);

  const startTime = Date.now();

  const result = await ocrWardPdf(pdfPath, path.basename(pdfPath), {
    onProgress: (p) => {
      console.log(`[PROGRESS] Phase: ${p.phase || 'OCR'} | Page ${p.processedPages || 0}/${p.totalPages || 0}`);
    }
  });

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
  const records = result.records || [];

  console.log(`\n========================================================================`);
  console.log(`      LOCAL BACKEND WARD OCR COMPLETED IN ${durationSec}s              `);
  console.log(`========================================================================`);
  console.log(`Municipality: ${result.header?.municipality || 'N/A'}`);
  console.log(`Ward Number: ${result.header?.wardNumber || 'N/A'}`);
  console.log(`Assembly: ${result.header?.assemblyNumber || ''} - ${result.header?.assemblyName || ''}`);
  console.log(`Total Ward Voters Extracted: ${records.length}\n`);

  console.log(
    'S.No'.padEnd(8) +
    'EPIC / Voter ID'.padEnd(18) +
    'Name (नाम)'.padEnd(22) +
    'Guardian (पिता/पति)'.padEnd(22) +
    'House'.padEnd(8) +
    'Age'.padEnd(6) +
    'Status/Deleted'.padEnd(15)
  );
  console.log('-'.repeat(99));

  records.slice(0, 30).forEach((m) => {
    console.log(
      String(m.voterSerial || '-').padEnd(8) +
      String(m.voterId || 'N/A').padEnd(18) +
      String(m.name || '').padEnd(22).slice(0, 21) +
      String(m.guardianName || '').padEnd(22).slice(0, 21) +
      String(m.houseNumber || '-').padEnd(8) +
      String(m.age || '-').padEnd(6) +
      String(m.isDeleted ? 'DELETED/विलोपित' : 'Active/Valid').padEnd(15)
    );
  });

  console.log('-'.repeat(99));
}

main().catch(err => {
  console.error('Error running Ward OCR test:', err);
  process.exit(1);
});
