const mongoose = require('mongoose');
const xlsx = require('xlsx');
const path = require('path');

async function testOneBooth() {
  await mongoose.connect('mongodb://187.127.173.42:27017/political_crm');
  const collection = mongoose.connection.db.collection('members');

  const file = 'D:\\Randeep Trivedi Voter list\\SONU BHAISAB ALL DETAIL BOOTH WISE\\S20_179_1.xls';
  const wb = xlsx.readFile(file);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

  const header = rows[0].map(h => String(h || '').trim());
  const epicIdx = header.findIndex(h => /EPIC/i.test(h));
  const nameHindiIdx = header.findIndex(h => /NameHindi/i.test(h));
  const parentHindiIdx = header.findIndex(h => /PartentNameHindi|ParentNameHindi|FatherHindi/i.test(h));
  const casteIdx = header.findIndex(h => /Caste/i.test(h));
  const mobileIdx = header.findIndex(h => /Mobile/i.test(h));

  const ops = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || !row[epicIdx]) continue;
    const epic = String(row[epicIdx]).trim().toUpperCase();
    const nameHindi = nameHindiIdx !== -1 ? String(row[nameHindiIdx] || '').trim() : '';
    const parentHindi = parentHindiIdx !== -1 ? String(row[parentHindiIdx] || '').trim() : '';
    const caste = casteIdx !== -1 ? String(row[casteIdx] || '').trim() : '';
    const mobile = mobileIdx !== -1 ? String(row[mobileIdx] || '').replace(/\D/g, '').trim() : '';

    const $set = {};
    if (nameHindi && nameHindi !== '0') $set.name = nameHindi;
    if (parentHindi && parentHindi !== '0') {
      $set.guardianName = parentHindi;
      $set.relativeName = parentHindi;
    }
    if (caste && caste !== '0') $set.caste = caste;
    if (mobile && mobile.length === 10) $set.mobile = mobile;

    if (Object.keys($set).length > 0) {
      ops.push({
        updateOne: {
          filter: { voterId: epic },
          update: { $set }
        }
      });
    }
  }

  console.log(`Prepared ${ops.length} ops for booth 1.`);
  console.time('bulkWriteBooth1');
  const res = await collection.bulkWrite(ops, { ordered: false });
  console.timeEnd('bulkWriteBooth1');
  console.log('Matched:', res.matchedCount, 'Modified:', res.modifiedCount);

  // Check 5 updated docs
  const sample = await collection.find({ voterId: { $in: ops.slice(0, 5).map(o => o.updateOne.filter.voterId) } }).toArray();
  console.log('Updated sample:', sample.map(s => ({ epic: s.voterId, name: s.name, caste: s.caste })));

  await mongoose.disconnect();
}

testOneBooth().catch(console.error);
