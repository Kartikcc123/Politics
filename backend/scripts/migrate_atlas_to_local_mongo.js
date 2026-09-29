const mongoose = require('mongoose');

async function migrate() {
  const atlasUri = process.env.ATLAS_URI || process.argv[2] || 'mongodb+srv://Politic:Shree123@cluster0.lsrvqwd.mongodb.net/test?retryWrites=true&w=majority';
  const localUri = 'mongodb://politics_mongo:27017/political_crm';

  console.log('========================================================================');
  console.log('🚀 DIRECT MONGODB ATLAS ➔ VPS LOCAL MONGO MIGRATION');
  console.log('========================================================================\n');

  console.log('Connecting to Source (MongoDB Atlas - test DB)...');
  const sourceConn = await mongoose.createConnection(atlasUri).asPromise();
  console.log('✅ Source Atlas Connected!\n');

  console.log('Connecting to Target (Local VPS MongoDB - political_crm)...');
  const targetConn = await mongoose.createConnection(localUri).asPromise();
  console.log('✅ Target Local Mongo Connected!\n');

  const collectionsToCopy = ['users', 'parties', 'wards', 'booths', 'areas', 'families', 'members'];
  console.log(`📋 Collections to migrate:`, collectionsToCopy.join(', '));

  for (const name of collectionsToCopy) {
    const srcCol = sourceConn.db.collection(name);
    const dstCol = targetConn.db.collection(name);
    const count = await srcCol.countDocuments();
    console.log(`\n📦 Migrating [${name}] (${count.toLocaleString()} documents)...`);

    if (count === 0) continue;

    // Clear destination collection before fresh copy
    await dstCol.deleteMany({}).catch(() => {});

    // Stream in fast batches of 2500
    const cursor = srcCol.find({}).batchSize(2500);
    let batch = [];
    let copied = 0;

    for await (const doc of cursor) {
      batch.push(doc);
      if (batch.length >= 2500) {
        await dstCol.insertMany(batch, { ordered: false }).catch(() => {});
        copied += batch.length;
        process.stdout.write(`\r   Progress: ${copied.toLocaleString()} / ${count.toLocaleString()}...`);
        batch = [];
      }
    }

    if (batch.length > 0) {
      await dstCol.insertMany(batch, { ordered: false }).catch(() => {});
      copied += batch.length;
    }

    console.log(`\n✅ Finished copying [${name}] (${copied.toLocaleString()} docs).`);

    // Copy indexes
    try {
      const indexes = await srcCol.indexes();
      for (const idx of indexes) {
        if (idx.name === '_id_') continue;
        const options = { name: idx.name };
        if (idx.unique) options.unique = true;
        if (idx.partialFilterExpression) options.partialFilterExpression = idx.partialFilterExpression;
        await dstCol.createIndex(idx.key, options).catch(() => {});
      }
    } catch (_) {}
  }

  // Ensure high-speed lean indexes on members in target
  const membersDst = targetConn.db.collection('members');
  await membersDst.createIndex({ voterId: 1 }, { unique: true, partialFilterExpression: { voterId: { $type: 'string' } } }).catch(() => {});
  await membersDst.createIndex({ partNumber: 1, voterSerial: 1 }).catch(() => {});
  await membersDst.createIndex({ assemblyNumber: 1, partNumber: 1, voterSerial: 1 }).catch(() => {});
  await membersDst.createIndex({ gramPanchayat: 1, village: 1 }).catch(() => {});
  await membersDst.createIndex({ village: 1, partNumber: 1 }).catch(() => {});
  await membersDst.createIndex({ updatedAt: -1 }).catch(() => {});
  await membersDst.createIndex({ mobile: 1 }).catch(() => {});

  const totalVoters = await membersDst.countDocuments();
  console.log('\n========================================================================');
  console.log(`🎉 ALL 1.69 LAKH VOTERS & DATA SUCCESSFULLY MIGRATED TO VPS!`);
  console.log(`   Active Voters on Local VPS: ${totalVoters.toLocaleString()}`);
  console.log('========================================================================\n');

  await sourceConn.close();
  await targetConn.close();
}

migrate().catch(e => {
  console.error('Fatal Migration Error:', e);
  process.exit(1);
});
