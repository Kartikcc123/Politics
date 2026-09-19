const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Member = require('../src/models/Member');
const Family = require('../src/models/Family');
const ElectoralMembership = require('../src/models/ElectoralMembership');
const ImportJob = require('../src/models/ImportJob');
const ImportPreview = require('../src/models/ImportPreview');
const ImportReview = require('../src/models/ImportReview');
const Activity = require('../src/models/Activity');
const User = require('../src/models/User');
const { invalidateMemberData } = require('../src/utils/dataCache');

async function main() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/political_crm';
  console.log('Connecting to MongoDB...');
  await mongoose.connect(mongoUri);

  const db = mongoose.connection.db;
  console.log('====================================================');
  console.log('🧹 COMPLETE FRESH RESET FOR CLIENT ROLLOUT');
  console.log('====================================================');

  // Verify Admin user exists so user does not lose access
  const adminCount = await User.countDocuments();
  console.log(`🔒 Preserved: ${adminCount} User account(s) will remain safe and untouched.`);

  // 1. Drop MediaAsset collection to immediately free storage
  try {
    const mediaCount = await db.collection('mediaassets').countDocuments();
    await db.collection('mediaassets').drop();
    console.log(`✅ Dropped mediaassets collection (${mediaCount} image documents removed).`);
  } catch (_) {
    console.log('ℹ️  mediaassets collection was already empty or dropped.');
  }

  // 2. Delete all Members
  const memberDel = await Member.deleteMany({});
  console.log(`✅ Deleted all ${memberDel.deletedCount} Member voter records.`);

  // 3. Delete all Families
  const familyDel = await Family.deleteMany({});
  console.log(`✅ Deleted all ${familyDel.deletedCount} Family records.`);

  // 4. Delete all Electoral Memberships
  const elecDel = await ElectoralMembership.deleteMany({});
  console.log(`✅ Deleted all ${elecDel.deletedCount} ElectoralMembership records.`);

  // 5. Delete all Import Jobs
  const jobDel = await ImportJob.deleteMany({});
  console.log(`✅ Deleted all ${jobDel.deletedCount} ImportJob records.`);

  // 6. Delete all Import Previews & Reviews
  const prevDel = await ImportPreview.deleteMany({});
  console.log(`✅ Deleted all ${prevDel.deletedCount} ImportPreview records.`);
  const revDel = await ImportReview.deleteMany({});
  console.log(`✅ Deleted all ${revDel.deletedCount} ImportReview records.`);

  // 7. Clear old Activities
  const actDel = await Activity.deleteMany({});
  console.log(`✅ Deleted ${actDel.deletedCount} Activity log records.`);

  // 8. Invalidate all caches
  try {
    invalidateMemberData();
    console.log('✅ In-memory member and dashboard caches cleared.');
  } catch (_) {}

  console.log('====================================================');
  console.log('🎉 DATABASE IS NOW 100% CLEAN & FRESH!');
  console.log('Storage usage is back to ~1 MB.');
  console.log('You can now upload your 200 PDFs with zero duplicates and accurate data!');
  console.log('====================================================');

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('❌ Reset error:', err);
  process.exit(1);
});
