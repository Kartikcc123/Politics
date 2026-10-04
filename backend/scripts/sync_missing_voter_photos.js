const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });
const Member = require('../src/models/Member');

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function syncMissingPhotos() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  console.log('Connecting to MongoDB...');
  await mongoose.connect(mongoUri);
  console.log('Connected!');

  const totalMembers = await Member.countDocuments();
  const withPhotoCount = await Member.countDocuments({ photo: { $exists: true, $ne: '', $ne: null } });
  const missingCount = await Member.countDocuments({
    $or: [{ photo: { $exists: false } }, { photo: '' }, { photo: null }]
  });

  console.log(`Total voters in DB: ${totalMembers}`);
  console.log(`Voters with photo: ${withPhotoCount}`);
  console.log(`Voters missing photo: ${missingCount}`);

  if (missingCount === 0) {
    console.log('All voters already have photos!');
    process.exit(0);
  }

  console.log('\n--- Pass 1: Syncing photos by EXACT voterId / EPIC ---');
  // Build map of voterId -> photo from all members with photos
  const membersWithPhoto = await Member.find({
    photo: { $exists: true, $ne: '', $ne: null },
    voterId: { $exists: true, $ne: '', $ne: null }
  }).select('voterId photo').lean();

  const voterIdToPhoto = new Map();
  for (const m of membersWithPhoto) {
    if (m.voterId && m.photo) {
      voterIdToPhoto.set(m.voterId.trim().toUpperCase(), m.photo);
    }
  }
  console.log(`Indexed ${voterIdToPhoto.size} unique voterId photos.`);

  // Find all missing photo members
  const missingMembers = await Member.find({
    $or: [{ photo: { $exists: false } }, { photo: '' }, { photo: null }]
  }).select('_id name voterId voterSerial wardVoterSerial houseNumber guardianName relativeName village gramPanchayat').lean();

  let pass1Updated = 0;
  const stillMissing = [];

  for (const m of missingMembers) {
    const epic = m.voterId ? m.voterId.trim().toUpperCase() : '';
    if (epic && voterIdToPhoto.has(epic)) {
      const photoUrl = voterIdToPhoto.get(epic);
      await Member.updateOne({ _id: m._id }, { $set: { photo: photoUrl } });
      pass1Updated++;
    } else {
      stillMissing.push(m);
    }
  }
  console.log(`Pass 1 complete: Updated ${pass1Updated} voters by voterId match!`);
  console.log(`Remaining missing: ${stillMissing.length}`);

  console.log('\n--- Pass 2: Syncing photos by Village + Name + Father / House / Serial ---');
  let pass2Updated = 0;
  let processed = 0;

  for (const m of stillMissing) {
    processed++;
    if (processed % 200 === 0) {
      console.log(`Processed ${processed}/${stillMissing.length}... (Matched: ${pass2Updated})`);
    }

    if (!m.village && !m.gramPanchayat) continue;
    const villageFilter = m.village
      ? { village: new RegExp(`^${escapeRegex(m.village.trim())}$`, 'i') }
      : { gramPanchayat: new RegExp(`^${escapeRegex(m.gramPanchayat.trim())}$`, 'i') };

    const orConditions = [];
    const gName = m.guardianName || m.relativeName;
    if (m.name && gName) {
      const nPrefix = m.name.trim().slice(0, 3);
      const gPrefix = gName.trim().slice(0, 2);
      orConditions.push({
        name: new RegExp(`^${escapeRegex(nPrefix)}`, 'i'),
        $or: [
          { guardianName: new RegExp(`^${escapeRegex(gPrefix)}`, 'i') },
          { relativeName: new RegExp(`^${escapeRegex(gPrefix)}`, 'i') }
        ]
      });
    }
    if (m.name && m.houseNumber) {
      const nPrefix = m.name.trim().slice(0, 3);
      orConditions.push({
        name: new RegExp(`^${escapeRegex(nPrefix)}`, 'i'),
        houseNumber: m.houseNumber
      });
    }

    if (orConditions.length > 0) {
      const match = await Member.findOne({
        ...villageFilter,
        photo: { $exists: true, $ne: '', $ne: null },
        $or: orConditions
      }).select('photo').lean();

      if (match && match.photo) {
        await Member.updateOne({ _id: m._id }, { $set: { photo: match.photo } });
        pass2Updated++;
      }
    }
  }

  console.log(`Pass 2 complete: Updated ${pass2Updated} voters by identity matching!`);
  console.log(`Total newly linked photos: ${pass1Updated + pass2Updated}`);

  const finalWithPhoto = await Member.countDocuments({ photo: { $exists: true, $ne: '', $ne: null } });
  console.log(`Final voters with photo: ${finalWithPhoto} / ${totalMembers}`);

  process.exit(0);
}

syncMissingPhotos().catch(err => {
  console.error('Error during sync:', err);
  process.exit(1);
});
