const mongoose = require('mongoose');
const Member = require('../src/models/Member');

async function checkPhotos() {
  await mongoose.connect('mongodb://187.127.173.42:27017/political_crm');
  const countWithPhoto = await Member.countDocuments({ photo: { $exists: true, $ne: '' } });
  const countWithPhotoUrl = await Member.countDocuments({ photoUrl: { $exists: true, $ne: '' } });
  const countWithCardImage = await Member.countDocuments({ cardImage: { $exists: true, $ne: '' } });
  const sample = await Member.findOne({ $or: [{ photo: { $exists: true, $ne: '' } }, { photoUrl: { $exists: true, $ne: '' } }, { cardImage: { $exists: true, $ne: '' } }] });

  console.log({
    countWithPhoto,
    countWithPhotoUrl,
    countWithCardImage,
    sample: sample ? {
      name: sample.name,
      photo: sample.photo ? (sample.photo.startsWith('data:') ? 'base64 data' : sample.photo) : null,
      photoUrl: sample.photoUrl,
      cardImage: sample.cardImage ? (sample.cardImage.startsWith('data:') ? 'base64 data' : sample.cardImage) : null
    } : null
  });

  await mongoose.disconnect();
}
checkPhotos();
