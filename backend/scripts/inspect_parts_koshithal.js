const mongoose = require('mongoose');

const uri = 'mongodb+srv://Politic:Shree123@cluster0.lsrvqwd.mongodb.net/test?appName=Cluster0';

async function run() {
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
    const db = mongoose.connection.db;

    console.log('=== CHECKING PARTS 51 to 56 ===');
    for (const p of ['51', '52', '53', '54', '55', '56']) {
      const count = await db.collection('members').countDocuments({ partNumber: p });
      const sample = await db.collection('members').findOne({ partNumber: p });
      console.log(`Part ${p}: ${count} members | GP: "${sample?.gramPanchayat}" | Vil: "${sample?.village}" | Sec: "${sample?.sectionName}" | Assembly: "${sample?.assemblyName}"`);
    }

    // Check all partNumbers in members
    const allParts = await db.collection('members').distinct('partNumber');
    console.log(`All partNumbers (${allParts.length}):`, allParts.sort((a,b) => Number(a) - Number(b)));

    // Look at sample members in Part 51-56 to see their names!
    const sampleVoters = await db.collection('members').find({ partNumber: { $in: ['51', '52', '53', '54', '55', '56'] } }).limit(20).toArray();
    console.log('\nSample 20 voters in Parts 51-56:');
    for (const v of sampleVoters) {
      console.log(`- Part: ${v.partNumber} | Name: "${v.name}" | Guardian: "${v.guardianName}" | Caste: "${v.caste}" | Serial: ${v.voterSerial} | EPIC: ${v.voterId} | GP: "${v.gramPanchayat}" | Ward: "${v.wardNumber}"`);
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run();
