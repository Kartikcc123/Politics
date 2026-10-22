const mongoose = require('mongoose');

const uri = 'mongodb+srv://Politic:Shree123@cluster0.lsrvqwd.mongodb.net/?appName=Cluster0';

async function run() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
    console.log('Connected! Current DB:', mongoose.connection.name);

    // List all databases
    const admin = mongoose.connection.db.admin();
    const dbs = await admin.listDatabases();
    console.log('Databases on Cluster0:', dbs.databases.map(d => d.name));

    // For each relevant database, check collections and member count
    for (const d of dbs.databases) {
      if (['admin', 'local'].includes(d.name)) continue;
      const targetDb = mongoose.connection.client.db(d.name);
      const cols = await targetDb.listCollections().toArray();
      console.log(`DB [${d.name}] collections:`, cols.map(c => c.name));
      for (const col of cols) {
        const count = await targetDb.collection(col.name).countDocuments();
        console.log(`  - ${col.name}: ${count} docs`);
      }
    }
  } catch (err) {
    console.error('Error connecting to MongoDB:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run();
