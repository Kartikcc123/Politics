require('dotenv').config();
const mongoose = require('mongoose');

async function inspectCollections() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('❌ MONGO_URI is missing in .env');
    process.exit(1);
  }

  console.log('========================================================================');
  console.log('🔍 MONGODB ATLAS STORAGE & UNWANTED DATA INSPECTOR');
  console.log('========================================================================\n');

  try {
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB Atlas.\n');

    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();

    console.log(`Found ${collections.length} collections in database:`);
    console.log('------------------------------------------------------------------------');

    let totalDbDataSize = 0;
    let totalDbStorageSize = 0;
    let totalDbIndexSize = 0;

    for (const col of collections) {
      const colName = col.name;
      const coll = db.collection(colName);
      
      let count = 0;
      let stats = {};
      try {
        count = await coll.countDocuments();
        stats = await db.command({ collStats: colName });
      } catch (err) {
        // Fallback if collStats fails
      }

      const sizeMB = ((stats.size || 0) / (1024 * 1024)).toFixed(2);
      const storageMB = ((stats.storageSize || 0) / (1024 * 1024)).toFixed(2);
      const indexMB = ((stats.totalIndexSize || 0) / (1024 * 1024)).toFixed(2);
      const avgObjSize = stats.avgObjSize ? Math.round(stats.avgObjSize) : 0;

      totalDbDataSize += (stats.size || 0);
      totalDbStorageSize += (stats.storageSize || 0);
      totalDbIndexSize += (stats.totalIndexSize || 0);

      console.log(`📦 Collection: [ ${colName} ]`);
      console.log(`   - Total Documents : ${count.toLocaleString()} docs`);
      console.log(`   - Data Size       : ${sizeMB} MB`);
      console.log(`   - Storage Size    : ${storageMB} MB`);
      console.log(`   - Index Size      : ${indexMB} MB`);
      console.log(`   - Avg Record Size : ${avgObjSize} bytes`);

      // Inspect sample document keys
      if (count > 0) {
        const sampleDoc = await coll.findOne();
        if (sampleDoc) {
          const keys = Object.keys(sampleDoc);
          console.log(`   - Fields in Doc   : ${keys.slice(0, 15).join(', ')}${keys.length > 15 ? '... (+' + (keys.length - 15) + ' more)' : ''}`);

          // Check for large fields in sample
          for (const k of keys) {
            const valStr = JSON.stringify(sampleDoc[k]);
            if (valStr && valStr.length > 500) {
              console.log(`     ⚠️ HEAVY FIELD FOUND: "${k}" (~${Math.round(valStr.length / 1024)} KB per doc)`);
            }
          }
        }
      }
      console.log('------------------------------------------------------------------------');
    }

    console.log('\n📊 DATABASE SUMMARY:');
    console.log(`   Total Raw Data Size   : ${(totalDbDataSize / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`   Total Storage On Disk : ${(totalDbStorageSize / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`   Total Index Size      : ${(totalDbIndexSize / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`   Total Footprint       : ${((totalDbStorageSize + totalDbIndexSize) / (1024 * 1024)).toFixed(2)} MB`);
    console.log('========================================================================\n');

  } catch (error) {
    console.error('❌ Error inspecting database:', error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

inspectCollections();
