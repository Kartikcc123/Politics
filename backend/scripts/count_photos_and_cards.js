const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });
const Member = require('../src/models/Member');

async function run() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  const total = await Member.countDocuments();
  const withPhoto = await Member.countDocuments({ photo: { $exists: true, $ne: '', $ne: null } });
  const withCard = await Member.countDocuments({
    $or: [
      { cardImage: { $exists: true, $ne: '', $ne: null } },
      { ocrCardImage: { $exists: true, $ne: '', $ne: null } }
    ]
  });
  const photoWithoutCard = await Member.countDocuments({
    photo: { $exists: true, $ne: '', $ne: null },
    $and: [
      { $or: [{ cardImage: { $exists: false } }, { cardImage: '' }, { cardImage: null }] },
      { $or: [{ ocrCardImage: { $exists: false } }, { ocrCardImage: '' }, { ocrCardImage: null }] }
    ]
  });
  const noPhotoNoCard = await Member.countDocuments({
    $and: [
      { $or: [{ photo: { $exists: false } }, { photo: '' }, { photo: null }] },
      { $or: [{ cardImage: { $exists: false } }, { cardImage: '' }, { cardImage: null }] },
      { $or: [{ ocrCardImage: { $exists: false } }, { ocrCardImage: '' }, { ocrCardImage: null }] }
    ]
  });

  const assemblyTotal = await Member.countDocuments({
    $or: [
      { sourceFile: { $regex: /part|assembly|vidhan|AC/i } },
      { sourceFile: { $not: /ward/i } }
    ]
  });
  const wardTotal = await Member.countDocuments({
    sourceFile: { $regex: /ward/i }
  });

  // Sample photoWithoutCard members
  const samples = await Member.find({
    photo: { $exists: true, $ne: '', $ne: null },
    $and: [
      { $or: [{ cardImage: { $exists: false } }, { cardImage: '' }, { cardImage: null }] },
      { $or: [{ ocrCardImage: { $exists: false } }, { ocrCardImage: '' }, { ocrCardImage: null }] }
    ]
  }).select('name voterId photo sourceFile').limit(5).lean();

  console.log(JSON.stringify({
    total,
    withPhoto,
    withCard,
    photoWithoutCard,
    noPhotoNoCard,
    assemblyTotal,
    wardTotal,
    samples
  }, null, 2));
  process.exit(0);
}
run();
