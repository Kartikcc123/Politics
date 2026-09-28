require('dotenv').config();
const mongoose = require('mongoose');

async function optimizeAtlasSpace() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('❌ MONGO_URI is missing in .env');
    process.exit(1);
  }

  console.log('========================================================================');
  console.log('⚡ MONGODB ATLAS STORAGE OPTIMIZER (SMART CLEANUP)');
  console.log('========================================================================\n');

  try {
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB Atlas.\n');

    const db = mongoose.connection.db;
    const membersColl = db.collection('members');

    // 1. Check existing indexes on members
    console.log('1️⃣ Checking & Dropping Heavy Bloated Multikey Indexes...');
    const indexes = await membersColl.indexes();
    const bloatedIndexNames = [
      'searchKeys_1',
      'searchExact_1',
      'searchNameKeys_1',
      'searchGuardianKeys_1',
      'searchEpicKeys_1',
      'searchHouseKeys_1',
      'searchMobileKeys_1',
      'searchVillageKeys_1',
      'searchPinKeys_1'
    ];

    for (const idx of indexes) {
      if (bloatedIndexNames.includes(idx.name)) {
        try {
          await membersColl.dropIndex(idx.name);
          console.log(`   ✅ Dropped index: ${idx.name}`);
        } catch (e) {
          console.log(`   ⚠️ Could not drop ${idx.name}: ${e.message}`);
        }
      }
    }

    // 2. Clean binary buffers from mediaassets if any
    console.log('\n2️⃣ Checking mediaassets collection...');
    try {
      const mediaColl = db.collection('mediaassets');
      const count = await mediaColl.countDocuments();
      if (count > 0) {
        console.log(`   Found ${count} mediaassets documents.`);
        const res = await mediaColl.deleteMany({});
        console.log(`   ✅ Cleared ${res.deletedCount} internal binary mediaassets (images are on AWS S3).`);
      }
    } catch (e) {
      console.log(`   ⚠️ mediaassets check: ${e.message}`);
    }

    // 3. Clean temporary import collections
    console.log('\n3️⃣ Cleaning temporary import collections...');
    const tempCollections = ['importpreviews', 'importreviews', 'importjobs'];
    for (const t of tempCollections) {
      try {
        const c = db.collection(t);
        const count = await c.countDocuments();
        if (count > 0) {
          await c.deleteMany({});
          console.log(`   ✅ Cleared ${t} (${count} docs)`);
        }
      } catch (e) {}
    }

    // 4. Batch unset bloated fields from members
    console.log('\n4️⃣ Stripping bloated search arrays and OCR debug metadata from members...');
    const totalMembers = await membersColl.countDocuments();
    console.log(`   Total Members: ${totalMembers.toLocaleString()}`);

    if (totalMembers > 0) {
      try {
        const unsetFields = {
          searchKeys: "",
          searchExact: "",
          searchNameKeys: "",
          searchGuardianKeys: "",
          searchEpicKeys: "",
          searchHouseKeys: "",
          searchMobileKeys: "",
          searchVillageKeys: "",
          searchPinKeys: "",
          ocrValues: "",
          locationResolution: "",
          ocrReviewReasons: "",
          ocrFieldConfidence: ""
        };

        const updateRes = await membersColl.updateMany(
          {},
          { $unset: unsetFields }
        );
        console.log(`   ✅ Successfully stripped bloated fields from ${updateRes.modifiedCount} voter records!`);
      } catch (e) {
        console.log(`   ⚠️ Note during field unset: ${e.message}`);
      }
    }

    // 5. Final stats check
    console.log('\n5️⃣ Final Storage Inspection:');
    const stats = await db.command({ dbStats: 1 });
    console.log(`   - Data Size       : ${((stats.dataSize || 0) / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`   - Storage On Disk : ${((stats.storageSize || 0) / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`   - Index Size      : ${((stats.indexSize || 0) / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`   - Total DB Space  : ${(((stats.storageSize || 0) + (stats.indexSize || 0)) / (1024 * 1024)).toFixed(2)} MB`);
    console.log('========================================================================\n');

  } catch (error) {
    console.error('❌ Optimization error:', error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

optimizeAtlasSpace();
