const mongoose = require('mongoose');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');
const Member = require('../src/models/Member');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://187.127.173.42:27017/political_crm';
const EXCEL_DIR = 'D:\\Randeep Trivedi Voter list\\SONU BHAISAB ALL DETAIL BOOTH WISE';

async function syncExcelToDb() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');
  console.log('========================================================================');
  console.log('   SYNCING ACCURATE HINDI NAMES, CASTE & MOBILE FROM BOOTH EXCELS      ');
  console.log('========================================================================\n');

  const files = fs.readdirSync(EXCEL_DIR).filter(f => f.toLowerCase().endsWith('.xls') || f.toLowerCase().endsWith('.xlsx'));
  console.log(`Discovered ${files.length} Excel files in booth directory.`);

  let totalExcelVoters = 0;
  let totalMatchedAndUpdated = 0;
  let totalNamesUpdated = 0;
  let totalCastesUpdated = 0;
  let totalMobilesUpdated = 0;

  let bulkOps = [];
  const BATCH_SIZE = 2000;

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
          totalNamesUpdated++;
        }
        if (parentHindi && parentHindi !== '0' && parentHindi.length >= 2) {
          updateFields.guardianName = parentHindi;
          updateFields.relativeName = parentHindi;
        }
        if (caste && caste !== '0' && caste !== 'undefined' && caste !== 'null') {
          updateFields.caste = caste;
          totalCastesUpdated++;
        }
        if (mobile && mobile.length === 10 && !mobile.startsWith('0000')) {
          updateFields.mobile = mobile;
          totalMobilesUpdated++;
        }

        if (Object.keys(updateFields).length > 0) {
          bulkOps.push({
            updateOne: {
              filter: { voterId: rawEpic },
              update: { $set: updateFields }
            }
          });
        }

        if (bulkOps.length >= BATCH_SIZE) {
          const res = await Member.bulkWrite(bulkOps, { ordered: false });
          totalMatchedAndUpdated += res.modifiedCount;
          bulkOps = [];
        }
      }

      if ((fIdx + 1) % 25 === 0 || fIdx === files.length - 1) {
        console.log(`Processed ${fIdx + 1}/${files.length} Excel files (${totalExcelVoters} voters processed, ${totalMatchedAndUpdated} matched in DB)...`);
      }
    } catch (e) {
      console.log(`Error in file ${file}:`, e.message);
    }
  }

  if (bulkOps.length > 0) {
    const res = await Member.bulkWrite(bulkOps, { ordered: false });
    totalMatchedAndUpdated += res.modifiedCount;
  }

  console.log('\n========================================================================');
  console.log('                          FINAL SYNC SUMMARY                            ');
  console.log('========================================================================');
  console.log(`Total Excel Files Synced:       ${files.length}`);
  console.log(`Total Excel Voter Rows:         ${totalExcelVoters}`);
  console.log(`Total DB Members Updated:       ${totalMatchedAndUpdated}`);
  console.log('========================================================================\n');

  // Verify Sample of updated Assembly members
  const sample = await Member.find({ hasAssemblyMembership: true, caste: { $exists: true, $ne: '' } }).limit(10).select('name guardianName caste mobile gramPanchayat wardNumber voterId');
  console.log('Sample Updated Members from Database:');
  sample.forEach((m, idx) => {
    console.log(`${idx + 1}. [${m.gramPanchayat || 'Assembly'} W${m.wardNumber || '-'}] Name: "${m.name}", Guardian: "${m.guardianName}", Caste: "${m.caste}", Mobile: "${m.mobile || '-'}", EPIC: "${m.voterId}"`);
  });

  await mongoose.disconnect();
}

syncExcelToDb().catch(err => {
  console.error('Fatal Excel Sync Error:', err);
  process.exit(1);
});
