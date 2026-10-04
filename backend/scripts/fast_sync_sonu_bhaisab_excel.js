const mongoose = require('mongoose');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://187.127.173.42:27017/political_crm';
const EXCEL_DIR = 'D:\\Randeep Trivedi Voter list\\SONU BHAISAB ALL DETAIL BOOTH WISE';

async function fastNativeSync() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');
  console.log('========================================================================');
  console.log('   ULTRA-FAST NATIVE SYNC: HINDI NAMES, CASTE & MOBILE FROM BOOTH EXCELS');
  console.log('========================================================================\n');

  const files = fs.readdirSync(EXCEL_DIR).filter(f => f.toLowerCase().endsWith('.xls') || f.toLowerCase().endsWith('.xlsx'));
  console.log(`Discovered ${files.length} Excel files.`);

  const collection = mongoose.connection.db.collection('members');

  let allOps = [];
  let totalExcelVoters = 0;

  console.log('Reading and parsing all Excel spreadsheets...');
  for (let fIdx = 0; fIdx < files.length; fIdx++) {
    const file = files[fIdx];
    const filePath = path.join(EXCEL_DIR, file);

    try {
      const wb = xlsx.readFile(filePath);
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
      if (!rows || rows.length < 2) continue;

      const header = rows[0].map(h => String(h || '').trim());
      const epicIdx = header.findIndex(h => /EPIC/i.test(h));
      const nameHindiIdx = header.findIndex(h => /NameHindi/i.test(h));
      const parentHindiIdx = header.findIndex(h => /PartentNameHindi|ParentNameHindi|FatherHindi/i.test(h));
      const casteIdx = header.findIndex(h => /Caste/i.test(h));
      const mobileIdx = header.findIndex(h => /Mobile/i.test(h));

      if (epicIdx === -1) continue;

      for (let r = 1; r < rows.length; r++) {
        const row = rows[r];
        if (!row || row.length === 0) continue;

        const rawEpic = String(row[epicIdx] || '').trim().toUpperCase();
        if (!rawEpic || rawEpic === '0' || rawEpic === 'UNDEFINED') continue;

        totalExcelVoters++;

        const nameHindi = nameHindiIdx !== -1 ? String(row[nameHindiIdx] || '').trim() : '';
        const parentHindi = parentHindiIdx !== -1 ? String(row[parentHindiIdx] || '').trim() : '';
        let caste = casteIdx !== -1 ? String(row[casteIdx] || '').trim() : '';
        let mobile = mobileIdx !== -1 ? String(row[mobileIdx] || '').replace(/\D/g, '').trim() : '';

        const updateFields = {};

        if (nameHindi && nameHindi !== '0' && nameHindi.length >= 2) {
          updateFields.name = nameHindi;
        }
        if (parentHindi && parentHindi !== '0' && parentHindi.length >= 2) {
          updateFields.guardianName = parentHindi;
          updateFields.relativeName = parentHindi;
        }
        if (caste && caste !== '0' && caste !== 'undefined' && caste !== 'null') {
          updateFields.caste = caste;
        }
        if (mobile && mobile.length === 10 && !mobile.startsWith('0000')) {
          updateFields.mobile = mobile;
        }

        if (Object.keys(updateFields).length > 0) {
          allOps.push({
            updateOne: {
              filter: { voterId: rawEpic },
              update: { $set: updateFields }
            }
          });
        }
      }
    } catch (e) {
      console.log(`Error reading ${file}:`, e.message);
    }
  }

  console.log(`Parsed ${totalExcelVoters} Excel voters. Prepared ${allOps.length} update operations.`);

  const CHUNK_SIZE = 2500;
  const chunks = [];
  for (let i = 0; i < allOps.length; i += CHUNK_SIZE) {
    chunks.push(allOps.slice(i, i + CHUNK_SIZE));
  }

  console.log(`Executing ${chunks.length} bulk chunks in parallel...`);

  let completedChunks = 0;
  let totalModified = 0;

  const CONCURRENCY = 4;
  async function worker(chunkList) {
    for (const chunk of chunkList) {
      try {
        const res = await collection.bulkWrite(chunk, { ordered: false });
        totalModified += (res.modifiedCount || 0) + (res.matchedCount || 0);
      } catch (err) {
        // partial errors ignored
      }
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
  console.log('                          FINAL SYNC SUMMARY                            ');
  console.log('========================================================================');
  console.log(`Total Excel Files Processed:    ${files.length}`);
  console.log(`Total Excel Voters Processed:   ${totalExcelVoters}`);
  console.log(`Total DB Members Synced:        ${totalModified}`);
  console.log('========================================================================\n');

  // Verify Sample of updated Assembly members
  const Member = mongoose.model('Member', new mongoose.Schema({}, { strict: false }));
  const sample = await Member.find({ caste: { $exists: true, $ne: '' } }).limit(10).select('name guardianName caste mobile gramPanchayat wardNumber voterId');
  console.log('Sample Updated Members from Database:');
  sample.forEach((m, idx) => {
    console.log(`${idx + 1}. [${m.get('gramPanchayat') || 'Assembly'} W${m.get('wardNumber') || '-'}] Name: "${m.get('name')}", Guardian: "${m.get('guardianName')}", Caste: "${m.get('caste')}", Mobile: "${m.get('mobile') || '-'}", EPIC: "${m.get('voterId')}"`);
  });

  await mongoose.disconnect();
}

fastNativeSync().catch(err => {
  console.error('Fatal Native Sync Error:', err);
  process.exit(1);
});
