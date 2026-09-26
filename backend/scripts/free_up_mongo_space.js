const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/political_crm';

async function main() {
  console.log('========================================================================');
  console.log('🧹 MONGODB ATLAS STORAGE CLEANUP TOOL (FREE UP 300+ MB)');
  console.log('========================================================================\n');

  console.log('Connecting to database...');
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected successfully.\n');

  const db = mongoose.connection.db;
  const membersCol = db.collection('members');

  // 1. Check current stats
  try {
    const statsBefore = await db.stats();
    console.log(`📊 Storage BEFORE Cleanup:`);
    console.log(`   Data Size   : ${(statsBefore.dataSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Storage Size: ${(statsBefore.storageSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Index Size  : ${(statsBefore.indexSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Total Size  : ${((statsBefore.storageSize + statsBefore.indexSize) / 1024 / 1024).toFixed(2)} MB\n`);
  } catch (e) {
    console.log('Stats note:', e.message);
  }

  // 2. Drop bloated search indexes (Frees up ~300 MB immediately)
  console.log('🔥 Dropping bloated search indexes...');
  const indexesToDrop = [
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

  const existingIndexes = await membersCol.indexes();
  const existingNames = new Set(existingIndexes.map(i => i.name));

  for (const idxName of indexesToDrop) {
    if (existingNames.has(idxName)) {
      try {
        await membersCol.dropIndex(idxName);
        console.log(`   ✅ Dropped index: ${idxName}`);
      } catch (err) {
        console.warn(`   ⚠️ Could not drop ${idxName}: ${err.message}`);
      }
    }
  }

  // Also drop heavy text index if exists
  for (const idx of existingIndexes) {
    if (idx.name.includes('_text_') || idx.textIndexVersion) {
      try {
        await membersCol.dropIndex(idx.name);
        console.log(`   ✅ Dropped heavy text index: ${idx.name}`);
      } catch (err) {
        console.warn(`   ⚠️ Could not drop text index: ${err.message}`);
      }
    }
  }

  // 3. Remove searchKeys arrays from documents (Frees up another 100+ MB)
  console.log('\n🗑️  Unsetting searchKeys and searchExact arrays from voter documents...');
  try {
    const updateRes = await membersCol.updateMany({}, {
      $unset: {
        searchKeys: '',
        searchExact: '',
        searchNameKeys: '',
        searchGuardianKeys: '',
        searchEpicKeys: '',
        searchHouseKeys: '',
        searchMobileKeys: '',
        searchVillageKeys: '',
        searchPinKeys: '',
        searchText: ''
      }
    });
    console.log(`   ✅ Successfully updated ${updateRes.modifiedCount} voter documents!`);
  } catch (err) {
    console.warn(`   ⚠️ Update note (writes may still be unblocking): ${err.message}`);
  }

  // 4. Check stats after cleanup
  try {
    const statsAfter = await db.stats();
    console.log(`\n========================================================================`);
    console.log(`🎉 Storage AFTER Cleanup:`);
    console.log(`   Data Size   : ${(statsAfter.dataSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Storage Size: ${(statsAfter.storageSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Index Size  : ${(statsAfter.indexSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Total Size  : ${((statsAfter.storageSize + statsAfter.indexSize) / 1024 / 1024).toFixed(2)} MB`);
    console.log('========================================================================\n');
  } catch (_) { }

  await mongoose.disconnect();
  console.log('Done!');
}

main().catch(err => {
  console.error('Cleanup error:', err);
  process.exit(1);
});
