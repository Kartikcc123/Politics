require('dotenv').config();
const path = require('path');
const { ocrPdf } = require('../src/utils/pdfOcr');

async function runTest() {
  const pdfPath = path.resolve(__dirname, '../../sample-data/DOC-4pages.pdf');
  const fileName = 'DOC-4pages.pdf';

  console.log('========================================================================================');
  console.log('                   PDF OCR VERIFICATION TEST (DOC-4pages.pdf)');
  console.log('========================================================================================');
  console.log(`Loading PDF from: ${pdfPath}`);

  const startTime = Date.now();

  const ocrResult = await ocrPdf(pdfPath, fileName, {
    firstPage: 1,
    lastPage: 4,
    onProgress: (p) => {
      if (p.phase === 'ocr') {
        process.stdout.write(`\r[PROGRESS] Processed Page ${p.processedPages}/${p.totalPages} (${p.processedCards || 0} cards extracted)`);
      }
    },
  });

  const totalTimeSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n\n[COMPLETED] Total Processing Time: ${totalTimeSec} seconds (${(totalTimeSec / 60).toFixed(2)} minutes)`);
  console.log(`[STATUS] ${ocrResult.status}`);

  const records = ocrResult.voterRecords || [];
  console.log(`\nTotal Extracted Voter Records: ${records.length} / 60 expected cards`);

  console.log('\n' + '='.repeat(110));
  console.log(`${'#'.padEnd(4)} | ${'Serial'.padEnd(7)} | ${'EPIC Number'.padEnd(18)} | ${'Name'.padEnd(16)} | ${'Guardian'.padEnd(16)} | ${'House'.padEnd(6)} | ${'Age'.padEnd(4)} | ${'Gender'.padEnd(6)} | ${'Pg'.padEnd(2)}`);
  console.log('-'.repeat(110));

  let validEpics = 0;
  let validNames = 0;
  let validHouses = 0;
  let validAges = 0;
  let validGenders = 0;

  records.forEach((r, idx) => {
    const s = String(r.voterSerial || idx + 1);
    const epic = String(r.voterId || '-');
    const name = String(r.name || '-');
    const guardian = String(r.guardianName || '-');
    const house = String(r.houseNumber || '-');
    const age = String(r.age || '-');
    const gender = String(r.gender || '-');
    const page = String(r.page || '-');

    if (r.voterId && r.voterId.length >= 7) validEpics++;
    if (r.name && r.name.length >= 2) validNames++;
    if (r.houseNumber) validHouses++;
    if (r.age && r.age >= 18) validAges++;
    if (r.gender && (r.gender === 'male' || r.gender === 'female')) validGenders++;

    console.log(`${String(idx + 1).padEnd(4)} | ${s.padEnd(7)} | ${epic.padEnd(18)} | ${name.padEnd(16)} | ${guardian.padEnd(16)} | ${house.padEnd(6)} | ${age.padEnd(4)} | ${gender.padEnd(6)} | ${page.padEnd(2)}`);
  });

  console.log('='.repeat(110));
  console.log('                      ACCURACY & HEALTH SUMMARY');
  console.log('='.repeat(110));
  console.log(`Total Cards Extracted : ${records.length} / 60 (${((records.length / 60) * 100).toFixed(1)}%)`);
  console.log(`Valid Names           : ${validNames} / ${records.length} (${((validNames / (records.length || 1)) * 100).toFixed(1)}%)`);
  console.log(`Valid EPICs           : ${validEpics} / ${records.length} (${((validEpics / (records.length || 1)) * 100).toFixed(1)}%)`);
  console.log(`Valid House Numbers   : ${validHouses} / ${records.length} (${((validHouses / (records.length || 1)) * 100).toFixed(1)}%)`);
  console.log(`Valid Ages            : ${validAges} / ${records.length} (${((validAges / (records.length || 1)) * 100).toFixed(1)}%)`);
  console.log(`Valid Genders         : ${validGenders} / ${records.length} (${((validGenders / (records.length || 1)) * 100).toFixed(1)}%)`);
  console.log(`Average Time Per Page : ${(totalTimeSec / 4).toFixed(1)}s (includes 2 summary pages + 2 voter roll pages)`);
  console.log('='.repeat(110));
}

runTest().catch((err) => {
  console.error('Fatal Error during verification:', err);
  process.exit(1);
});
