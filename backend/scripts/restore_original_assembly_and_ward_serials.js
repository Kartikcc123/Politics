const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://187.127.173.42:27017/political_crm';

async function restoreOriginalSerials() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');
  console.log('========================================================================');
  console.log(' RESTORING ORIGINAL AUTHENTIC ASSEMBLY SERIALS FROM SEARCH DATA & CARDS ');
  console.log('========================================================================\n');

  const collection = mongoose.connection.db.collection('members');
  const total = await collection.countDocuments();
  console.log(`Total members to process: ${total}`);

  const cursor = collection.find({ searchExact: { $exists: true, $ne: [] } });
  
  let bulkOps = [];
  let updatedCount = 0;
  let batchCount = 0;

  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    const arr = doc.searchExact || [];
    
    let originalSerial = '';
    let originalPart = '';
    
    // Index 2 is the serial number in searchExact
    if (arr.length >= 3 && /^\d+$/.test(arr[2])) {
      originalSerial = arr[2];
    }
    
    // Part number is the numeric item following '179' or 'सहाडा सामान्य'
    for (let i = 0; i < arr.length; i++) {
      if (arr[i] === 'सहाडा सामान्य' || arr[i] === 'सहाड़ा' || arr[i] === '179') {
        for (let j = i + 1; j < arr.length; j++) {
          if (/^\d+$/.test(arr[j]) && parseInt(arr[j], 10) <= 300) {
            originalPart = arr[j];
          }
        }
      }
    }

    // Fallback from searchText if searchExact didn't yield
    if (!originalSerial && doc.searchText) {
      const tokens = doc.searchText.split(' ');
      if (tokens.length >= 3 && /^\d+$/.test(tokens[2])) {
        originalSerial = tokens[2];
      }
      const lastToken = tokens[tokens.length - 1];
      if (/^\d+$/.test(lastToken) && parseInt(lastToken, 10) <= 300) {
        originalPart = lastToken;
      }
    }

    const updates = {};
    if (originalSerial && doc.voterSerial !== originalSerial) {
      updates.voterSerial = originalSerial;
    }
    if (originalPart && doc.partNumber !== originalPart) {
      updates.partNumber = originalPart;
    }

    if (Object.keys(updates).length > 0) {
      bulkOps.push({
        updateOne: {
          filter: { _id: doc._id },
          update: { $set: updates }
        }
      });
      updatedCount++;
    }

    if (bulkOps.length >= 5000) {
      batchCount++;
      await collection.bulkWrite(bulkOps, { ordered: false });
      console.log(`Executed batch ${batchCount} -> Updated ${updatedCount} records so far...`);
      bulkOps = [];
    }
  }

  if (bulkOps.length > 0) {
    batchCount++;
    await collection.bulkWrite(bulkOps, { ordered: false });
    console.log(`Executed final batch ${batchCount} -> Total updated: ${updatedCount}`);
  }

  console.log('\n========================================================================');
  console.log('                          VERIFICATION CHECKS                           ');
  console.log('========================================================================');

  // Check SNE0802660 (बरजी देवी)
  const barji = await collection.findOne({ voterId: 'SNE0802660' });
  console.log('बरजी देवी (SNE0802660):', {
    name: barji.name,
    voterId: barji.voterId,
    voterSerial: barji.voterSerial,
    partNumber: barji.partNumber,
    wardNumber: barji.wardNumber,
    wardVoterSerial: barji.wardVoterSerial
  });

  // Check SNE0102244 (लादू लाल)
  const ladu = await collection.findOne({ voterId: 'SNE0102244' });
  console.log('लादू लाल (SNE0102244):', {
    name: ladu.name,
    voterId: ladu.voterId,
    voterSerial: ladu.voterSerial,
    partNumber: ladu.partNumber,
    wardNumber: ladu.wardNumber,
    wardVoterSerial: ladu.wardVoterSerial
  });

  await mongoose.disconnect();
}

restoreOriginalSerials().catch(console.error);
