const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const mongoose = require('mongoose');

const BRAHMIN_SUBCASTES = new Set([
  'शर्मा',
  'पारीक',
  'दाधीच',
  'जोशी',
  'पालीवाल',
  'पाठक',
  'भट्ट',
  'व्यास',
  'तिवारी',
  'गौड़',
  'गौड़'
]);

function extractHouseNumber(address) {
  if (!address) return '';
  const match = address.match(/मकान\s*(?:नं\.|नम्बर|नं|संख्या)?\s*(\d+[A-Za-z\/\-]*)/i);
  return match ? match[1].trim() : '';
}

async function syncNathdiyas() {
  await mongoose.connect('mongodb://187.127.173.42:27017/political_crm');
  const members = mongoose.connection.db.collection('members');

  const dir = 'C:/Users/pc/Downloads/nathdiyas xl';
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.xlsx')).sort();

  console.log(`Found ${files.length} Excel files in ${dir}`);

  const bulkOps = [];
  let totalRows = 0;
  const casteCounts = {};
  const wardCounts = {};

  for (const f of files) {
    const wardMatch = f.match(/Ward_No_0*(\d+)/i);
    const wardNum = wardMatch ? wardMatch[1] : '';
    const wb = xlsx.readFile(path.join(dir, f));
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet);

    console.log(`Processing ${f}: Ward ${wardNum}, ${rows.length} rows`);

    for (const r of rows) {
      totalRows++;
      const epic = String(r['EPIC कोड'] || '').trim().toUpperCase();
      if (!epic) continue;

      const cleanName = String(r['नाम'] || '').trim();
      const guardian = String(r['पिता/पति का नाम'] || '').trim();
      const rawGender = String(r['लिंग'] || '').trim();
      const gender = (rawGender.includes('स्त्री') || rawGender.includes('महिला') || rawGender === 'female' || rawGender === 'f') ? 'female' : 'male';
      const rawCaste = String(r['जाति'] || '').trim();
      const address = String(r['पता'] || '').trim();
      const serial = String(r['क्रमांक'] || '').trim();
      const houseNumber = extractHouseNumber(address);

      // Caste & Sub-caste
      let caste = rawCaste;
      let subCaste = '';
      if (BRAHMIN_SUBCASTES.has(rawCaste) || rawCaste.includes('ब्राह्मण') || rawCaste.includes('शर्मा')) {
        caste = 'ब्राह्मण';
        subCaste = rawCaste;
      } else if (rawCaste === 'बलाई (जंगलिया)') {
        caste = 'बलाई';
        subCaste = 'जंगलिया';
      }

      const casteKey = `${caste}${subCaste ? ' (' + subCaste + ')' : ''}`;
      casteCounts[casteKey] = (casteCounts[casteKey] || 0) + 1;
      wardCounts[wardNum] = (wardCounts[wardNum] || 0) + 1;

      // Determine village
      let village = 'नाथडियास';
      if (address.includes('मोटरो का खेड़ा') || address.includes('मोटरों का खेडा')) {
        village = 'मोटरों का खेडा';
      } else if (address.includes('आसपुर')) {
        village = 'आसपुर';
      }

      const updateDoc = {
        name: cleanName,
        guardianName: guardian,
        gender: gender,
        caste: caste,
        subCaste: subCaste,
        address: address,
        wardNumber: wardNum,
        wardVoterSerial: serial,
        gramPanchayat: 'नाथडियास',
        village: village,
        panchayatSamiti: 'रायपुर',
        panchayatSamitiWard: 'वार्ड संख्या 11',
        hasMunicipalMembership: true
      };
      if (houseNumber) {
        updateDoc.houseNumber = houseNumber;
      }

      bulkOps.push({
        updateOne: {
          filter: { voterId: epic },
          update: {
            $set: updateDoc
          }
        }
      });
    }
  }

  console.log(`\nPrepared ${bulkOps.length} bulk update operations for MongoDB.`);
  console.log('Ward distribution in Excel:', wardCounts);
  console.log('Caste distribution in Excel:', JSON.stringify(casteCounts, null, 2));

  // Execute in batches of 500
  const batchSize = 500;
  let totalMatched = 0;
  let totalModified = 0;

  for (let i = 0; i < bulkOps.length; i += batchSize) {
    const chunk = bulkOps.slice(i, i + batchSize);
    const res = await members.bulkWrite(chunk, { ordered: false });
    totalMatched += res.matchedCount;
    totalModified += res.modifiedCount;
    console.log(`Batch ${Math.floor(i / batchSize) + 1} / ${Math.ceil(bulkOps.length / batchSize)}: Matched ${res.matchedCount}, Modified ${res.modifiedCount}`);
  }

  console.log('\n======================================================');
  console.log(`✅ SYNC COMPLETE: Total Matched: ${totalMatched}, Total Modified: ${totalModified}`);
  console.log('======================================================');

  process.exit(0);
}

syncNathdiyas().catch(console.error);
