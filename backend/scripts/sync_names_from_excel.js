const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const BASE_DIR = 'D:\\Randeep Trivedi Voter list\\SONU BHAISAB ALL DETAIL BOOTH WISE';
const URI = process.env.MONGO_URI || 'mongodb://187.127.173.42:27017/political_crm';

function cleanStr(val) {
  if (val === undefined || val === null) return '';
  return String(val).trim();
}

function cleanEpic(val) {
  if (!val) return '';
  return String(val).trim().toUpperCase().replace(/\s+/g, '');
}

function getAllXlsFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(getAllXlsFiles(fullPath));
    } else if (file.endsWith('.xls') || file.endsWith('.xlsx')) {
      results.push(fullPath);
    }
  }
  return results;
}

function parseSheet(sheet, fileName) {
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  if (!rows || rows.length < 2) return [];

  let headerRowIdx = -1;
  let epicIdx = -1, nameHindiIdx = -1, parentHindiIdx = -1, casteIdx = -1;

  for (let r = 0; r < Math.min(10, rows.length); r++) {
    const row = rows[r];
    if (!Array.isArray(row)) continue;

    epicIdx = -1;
    nameHindiIdx = -1;
    parentHindiIdx = -1;
    casteIdx = -1;

    for (let c = 0; c < row.length; c++) {
      const cell = cleanStr(row[c]).toLowerCase().replace(/[\s._]+/g, '');
      const isParent = cell.includes('parent') || cell.includes('partent') || cell.includes('father') || cell.includes('husband') || cell.includes('relative') || cell.includes('guardian');

      if (cell.includes('epic') || cell === 'voterid') {
        epicIdx = c;
      }
      
      if (isParent && cell.includes('hindi')) {
        parentHindiIdx = c;
      } else if (!isParent && (cell === 'namehindi' || cell === 'hindiname' || cell === 'voternamehindi' || cell.includes('namehindi'))) {
        nameHindiIdx = c;
      }

      if (cell === 'caste' || cell === 'castehindi' || cell.includes('jati')) {
        casteIdx = c;
      }
    }

    if (epicIdx >= 0 && nameHindiIdx >= 0) {
      headerRowIdx = r;
      break;
    }
  }

  if (headerRowIdx === -1) {
    return [];
  }

  const results = [];
  for (let r = headerRowIdx + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!Array.isArray(row) || !row.length) continue;

    const epic = cleanEpic(epicIdx >= 0 ? row[epicIdx] : '');
    const nameHindi = cleanStr(nameHindiIdx >= 0 ? row[nameHindiIdx] : '');
    const parentHindi = cleanStr(parentHindiIdx >= 0 ? row[parentHindiIdx] : '');
    const caste = cleanStr(casteIdx >= 0 ? row[casteIdx] : '');

    if (epic && nameHindi && !nameHindi.toLowerCase().includes('name') && !nameHindi.toLowerCase().includes('hindi')) {
      results.push({ epic, nameHindi, parentHindi, caste, file: fileName });
    }
  }

  return results;
}

