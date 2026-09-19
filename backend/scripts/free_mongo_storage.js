const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Member = require('../src/models/Member');
const ImportJob = require('../src/models/ImportJob');
const ImportPreview = require('../src/models/ImportPreview');
const ImportReview = require('../src/models/ImportReview');
const Activity = require('../src/models/Activity');
const { invalidateMemberData } = require('../src/utils/dataCache');

async function main() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/political_crm';
  console.log('Connecting to MongoDB...');
  await mongoose.connect(mongoUri);

  const db = mongoose.connection.db;
  console.log('Connected to DB:', db.databaseName);
  console.log('====================================================');
  console.log('📊 CHECKING COLLECTION STATS');
  console.log('====================================================');

  const collections = await db.listCollections().toArray();
  for (const col of collections) {
    try {
      const stats = await db.command({ collStats: col.name });
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      const storageMB = (stats.storageSize / (1024 * 1024)).toFixed(2);
      console.log(`- ${col.name.padEnd(25)}: ${stats.count} docs | ${sizeMB} MB data | ${storageMB} MB storage`);
    } catch (e) {
      // collStats might fail on some views
    }
  }

  console.log('\n====================================================');
  console.log('🧹 CLEANING STORAGE TO UNBLOCK ATLAS WRITES');
  console.log('====================================================');

  // 1. Delete all ImportJobs (ImportJob results store massive raw OCR dumps)
  const jobDel = await ImportJob.deleteMany({});
  console.log(`✅ Deleted ${jobDel.deletedCount} ImportJob records (large OCR JSON dumps freed).`);

  // 2. Delete all ImportPreviews
  const prevDel = await ImportPreview.deleteMany({});
  console.log(`✅ Deleted ${prevDel.deletedCount} ImportPreview records.`);

  // 3. Delete all ImportReviews
  const revDel = await ImportReview.deleteMany({});
  console.log(`✅ Deleted ${revDel.deletedCount} ImportReview records.`);

  // 4. Delete today's test uploaded Members (on or after Sept 19, 2026)
  const cutoff = new Date('2026-09-19T00:00:00.000Z');
  const memberDel = await Member.deleteMany({ createdAt: { $gte: cutoff } });
  console.log(`✅ Deleted ${memberDel.deletedCount} test Member records created on/after ${cutoff.toISOString().split('T')[0]}.`);

  // 5. Delete older Activity logs (older than 7 days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const actDel = await Activity.deleteMany({ createdAt: { $lt: sevenDaysAgo } });
  console.log(`✅ Deleted ${actDel.deletedCount} old Activity log records.`);

  try {
    invalidateMemberData();
  } catch (_) {}

  console.log('\n====================================================');
  console.log('🎉 STORAGE CLEANUP COMPLETED!');
  console.log('Atlas free quota has been reclaimed. Writes will now be unblocked.');
  console.log('====================================================');

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('❌ Error during cleanup:', err);
  process.exit(1);
});
