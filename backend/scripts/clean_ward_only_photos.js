const mongoose = require('mongoose');

const URI = process.env.MONGO_URI || 'mongodb://187.127.173.42:27017/political_crm';

async function fixAllWardOnlyPhotos() {
  await mongoose.connect(URI);
  const col = mongoose.connection.db.collection('members');

  const filter = {
    hasAssemblyMembership: { $ne: true },
    $or: [
      { photo: { $exists: true, $ne: '', $ne: null } },
      { cardImage: { $exists: true, $ne: '', $ne: null } },
      { ocrCardImage: { $exists: true, $ne: '', $ne: null } }
    ]
  };

  const count = await col.countDocuments(filter);
  console.log(`Remaining ward-only voters with photo/card: ${count}`);

  if (count > 0) {
    const res = await col.updateMany(
      filter,
      {
        $set: {
          photo: '',
          cardImage: '',
          ocrCardImage: ''
        }
      }
    );
    console.log(`Updated ${res.modifiedCount} records in native collection!`);
  }

  const finalCheck = await col.countDocuments(filter);
  console.log(`Final count of ward-only voters with photo/card: ${finalCheck}`);

  process.exit(0);
}

fixAllWardOnlyPhotos().catch(err => {
  console.error(err);
  process.exit(1);
});
