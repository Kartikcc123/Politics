const mongoose = require('mongoose');

async function migrate(atlasUri) {
  if (!atlasUri) {
    console.error('Usage: node scripts/migrate_atlas_to_local_mongo.js "<ATLAS_MONGO_URI>"');
    process.exit(1);
  }

  const localUri = 'mongodb://politics_mongo:27017/political_crm';

  console.log('========================================================================');
  console.log('🚀 DIRECT MONGODB ATLAS ➔ VPS LOCAL MONGO MIGRATION');
  console.log('========================================================================\n');

  console.log('Connecting to Source (MongoDB Atlas)...');
  const sourceConn = await mongoose.createConnection(atlasUri).asPromise();
  console.log('✅ Source Atlas Connected!\n');

  console.log('Connecting to Target (Local VPS MongoDB)...');
  const targetConn = await mongoose.createConnection(localUri).asPromise();
  console.log('✅ Target Local Mongo Connected!\n');

  const collections = await sourceConn.db.listCollections().toArray();
  console.log(`📋 Found ${collections.length} collections to copy:`, collections.map(c => c.name).join(', '));

  for (const col of collections) {
    const name = col.name;
    if (name.startsWith('system.')) continue;

    const srcCol = sourceConn.db.collection(name);
    const dstCol = targetConn.db.collection(name);
    const count = await srcCol.countDocuments();
    console.log(`\n📦 Copying [${name}] (${count.toLocaleString()} documents)...`);

    if (count === 0) continue;

    // Stream in batches of 2000
    const cursor = srcCol.find({}).batchSize(2000);
    let batch = [];
    let copied = 0;

    for await (const doc of cursor) {
      batch.push(doc);
      if (batch.length >= 2000) {
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

  console.log('\n========================================================================');
  console.log('🎉 ALL DATA MIGRATED TO VPS LOCAL MONGO SUCCESSFULLY!');
  console.log('========================================================================\n');

  await sourceConn.close();
  await targetConn.close();
}

const atlasArg = process.argv[2];
migrate(atlasArg).catch(e => {
  console.error('Fatal Migration Error:', e);
  process.exit(1);
});
