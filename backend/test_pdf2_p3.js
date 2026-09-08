const { ocrPdf } = require('./src/utils/pdfOcr');

async function test() {
  const pdfPath = 'C:/Users/Ashish Sharma/OneDrive/Documents/Downloads/2026-EROLLGEN-S20-179-SIR-FinalRoll-Revision1-HIN-177.pdf';
  const result = await ocrPdf(pdfPath, 'test.pdf', { firstPage: 3, lastPage: 3 });
  console.log("\n=== ALL VOTERS EXTRACTED FOR PDF 2 PAGE 3 ===");
  for (const r of result.voterRecords || []) {
    console.log(`Serial ${String(r.voterSerial).padStart(2)}: Name=${(r.name || '').padEnd(12)} House=${(r.houseNumber || '').padEnd(6)} RawHouse=${(r.rawHouseNumber || '').padEnd(6)} EPIC=${r.voterId}`);
  }
}

test().catch(console.error);
