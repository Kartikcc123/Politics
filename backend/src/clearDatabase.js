require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const Member = require('./models/Member');
const Family = require('./models/Family');
const ElectoralList = require('./models/ElectoralList');
const ElectoralMembership = require('./models/ElectoralMembership');
const ImportJob = require('./models/ImportJob');
const ImportReview = require('./models/ImportReview');
const ImportPreview = require('./models/ImportPreview');
const Activity = require('./models/Activity');

async function clearDatabase() {
  await connectDB();
  console.log('Connecting to MongoDB database to purge legacy data...');

  const results = await Promise.all([
    Member.deleteMany({}),
    Family.deleteMany({}),
    ElectoralList.deleteMany({}),
    ElectoralMembership.deleteMany({}),
    ImportJob.deleteMany({}),
    ImportReview.deleteMany({}),
    ImportPreview.deleteMany({}),
    Activity.deleteMany({}),
  ]);

  console.log('====================================================');
  console.log('   DATABASE PURGE COMPLETE');
  console.log('====================================================');
  console.log(`Deleted Members: ${results[0].deletedCount}`);
  console.log(`Deleted Families: ${results[1].deletedCount}`);
  console.log(`Deleted Electoral Lists: ${results[2].deletedCount}`);
  console.log(`Deleted Electoral Memberships: ${results[3].deletedCount}`);
  console.log(`Deleted Import Jobs: ${results[4].deletedCount}`);
  console.log(`Deleted Import Reviews: ${results[5].deletedCount}`);
  console.log(`Deleted Import Previews: ${results[6].deletedCount}`);
  console.log(`Deleted Activities: ${results[7].deletedCount}`);
  console.log('====================================================');

  await mongoose.disconnect();
}

clearDatabase().catch(async (error) => {
  console.error('Database purge error:', error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
