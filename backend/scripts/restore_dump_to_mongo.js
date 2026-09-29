require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

async function restoreDump() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://politics_mongo:27017/political_crm';
  console.log('========================================================================');
  console.log('🚀 UNLIMITED HIGH-SPEED DATABASE RESTORE ENGINE');
  console.log('========================================================================\n');

  console.log('Connecting to Mongo URI:', mongoUri);
  await mongoose.connect(mongoUri);
  console.log('✅ Connected to MongoDB!\n');

  const db = mongoose.connection.db;
  const membersColl = db.collection('members');

  // Look for backup dump files
  const possiblePaths = [
    path.resolve('scratch_clean_voters_dump.jsonl'),
    '/app/scratch_clean_voters_dump.jsonl',
    '/tmp/clean_voters_dump.jsonl',
    path.join(__dirname, '../scratch_clean_voters_dump.jsonl')
  ];

  let dumpPath = null;
  for (const p of possiblePaths) {
    if (fs.existsSync(p) && fs.statSync(p).size > 1000) {
      dumpPath = p;
      break;
    }
  }

  if (!dumpPath) {
    console.error('❌ No voter dump file found in known paths:', possiblePaths);
    process.exit(1);
  }

  console.log(`📁 Loading voter records from: ${dumpPath} (${(fs.statSync(dumpPath).size / 1024 / 1024).toFixed(2)} MB)...`);

  const readStream = fs.createReadStream(dumpPath);
  const rl = readline.createInterface({ input: readStream, crlfDelay: Infinity });

  let batch = [];
  let totalRestored = 0;

  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      const record = JSON.parse(line);
      if (record._id) record._id = new mongoose.Types.ObjectId(record._id);
      if (record.area) record.area = new mongoose.Types.ObjectId(record.area);
      if (record.booth) record.booth = new mongoose.Types.ObjectId(record.booth);
      if (record.ward) record.ward = new mongoose.Types.ObjectId(record.ward);
      if (record.createdBy) record.createdBy = new mongoose.Types.ObjectId(record.createdBy);
      if (record.updatedBy) record.updatedBy = new mongoose.Types.ObjectId(record.updatedBy);
      if (record.createdAt) record.createdAt = new Date(record.createdAt);
      if (record.updatedAt) record.updatedAt = new Date(record.updatedAt);

      batch.push(record);
      if (batch.length >= 2500) {
        await membersColl.insertMany(batch, { ordered: false }).catch(() => {});
        totalRestored += batch.length;
        process.stdout.write(`\r   Restored: ${totalRestored.toLocaleString()} voters...`);
        batch = [];
      }
    } catch (_) {}
  }

  if (batch.length > 0) {
    await membersColl.insertMany(batch, { ordered: false }).catch(() => {});
    totalRestored += batch.length;
  }

  console.log(`\n\n✅ Successfully restored ${totalRestored.toLocaleString()} voters with all photos & details!`);

  // Build indexes
  console.log('⚡ Building database indexes...');
  try {
    await membersColl.createIndex({ voterId: 1 }, { unique: true, partialFilterExpression: { voterId: { $type: 'string' } } });
    await membersColl.createIndex({ partNumber: 1, voterSerial: 1 });
    await membersColl.createIndex({ assemblyNumber: 1, partNumber: 1, voterSerial: 1 });
    await membersColl.createIndex({ gramPanchayat: 1, village: 1 });
    await membersColl.createIndex({ village: 1, partNumber: 1 });
    await membersColl.createIndex({ updatedAt: -1 });
    await membersColl.createIndex({ mobile: 1 });
    console.log('✅ Indexes created successfully.');
  } catch (idxErr) {
    console.warn('Index note:', idxErr.message);
  }

  const count = await membersColl.countDocuments();
  console.log(`\n🎉 Total Voters Active in Database: ${count.toLocaleString()}`);
  console.log('========================================================================\n');

  await mongoose.disconnect();
}

restoreDump().catch(e => {
  console.error('Fatal restore error:', e);
  process.exit(1);
});
