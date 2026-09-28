require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const readline = require('readline');

async function repackCleanAtlas() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('❌ MONGO_URI is missing in .env');
    process.exit(1);
  }

  console.log('========================================================================');
  console.log('🧹 ATLAS SMART REPACK & BLOAT REMOVER');
  console.log('========================================================================\n');

  try {
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB Atlas.\n');

    const db = mongoose.connection.db;
    const membersColl = db.collection('members');
    const totalCount = await membersColl.countDocuments();
    console.log(`📊 Found ${totalCount.toLocaleString()} voters in database.`);

    if (totalCount === 0) {
      console.log('No members found to process.');
      return;
    }

    const backupFile = '/tmp/clean_voters_dump.jsonl';
    if (fs.existsSync(backupFile)) fs.unlinkSync(backupFile);

    const writeStream = fs.createWriteStream(backupFile, { flags: 'a' });

    console.log('\n1️⃣ Exporting clean voter data (Stripping 600 searchKeys & OCR bloat)...');
    const cursor = membersColl.find({}).batchSize(1000);

    let exported = 0;
    for await (const doc of cursor) {
      const cleanDoc = {
        _id: doc._id,
        contactType: doc.contactType || 'voter',
        name: doc.name || '',
        surname: doc.surname || '',
        guardianName: doc.guardianName || '',
        relationship: doc.relationship || '',
        voterId: doc.voterId || doc.epicNumber || '',
        epicNumber: doc.epicNumber || doc.voterId || '',
        voterSerial: doc.voterSerial || doc.serialNumber || '',
        serialNumber: doc.serialNumber || doc.voterSerial || '',
        houseNumber: doc.houseNumber || '',
        age: doc.age || null,
        gender: doc.gender || '',
        photo: doc.photo || doc.photoUrl || '',
        photoUrl: doc.photoUrl || doc.photo || '',
        mobile: doc.mobile || '',
        altMobile: doc.altMobile || '',
        address: doc.address || '',
        assemblyName: doc.assemblyName || '',
        assemblyNumber: doc.assemblyNumber || '',
        partNumber: doc.partNumber || '',
        sectionName: doc.sectionName || '',
        sectionNumber: doc.sectionNumber || '',
        ward: doc.ward || null,
        booth: doc.booth || null,
        familyId: doc.familyId || null,
        isFamilyHead: doc.isFamilyHead || false,
        organization: doc.organization || null,
        role: doc.role || '',
        party: doc.party || null,
        caste: doc.caste || '',
        voterStatus: doc.voterStatus || 'alive',
        politicalStatus: doc.politicalStatus || 'neutral',
        createdAt: doc.createdAt || new Date(),
        updatedAt: new Date()
      };

      writeStream.write(JSON.stringify(cleanDoc) + '\n');
      exported++;
      if (exported % 25000 === 0) {
        console.log(`   Exported ${exported.toLocaleString()} / ${totalCount.toLocaleString()} clean records...`);
      }
    }

    writeStream.end();
    await new Promise((resolve) => writeStream.on('finish', resolve));
    console.log(`✅ Step 1 Done: Exported ${exported.toLocaleString()} clean voters to local disk.`);

    // Step 2: Drop old bloated collection to reset Atlas quota
    console.log('\n2️⃣ Dropping bloated collection on Atlas to reset 512 MB quota...');
    await membersColl.drop();
    console.log('✅ Atlas 512 MB quota successfully unblocked!');

    // Step 3: Insert clean records in fast bulk chunks
    console.log('\n3️⃣ Re-inserting clean voters back into Atlas...');
    const readStream = fs.createReadStream(backupFile);
    const rl = readline.createInterface({ input: readStream, crlfDelay: Infinity });

    let batch = [];
    let inserted = 0;
    const newMembersColl = db.collection('members');

    for await (const line of rl) {
      if (!line.trim()) continue;
      const parsed = JSON.parse(line);
      if (parsed._id) parsed._id = new mongoose.Types.ObjectId(parsed._id);
      if (parsed.booth) parsed.booth = new mongoose.Types.ObjectId(parsed.booth);
      if (parsed.ward) parsed.ward = new mongoose.Types.ObjectId(parsed.ward);
      if (parsed.organization) parsed.organization = new mongoose.Types.ObjectId(parsed.organization);
      if (parsed.party) parsed.party = new mongoose.Types.ObjectId(parsed.party);
      if (parsed.familyId && mongoose.Types.ObjectId.isValid(parsed.familyId)) {
        parsed.familyId = new mongoose.Types.ObjectId(parsed.familyId);
      }

      batch.push(parsed);
      if (batch.length >= 1000) {
        await newMembersColl.insertMany(batch, { ordered: false });
        inserted += batch.length;
        console.log(`   Restored ${inserted.toLocaleString()} / ${exported.toLocaleString()} clean voters...`);
        batch = [];
      }
    }

    if (batch.length > 0) {
      await newMembersColl.insertMany(batch, { ordered: false });
      inserted += batch.length;
    }

    console.log(`\n🎉 Re-insert Complete: ${inserted.toLocaleString()} clean voters active in Atlas!`);

    // Recreate essential lightweight indexes
    console.log('\n4️⃣ Creating essential lightweight indexes...');
    await newMembersColl.createIndex({ voterId: 1 }, { unique: true, sparse: true });
    await newMembersColl.createIndex({ partNumber: 1, voterSerial: 1 });
    await newMembersColl.createIndex({ assemblyName: 1, partNumber: 1 });
    console.log('✅ Essential indexes created.');

    const stats = await db.command({ dbStats: 1 });
    console.log('\n📊 NEW ATLAS DATABASE STATS:');
    console.log(`   - Data Size       : ${((stats.dataSize || 0) / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`   - Storage On Disk : ${((stats.storageSize || 0) / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`   - Index Size      : ${((stats.indexSize || 0) / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`   - Total DB Footprint: ${(((stats.storageSize || 0) + (stats.indexSize || 0)) / (1024 * 1024)).toFixed(2)} MB (Out of 512 MB)`);
    console.log('========================================================================\n');

  } catch (error) {
    console.error('❌ Error during repack:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

repackCleanAtlas();
