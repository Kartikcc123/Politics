const mongoose = require('mongoose');

const uri = 'mongodb+srv://Politic:Shree123@cluster0.lsrvqwd.mongodb.net/test?appName=Cluster0';

async function run() {
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
    const db = mongoose.connection.db;

    const samitis = await db.collection('members').distinct('panchayatSamiti');
    console.log('Distinct panchayatSamiti in members:', samitis);

    const psWards = await db.collection('members').distinct('panchayatSamitiWard');
    console.log('Distinct panchayatSamitiWard in members:', psWards);

    // Check if any member has 'kosh' or 'कोश' in ANY field by full text or regex
    const regex = /कोशिथल|koshithal/i;
    const sample = await db.collection('members').findOne({
      $or: [
        { panchayatSamiti: regex },
        { panchayatSamitiWard: regex },
        { village: regex },
        { gramPanchayat: regex },
        { address: regex },
        { pollingStation: regex },
        { partName: regex },
        { sectionName: regex },
        { name: regex },
      ]
    });
    console.log('Any match for koshithal in members:', sample ? sample._id : 'NONE');

    // Let's search across ALL collections in the database for 'koshithal' or 'कोशिथल'
    const collections = await db.listCollections().toArray();
    for (const c of collections) {
      const docs = await db.collection(c.name).find({
        $or: [
          { name: regex },
          { title: regex },
          { area: regex },
          { village: regex },
          { gramPanchayat: regex },
          { tehsil: regex },
          { text: regex },
        ]
      }).toArray();
      if (docs.length > 0) {
        console.log(`Found in collection [${c.name}]: ${docs.length} docs:`, docs);
      }
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run();
