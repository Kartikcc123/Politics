const mongoose = require('mongoose');

const URI = process.env.MONGO_URI || 'mongodb://187.127.173.42:27017/political_crm';

async function fixWardOnlyPhotos() {
  console.log('Connecting to MongoDB at', URI);
  await mongoose.connect(URI);
  const Member = mongoose.model('Member', new mongoose.Schema({}, { strict: false }));

  console.log('\n--- Checking Ward-Only voters with photos ---');
  const countWithPhoto = await Member.countDocuments({
    hasAssemblyMembership: false,
    $or: [
      { photo: { $exists: true, $ne: '', $ne: null } },
      { cardImage: { $exists: true, $ne: '', $ne: null } },
      { ocrCardImage: { $exists: true, $ne: '', $ne: null } }
    ]
  });
  console.log(`Found ${countWithPhoto} Ward-only voters that have false/borrowed photos or card images.`);

  if (countWithPhoto > 0) {
    const res = await Member.updateMany(
      {
        hasAssemblyMembership: false,
        $or: [
          { photo: { $exists: true, $ne: '', $ne: null } },
          { cardImage: { $exists: true, $ne: '', $ne: null } },
          { ocrCardImage: { $exists: true, $ne: '', $ne: null } }
        ]
      },
      {
        $set: {
          photo: '',
          cardImage: '',
          ocrCardImage: ''
        }
      }
    );
    console.log(`Successfully cleared false photos/cards from ${res.modifiedCount} Ward-only voters!`);
  }

  // Also verify Rameshwar Lal
  const rameshwar = await Member.findOne({ voterId: 'SNE0894899' }).lean();
  console.log('\nRameshwar Lal (SNE0894899) after cleanup:', {
    name: rameshwar?.name,
    voterId: rameshwar?.voterId,
    hasAssemblyMembership: rameshwar?.hasAssemblyMembership,
    hasMunicipalMembership: rameshwar?.hasMunicipalMembership,
    wardNumber: rameshwar?.wardNumber,
    photo: rameshwar?.photo,
    cardImage: rameshwar?.cardImage
  });

  process.exit(0);
}

fixWardOnlyPhotos().catch(err => {
  console.error(err);
  process.exit(1);
});
