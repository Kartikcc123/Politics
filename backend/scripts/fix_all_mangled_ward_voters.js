const mongoose = require('mongoose');
const Member = require('../src/models/Member');
const { decodeSecHindi } = require('../src/utils/secHindiDecoder');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://187.127.173.42:27017/political_crm';

async function run() {
  console.log('Connecting to MongoDB:', MONGO_URI);
  await mongoose.connect(MONGO_URI);
  console.log('Connected successfully!\n');

  // 1. Target all Ward-only voters and any other voter with mangled names
  const query = {
    $or: [
      { hasAssemblyMembership: false },
      { name: /नरम|नपतर|पनत|मकरन|सपखजर|आजच|ललग|पचरष|दकरल|भकरर|नगरधर|सनतयक|लरल|कच मर|दकरर|गचजर|लरदब|भरगब|सयहन|ननद|शपकरल|मरपगल|सचशल|कदशल|मलनर|सलमर|पबजर|पलनत|समतर|सचगनर|कपचन|भगरतल|हलरर|कजयड|गयहर|दकशन|नकसल/ },
      { guardianName: /नरम|नपतर|पनत|मकरन|सपखजर|आजच|ललग|पचरष|दकरल|भकरर|नगरधर|सनतयक|लरल|कच मर|दकरर|गचजर|लरदब|भरगब|सयहन|ननद|शपकरल|मरपगल|सचशल|कदशल|मलनर|सलमर|पबजर|पलनत|समतर|सचगनर|कपचन|भगरतल|हलरर|कजयड|गयहर|दकशन|नकसल/ }
    ]
  };

  const total = await Member.countDocuments(query);
  console.log(`Total voters identified for name decoding & cleaning: ${total}`);

  const cursor = Member.find(query).cursor();
  let processed = 0;
  let updatedCount = 0;
  let bulkOps = [];

  for await (const doc of cursor) {
    processed++;
    const origName = doc.name || '';
    const origGuard = doc.guardianName || '';

    const newName = decodeSecHindi(origName);
    const newGuard = decodeSecHindi(origGuard);

    if (newName !== origName || newGuard !== origGuard) {
      bulkOps.push({
        updateOne: {
          filter: { _id: doc._id },
          update: {
            $set: {
              name: newName,
              guardianName: newGuard
            }
          }
        }
      });
      updatedCount++;
    }

    if (bulkOps.length >= 1000) {
      await Member.bulkWrite(bulkOps, { ordered: false });
      console.log(`Processed ${processed}/${total} voters (Updated: ${updatedCount})...`);
      bulkOps = [];
    }
  }

  if (bulkOps.length > 0) {
    await Member.bulkWrite(bulkOps, { ordered: false });
    console.log(`Processed ${processed}/${total} voters (Updated: ${updatedCount})...`);
  }

  console.log(`\n======================================================`);
  console.log(`CLEANUP COMPLETE: Successfully decoded & updated ${updatedCount} voter names!`);
  console.log(`======================================================\n`);

  // Verify sample after update
  const sample = await Member.find({ hasAssemblyMembership: false }).limit(20).select('name guardianName gramPanchayat wardNumber voterId');
  console.log('Sample Updated Ward Voters:');
  sample.forEach((m, i) => {
    console.log(`${i+1}. [${m.gramPanchayat} W${m.wardNumber}] Name: "${m.name}", Guardian: "${m.guardianName}", EPIC: "${m.voterId || '-'}"`);
  });

  await mongoose.disconnect();
}

run().catch(err => {
  console.error('Error running voter name fixer:', err);
  process.exit(1);
});
