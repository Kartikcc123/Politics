const fs = require('fs');
const path = require('path');
const { ocrPdf } = require('../src/utils/pdfOcr');

async function main() {
  const pdfPath = path.resolve(__dirname, '../uploads/1788448027824-01-bheeta--1-.pdf');
  console.log('========================================================================');
  console.log('   BHEETA PDF 5-PAGE OCR & JSON EXPORT                                  ');
  console.log('   Source File:', pdfPath);
  console.log('========================================================================\n');

  if (!fs.existsSync(pdfPath)) {
    console.error('ERROR: PDF file not found at:', pdfPath);
    process.exit(1);
  }

  const result = await ocrPdf(pdfPath, '1788448027824-01-bheeta--1-.pdf', {
    firstPage: 1,
    lastPage: 5,
    onProgress: (p) => {
      if (p.phase === 'ocr') {
        console.log(`OCR Progress: Page ${p.processedPages}/${p.totalPages} | Cards: ${p.processedCards || 0}/${p.totalCards || 0}`);
      }
    },
  });

  const voters = (result.voterRecords || []).map((r, i) => ({
    serialNumber: r.voterSerial || String(i + 1),
    epicNumber: r.voterId || '',
    name: r.name || '',
    guardianName: r.guardianName || '',
    relationType: r.relationType || '',
    houseNumber: r.houseNumber || '',
    age: r.age || null,
    gender: r.gender || '',
    sectionNumber: r.sectionNumber || '1',
    sectionName: r.sectionName || '',
    page: r.page,
    cell: r.cell,
    photo: r.photo || '',
  }));

  const payload = {
    documentInfo: {
      pdfName: '1788448027824-01-bheeta--1-.pdf',
      assemblyName: result.header?.assemblyName || '179 - सहाडा',
      partNumber: result.header?.partNumber || '1',
      village: result.header?.village || 'भीटा',
      totalPagesProcessed: 5,
      totalVotersExtracted: voters.length,
      extractedAt: new Date().toISOString(),
    },
    header: result.header || {},
    voters,
  };

  const jsonStr = JSON.stringify(payload, null, 2);

  const exportPaths = [
    'D:\\data\\bheeta_5pages_voters.json',
    'D:\\data\\bheeta_voters.json',
  ];

  for (const targetPath of exportPaths) {
    try {
      const dir = path.dirname(targetPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(targetPath, jsonStr, 'utf-8');
      console.log(`✅ Successfully saved JSON export to: ${targetPath}`);
    } catch (err) {
      console.warn(`⚠️ Warning: Could not write to ${targetPath}: ${err.message}`);
    }
  }

  console.log(`\n========================================================================`);
  console.log(` TOTAL VOTERS EXTRACTED (PAGES 1-5): ${voters.length}`);
  console.log(` FIRST VOTER: ${voters[0]?.serialNumber} | ${voters[0]?.name} | House: ${voters[0]?.houseNumber} | EPIC: ${voters[0]?.epicNumber}`);
  console.log(` LAST VOTER: ${voters[voters.length - 1]?.serialNumber} | ${voters[voters.length - 1]?.name} | House: ${voters[voters.length - 1]?.houseNumber} | EPIC: ${voters[voters.length - 1]?.epicNumber}`);
  console.log(`========================================================================\n`);
}

main().catch((err) => {
  console.error('Fatal error during Bheeta 5-Page OCR:', err);
  process.exit(1);
});
