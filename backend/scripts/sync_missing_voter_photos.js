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

  console.log('\n--- Pass 1: Syncing photos and cardImages by EXACT voterId / EPIC ---');
  // Build map of voterId -> { photo, cardImage, ocrCardImage } from all members with photos/cards
  const membersWithPhoto = await Member.find({
    $or: [
      { photo: { $exists: true, $ne: '', $ne: null } },
      { cardImage: { $exists: true, $ne: '', $ne: null } }
    ],
    voterId: { $exists: true, $ne: '', $ne: null }
  }).select('voterId photo cardImage ocrCardImage partNumber voterSerial').lean();

  const voterIdToAsset = new Map();
  for (const m of membersWithPhoto) {
    if (m.voterId) {
      voterIdToAsset.set(m.voterId.trim().toUpperCase(), {
        photo: m.photo || '',
        cardImage: m.cardImage || m.ocrCardImage || '',
        ocrCardImage: m.ocrCardImage || m.cardImage || '',
        partNumber: m.partNumber,
        voterSerial: m.voterSerial
      });
    }
  }
  console.log(`Indexed ${voterIdToAsset.size} unique voterId photo/card assets.`);

  // Find all missing photo or cardImage members
  const missingMembers = await Member.find({
    $or: [
      { photo: { $exists: false } }, { photo: '' }, { photo: null },
      { cardImage: { $exists: false } }, { cardImage: '' }, { cardImage: null }
    ]
  }).select('_id name voterId voterSerial wardVoterSerial houseNumber guardianName relativeName village gramPanchayat photo cardImage').lean();

  let pass1Updated = 0;
  const stillMissing = [];

  for (const m of missingMembers) {
    const epic = m.voterId ? m.voterId.trim().toUpperCase() : '';
    if (epic && voterIdToAsset.has(epic)) {
      const asset = voterIdToAsset.get(epic);
      const updateFields = {};
      if (!m.photo && asset.photo) updateFields.photo = asset.photo;
      if (!m.cardImage && asset.cardImage) updateFields.cardImage = asset.cardImage;
      if (!m.ocrCardImage && asset.ocrCardImage) updateFields.ocrCardImage = asset.ocrCardImage;
      
      if (Object.keys(updateFields).length) {
        await Member.updateOne({ _id: m._id }, { $set: updateFields });
        pass1Updated++;
      }
    } else if (!m.photo) {
      stillMissing.push(m);
    }
  }
  console.log(`Pass 1 complete: Updated ${pass1Updated} voters with photo/card by voterId match!`);
  console.log(`Remaining missing photos: ${stillMissing.length}`);

  console.log('\n--- Pass 2: Syncing photos & cards by Village + Name + Father / House / Serial ---');
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
        $or: [
          { photo: { $exists: true, $ne: '', $ne: null } },
          { cardImage: { $exists: true, $ne: '', $ne: null } }
        ],
        $and: [{ $or: orConditions }]
      }).select('photo cardImage ocrCardImage').lean();

      if (match) {
        const updateFields = {};
        if (!m.photo && match.photo) updateFields.photo = match.photo;
        if (!m.cardImage && (match.cardImage || match.ocrCardImage)) updateFields.cardImage = match.cardImage || match.ocrCardImage;
        if (!m.ocrCardImage && (match.ocrCardImage || match.cardImage)) updateFields.ocrCardImage = match.ocrCardImage || match.cardImage;
        
        if (Object.keys(updateFields).length) {
          await Member.updateOne({ _id: m._id }, { $set: updateFields });
          pass2Updated++;
        }
      }
    }
  }

  console.log(`Pass 2 complete: Updated ${pass2Updated} voters by identity matching!`);

  // Pass 3: For any member with photo URL containing S3 key, derive cardImage if missing
  console.log('\n--- Pass 3: Deriving missing cardImage from photo S3 keys ---');
  let pass3Updated = 0;
  const needCards = await Member.find({
    photo: { $exists: true, $ne: '', $ne: null, $regex: /photo-[A-Za-z0-9_\/]+/ },
    $or: [{ cardImage: { $exists: false } }, { cardImage: '' }, { cardImage: null }]
  }).select('_id photo cardImage').limit(10000).lean();

  for (const m of needCards) {
    if (m.photo && m.photo.includes('-photo-')) {
      const cardUrl = m.photo.replace('-photo-', '-card-');
      await Member.updateOne({ _id: m._id }, { $set: { cardImage: cardUrl, ocrCardImage: cardUrl } });
      pass3Updated++;
    }
  }
  console.log(`Pass 3 complete: Derived ${pass3Updated} missing cardImages!`);

  console.log(`Total newly linked assets: ${pass1Updated + pass2Updated + pass3Updated}`);

  const finalWithPhoto = await Member.countDocuments({ photo: { $exists: true, $ne: '', $ne: null } });
  const finalWithCard = await Member.countDocuments({ cardImage: { $exists: true, $ne: '', $ne: null } });
  console.log(`Final voters with photo: ${finalWithPhoto} / ${totalMembers}`);
  console.log(`Final voters with cardImage: ${finalWithCard} / ${totalMembers}`);

  process.exit(0);
}

syncMissingPhotos().catch(err => {
  console.error('Error during sync:', err);
  process.exit(1);
});
