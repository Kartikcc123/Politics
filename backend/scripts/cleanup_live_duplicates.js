const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const Member = require('../src/models/Member');
const { isValidEpic } = require('../src/utils/epic');
const { invalidateMemberData } = require('../src/utils/dataCache');

async function main() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/political_crm';
  console.log('Connecting to MongoDB:', mongoUri.replace(/\/\/.*@/, '//***@'));
  await mongoose.connect(mongoUri);

  console.log('--- Finding Duplicate Voters ---');

  // 1. Same booth + voterSerial
  const serialClusters = await Member.aggregate([
    {
      $match: {
        voterSerial: { $nin: ['', null, 'undefined', 'null', 'none', '-'] },
        booth: { $exists: true, $ne: null }
      }
    },
    {
      $group: {
        _id: { booth: '$booth', voterSerial: '$voterSerial' },
        count: { $sum: 1 },
        ids: { $push: '$_id' }
      }
    },
    { $match: { count: { $gt: 1 } } }
  ]);

  // 2. Same booth + name + guardianName
  const nameClusters = await Member.aggregate([
    {
      $match: {
        name: { $nin: ['', null] },
        guardianName: { $nin: ['', null] },
        booth: { $exists: true, $ne: null }
      }
    },
    {
      $group: {
        _id: { booth: '$booth', name: '$name', guardianName: '$guardianName' },
        count: { $sum: 1 },
        ids: { $push: '$_id' }
      }
    },
    { $match: { count: { $gt: 1 } } }
  ]);

  console.log(`Found ${serialClusters.length} duplicate clusters by Booth+Serial`);
  console.log(`Found ${nameClusters.length} duplicate clusters by Booth+Name+Guardian`);

  const allClusters = [...serialClusters, ...nameClusters];
  const processedIds = new Set();
  let mergedCount = 0;
  let removedCount = 0;

  for (const cluster of allClusters) {
    const ids = cluster.ids.filter(id => !processedIds.has(String(id)));
    if (ids.length <= 1) continue;

    const members = await Member.find({ _id: { $in: ids } });
    if (members.length <= 1) continue;

    // Rank members
    members.sort((a, b) => {
      const aValidEpic = isValidEpic(a.voterId) ? 100 : 0;
      const bValidEpic = isValidEpic(b.voterId) ? 100 : 0;
      if (aValidEpic !== bValidEpic) return bValidEpic - aValidEpic;

      const aPhoto = a.photo ? 50 : 0;
      const bPhoto = b.photo ? 50 : 0;
      if (aPhoto !== bPhoto) return bPhoto - aPhoto;

      const aConf = a.ocrConfidence || 0;
      const bConf = b.ocrConfidence || 0;
      if (aConf !== bConf) return bConf - aConf;

      return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
    });

    const winner = members[0];
    const losers = members.slice(1);

    for (const loser of losers) {
      if (!winner.mobile && loser.mobile) winner.mobile = loser.mobile;
      if (!winner.altMobile && loser.altMobile) winner.altMobile = loser.altMobile;
      if (!winner.caste && loser.caste) winner.caste = loser.caste;
      if (!winner.houseNumber && loser.houseNumber) winner.houseNumber = loser.houseNumber;
      if (loser.isFavorite && !winner.isFavorite) winner.isFavorite = true;
      if (loser.partyPreference && loser.partyPreference !== 'undecided') winner.partyPreference = loser.partyPreference;
    }

    await winner.save();
    const deleteIds = losers.map(m => m._id);
    await Member.deleteMany({ _id: { $in: deleteIds } });

    for (const m of members) {
      processedIds.add(String(m._id));
    }

    console.log(`Merged: "${winner.name}" (EPIC: ${winner.voterId}, Serial: ${winner.voterSerial}) - Removed ${losers.length} duplicate(s)`);
    removedCount += losers.length;
    mergedCount += 1;
  }

  if (removedCount > 0) {
    try { invalidateMemberData(); } catch(_) {}
  }

  console.log(`\n========================================================`);
  console.log(` DEDUPLICATION COMPLETED:`);
  console.log(` Total clusters merged: ${mergedCount}`);
  console.log(` Total duplicate records deleted: ${removedCount}`);
  console.log(`========================================================\n`);

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Deduplication Error:', err);
  process.exit(1);
});
