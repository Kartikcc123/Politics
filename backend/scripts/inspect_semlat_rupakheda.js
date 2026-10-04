const mongoose = require('mongoose');
const Member = require('../src/models/Member');

async function run() {
  await mongoose.connect('mongodb://187.127.173.42:27017/political_crm');

  console.log('Searching for सेमलाट / रूपाखेड़ा in entire DB...');

  const semlatMatches = await Member.find({
    $or: [
      { village: /सेम/i },
      { gramPanchayat: /सेम/i },
      { location: /सेम/i }
    ]
  }).limit(10).lean();

  console.log('Semlat matches in DB:', semlatMatches.length);
  if (semlatMatches.length > 0) {
    console.log('Sample Semlat:', semlatMatches.map(m => ({ village: m.village, gp: m.gramPanchayat, booth: m.partNumber, tehsil: m.tehsil })));
  }

  const rupaMatches = await Member.find({
    $or: [
      { village: /रूपा/i },
      { gramPanchayat: /रूपा/i },
      { location: /रूपा/i }
    ]
  }).limit(10).lean();

  console.log('Rupa matches in DB:', rupaMatches.length);
  if (rupaMatches.length > 0) {
    console.log('Sample Rupa:', rupaMatches.map(m => ({ village: m.village, gp: m.gramPanchayat, booth: m.partNumber, tehsil: m.tehsil })));
  }

  // Check what booths are in the database total
  const allBoothsInDb = await Member.distinct('partNumber');
  console.log('Total distinct booths in DB:', allBoothsInDb.length);
  console.log('Min booth in DB:', Math.min(...allBoothsInDb.map(Number)));
  console.log('Max booth in DB:', Math.max(...allBoothsInDb.map(Number)));

  process.exit(0);
}

run().catch(console.error);
