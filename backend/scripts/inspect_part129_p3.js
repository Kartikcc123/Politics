const { ocrPdf } = require('../src/utils/pdfOcr');
async function test() {
  const pdfPath = 'D:/Randeep Trivedi Voter list/Final Publication 21.02.2026/2026-EROLLGEN-S20-179-SIR-FinalRoll-Revision1-HIN-129.pdf';
  const res = await ocrPdf(pdfPath, 'part129.pdf', { firstPage: 3, lastPage: 3 });
  console.log('Total voters extracted on page 3:', res.voterRecords.length);
  for (let i = 0; i < Math.min(25, res.voterRecords.length); i++) {
    const r = res.voterRecords[i];
    console.log('Slot ' + (i + 1) + ': Serial=' + r.voterSerial + ', Name=' + r.name + ', EPIC=' + r.voterId + ', Guardian=' + r.guardianName);
  }
}
test().catch(console.error);
