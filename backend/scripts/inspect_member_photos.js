require('dotenv').config();
const mongoose = require('mongoose');

async function checkMemberPhotos() {
  const mongoUri = process.env.MONGO_URI;
  await mongoose.connect(mongoUri);
  const db = mongoose.connection.db;
  const membersColl = db.collection('members');

  const count = await membersColl.countDocuments();
  console.log(`Total members: ${count}`);

  const withPhoto = await membersColl.countDocuments({
    $or: [
      { photo: { $exists: true, $ne: '' } },
      { photoUrl: { $exists: true, $ne: '' } }
    ]
  });
  console.log(`Members with photo/photoUrl: ${withPhoto}`);

  const samples = await membersColl.find({
    $or: [
      { photo: { $exists: true, $ne: '' } },
      { photoUrl: { $exists: true, $ne: '' } }
    ]
  }).limit(5).toArray();

  console.log('\nSample records with photos:');
  for (const s of samples) {
    console.log({
      name: s.name,
      voterId: s.voterId,
      epicNumber: s.epicNumber,
      photo: s.photo,
      photoUrl: s.photoUrl
    });
  }

  const withoutPhoto = await membersColl.find({
    photo: { $in: ['', null] },
    photoUrl: { $in: ['', null] }
  }).limit(3).toArray();

  if (withoutPhoto.length > 0) {
    console.log('\nSample records WITHOUT photos:');
    for (const s of withoutPhoto) {
      console.log({
        name: s.name,
        voterId: s.voterId,
        partNumber: s.partNumber,
        photo: s.photo,
        photoUrl: s.photoUrl
      });
    }
  }

  await mongoose.disconnect();
}

checkMemberPhotos();