async function run() {
  console.log('Finding all Excel files in:', BASE_DIR);
  const files = getAllXlsFiles(BASE_DIR);
  console.log(`Found ${files.length} Excel files.`);

  const excelDataByEpic = new Map();
  let totalRows = 0;

  for (const file of files) {
    try {
      const wb = XLSX.readFile(file);
      for (const sName of wb.SheetNames) {
        const sheet = wb.Sheets[sName];
        const parsed = parseSheet(sheet, path.basename(file));
        parsed.forEach(item => {
          totalRows++;
          if (!excelDataByEpic.has(item.epic)) {
            excelDataByEpic.set(item.epic, item);
          }
        });
        if (parsed.length > 0) break;
      }
    } catch (e) {
      console.error(`Error parsing ${file}:`, e.message);
    }
  }

  console.log(`\nParsed ${totalRows} voter records across all Excel files.`);
  console.log(`Total Unique EPICs: ${excelDataByEpic.size}`);

  // Test inspection of sample EPICs
  const testSample = ['RJ/20/152/057268', 'SNE0894899', 'SNE0313379', 'SNE1536200'];
  for (const ep of testSample) {
    console.log(`EPIC ${ep} ->`, excelDataByEpic.get(ep));
  }

  console.log('Connecting to MongoDB at', URI);
  await mongoose.connect(URI);
  const col = mongoose.connection.db.collection('members');

  const allEpics = Array.from(excelDataByEpic.keys());
  let matchedCount = 0;
  let nameUpdatedCount = 0;
  let guardianUpdatedCount = 0;
  let casteUpdatedCount = 0;
  const sampleDiffs = [];

  const chunkSize = 2000;
  for (let i = 0; i < allEpics.length; i += chunkSize) {
    const chunk = allEpics.slice(i, i + chunkSize);
    const dbMembers = await col.find({
      $or: [
        { voterId: { $in: chunk } },
        { epicNumber: { $in: chunk } }
      ]
    }).project({ _id: 1, voterId: 1, epicNumber: 1, name: 1, guardianName: 1, caste: 1 }).toArray();

    const bulkOps = [];

    for (const doc of dbMembers) {
      const epic = cleanEpic(doc.voterId || doc.epicNumber);
      if (!excelDataByEpic.has(epic)) continue;

      matchedCount++;
      const excelInfo = excelDataByEpic.get(epic);
      const currentName = cleanStr(doc.name);
      const newName = cleanStr(excelInfo.nameHindi);
      const currentGuardian = cleanStr(doc.guardianName);
      const newGuardian = cleanStr(excelInfo.parentHindi);
      const currentCaste = cleanStr(doc.caste);
      const newCaste = cleanStr(excelInfo.caste);

      const updates = {};

      if (newName && newName !== currentName && !newName.toLowerCase().includes('name')) {
        updates.name = newName;
        nameUpdatedCount++;
        if (sampleDiffs.length < 30) {
          sampleDiffs.push({
            epic,
            oldName: currentName,
            newName: newName,
            guardian: newGuardian,
            caste: newCaste
          });
        }
      }

      if (newGuardian && newGuardian !== currentGuardian && !newGuardian.toLowerCase().includes('name')) {
        updates.guardianName = newGuardian;
        updates.relativeName = newGuardian;
        guardianUpdatedCount++;
      }

      if (newCaste && (!currentCaste || currentCaste === 'अन्य' || currentCaste === 'undecided' || currentCaste.trim() === '')) {
        updates.caste = newCaste;
        casteUpdatedCount++;
      }

      if (Object.keys(updates).length > 0) {
        bulkOps.push({
          updateOne: {
            filter: { _id: doc._id },
            update: { $set: updates }
          }
        });
      }
    }

    if (bulkOps.length > 0) {
      await col.bulkWrite(bulkOps);
    }
  }

  console.log('\n======================================================');
  console.log('            EXCEL TO MONGODB SYNC SUMMARY             ');
  console.log('======================================================');
  console.log(`Total Excel Unique EPICs:    ${excelDataByEpic.size}`);
  console.log(`Total DB Matches:            ${matchedCount}`);
  console.log(`Total Names Corrected:       ${nameUpdatedCount}`);
  console.log(`Total Guardians Corrected:   ${guardianUpdatedCount}`);
  console.log(`Total Castes Updated:        ${casteUpdatedCount}`);
  console.log('======================================================\n');

  console.log('Sample Name Corrections (First 25):');
  sampleDiffs.slice(0, 25).forEach((s, idx) => {
    console.log(`${idx + 1}. [${s.epic}] "${s.oldName}" -> "${s.newName}" | Father/Husband: "${s.guardian}" | Caste: "${s.caste}"`);
  });

  process.exit(0);
}

run().catch(err => {
  console.error('Execution Error:', err);
  process.exit(1);
});
