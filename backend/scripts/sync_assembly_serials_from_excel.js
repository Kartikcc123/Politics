const mongoose = require('mongoose');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://187.127.173.42:27017/political_crm';
const EXCEL_DIR = 'D:\\Randeep Trivedi Voter list\\SONU BHAISAB ALL DETAIL BOOTH WISE';

async function syncAssemblySerialsFromExcel() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');
  console.log('========================================================================');
  console.log('       SYNCING OFFICIAL ASSEMBLY SERIALS & PART NUMBERS FROM EXCELS     ');
  console.log('========================================================================\n');

  const files = fs.readdirSync(EXCEL_DIR).filter(f => f.toLowerCase().endsWith('.xls') || f.toLowerCase().endsWith('.xlsx'));
  console.log(`Discovered ${files.length} Excel files.`);

  const collection = mongoose.connection.db.collection('members');

  let allOps = [];
  let totalExcelVoters = 0;

  for (let fIdx = 0; fIdx < files.length; fIdx++) {
    const file = files[fIdx];
    const filePath = path.join(EXCEL_DIR, file);

    try {
      const wb = xlsx.readFile(filePath);
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
      if (!rows || rows.length < 2) continue;

      const header = rows[0].map(h => String(h || '').trim());
      const partIdx = header.findIndex(h => /PartNo/i.test(h));
      const snoIdx = header.findIndex(h => /^Sno$/i.test(h) || /^Serial/i.test(h));
      const epicIdx = header.findIndex(h => /EPIC/i.test(h));

      if (epicIdx === -1 || snoIdx === -1) continue;

      for (let r = 1; r < rows.length; r++) {
        const row = rows[r];
        if (!row || row.length === 0) continue;

        const rawEpic = String(row[epicIdx] || '').trim().toUpperCase();
        const sno = String(row[snoIdx] || '').trim();
        const partNo = partIdx !== -1 ? String(row[partIdx] || '').trim() : '';

        if (!rawEpic || rawEpic === '0' || rawEpic === 'UNDEFINED' || !sno || sno === '0') continue;

        totalExcelVoters++;

        const updateFields = {
          voterSerial: sno,
          hasAssemblyMembership: true
        };
        if (partNo && partNo !== '0') {
          updateFields.partNumber = partNo;
        }

        allOps.push({
          updateOne: {
            filter: { voterId: rawEpic },
            update: { $set: updateFields }
          }
        });
      }
    } catch (e) {
      console.log(`Error reading ${file}:`, e.message);
    }
  }

  console.log(`Parsed ${totalExcelVoters} Excel voters. Prepared ${allOps.length} bulk update ops.`);

  const CHUNK_SIZE = 5000;
  const chunks = [];
  for (let i = 0; i < allOps.length; i += CHUNK_SIZE) {
    chunks.push(allOps.slice(i, i + CHUNK_SIZE));
  }

  console.log(`Executing ${chunks.length} chunks in parallel...`);

  let completedChunks = 0;
  let totalModified = 0;
  const CONCURRENCY = 6;

  async function worker(chunkList) {
    for (const chunk of chunkList) {
      try {
        const res = await collection.bulkWrite(chunk, { ordered: false });
        totalModified += (res.modifiedCount || 0) + (res.matchedCount || 0);
      } catch (err) {}
      completedChunks++;
      if (completedChunks % 10 === 0 || completedChunks === chunks.length) {
        console.log(`Progress: ${completedChunks}/${chunks.length} chunks (${Math.round((completedChunks/chunks.length)*100)}%) -> Synced: ${totalModified}...`);
      }
    }
  }

  const workerChunks = Array.from({ length: CONCURRENCY }, () => []);
  chunks.forEach((c, idx) => {
    workerChunks[idx % CONCURRENCY].push(c);
  });

  await Promise.all(workerChunks.map(wList => worker(wList)));

  console.log('\n========================================================================');
  console.log(`Sync Completed! Total Synced Members: ${totalModified}`);
  console.log('========================================================================\n');

  // Verify Sample of Part 1 voters
  const sample = await collection.find({ partNumber: '1', hasAssemblyMembership: true })
    .sort({ voterSerial: 1 })
    .collation({ locale: 'en', numericOrdering: true, strength: 1 })
    .limit(10)
    .project({ voterSerial: 1, wardVoterSerial: 1, voterId: 1, name: 1, partNumber: 1, wardNumber: 1 })
    .toArray();

  console.log('Sample Part 1 Voters from Database after Official Assembly Serial Sync:');
  console.log(JSON.stringify(sample, null, 2));

  await mongoose.disconnect();
}

syncAssemblySerialsFromExcel().catch(console.error);
