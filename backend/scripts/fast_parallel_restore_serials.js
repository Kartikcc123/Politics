const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://187.127.173.42:27017/political_crm';

async function fastParallelRestore() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');
  console.log('========================================================================');
  console.log(' ULTRA-FAST PARALLEL RESTORATION OF ORIGINAL ASSEMBLY SERIALS & PARTS   ');
  console.log('========================================================================\n');

  const collection = mongoose.connection.db.collection('members');
  const total = await collection.countDocuments();
  console.log(`Total members: ${total}`);

  console.log('Loading all member search exact & text projection...');
  const docs = await collection.find(
    { searchExact: { $exists: true, $ne: [] } },
    { projection: { _id: 1, searchExact: 1, searchText: 1, voterSerial: 1, partNumber: 1, voterId: 1 } }
  ).toArray();

  console.log(`Loaded ${docs.length} documents. Preparing bulk update operations...`);

  const allOps = [];

  for (let i = 0; i < docs.length; i++) {
    const doc = docs[i];
    const arr = doc.searchExact || [];
    let originalSerial = '';
    let originalPart = '';

    if (arr.length >= 3 && /^\d+$/.test(arr[2])) {
      originalSerial = arr[2];
    }

    for (let j = 0; j < arr.length; j++) {
      if (arr[j] === 'सहाडा सामान्य' || arr[j] === 'सहाड़ा' || arr[j] === '179') {
        for (let k = j + 1; k < arr.length; k++) {
          if (/^\d+$/.test(arr[k]) && parseInt(arr[k], 10) <= 300) {
            originalPart = arr[k];
          }
        }
      }
    }

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
      allOps.push({
        updateOne: {
          filter: { _id: doc._id },
          update: { $set: updates }
        }
      });
    }
  }

  console.log(`Prepared ${allOps.length} updates needed. Executing in parallel chunks...`);

  const CHUNK_SIZE = 5000;
  const chunks = [];
  for (let i = 0; i < allOps.length; i += CHUNK_SIZE) {
    chunks.push(allOps.slice(i, i + CHUNK_SIZE));
  }

  let completedChunks = 0;
  let totalModified = 0;
  const CONCURRENCY = 8;

  async function worker(chunkList) {
    for (const chunk of chunkList) {
      try {
        const res = await collection.bulkWrite(chunk, { ordered: false });
        totalModified += (res.modifiedCount || 0);
      } catch (e) {}
      completedChunks++;
      if (completedChunks % 5 === 0 || completedChunks === chunks.length) {
        console.log(`Progress: ${completedChunks}/${chunks.length} chunks (${Math.round((completedChunks/chunks.length)*100)}%) -> Updated ${totalModified}...`);
      }
    }
  }

  const workerChunks = Array.from({ length: CONCURRENCY }, () => []);
  chunks.forEach((c, idx) => {
    workerChunks[idx % CONCURRENCY].push(c);
  });

  await Promise.all(workerChunks.map(wList => worker(wList)));

  console.log('\n========================================================================');
  console.log(`Restoration Complete! Total documents restored: ${totalModified}`);
  console.log('========================================================================\n');

  // Verify SNE0802660 (बरजी देवी)
  const barji = await collection.findOne({ voterId: 'SNE0802660' });
  console.log('बरजी देवी (SNE0802660):', {
    name: barji.name,
    voterId: barji.voterId,
    voterSerial: barji.voterSerial,
    partNumber: barji.partNumber,
    wardNumber: barji.wardNumber,
    wardVoterSerial: barji.wardVoterSerial
  });

  // Verify SNE0102244 (लादू लाल)
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

fastParallelRestore().catch(console.error);
