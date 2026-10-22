const mongoose = require('mongoose');

const uri = 'mongodb+srv://Politic:Shree123@cluster0.lsrvqwd.mongodb.net/test?appName=Cluster0';

async function run() {
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
    const db = mongoose.connection.db;

    const docs = await db.collection('members').find({}).limit(3).toArray();
    console.log('Sample 3 members raw docs:', JSON.stringify(docs, null, 2));

    // Get all keys across 100 docs
    const keysSet = new Set();
    const sample = await db.collection('members').find({}).limit(100).toArray();
    for (const doc of sample) {
      for (const k of Object.keys(doc)) keysSet.add(k);
    }
    console.log('Keys in members:', Array.from(keysSet));

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run();
