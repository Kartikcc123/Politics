const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });
const Member = require('../src/models/Member');

async function test() {
  await mongoose.connect(process.env.MONGO_URI);
  const count = await Member.countDocuments();
  console.log('Total voters:', count);
  const withPhoto = await Member.countDocuments({ photo: { $exists: true, $ne: '', $ne: null } });
  console.log('With photo:', withPhoto);
  const sample = await Member.find({ photo: { $exists: true, $ne: '', $ne: null } }).limit(5).lean();
  console.log('Sample with photos:', sample.map(s => ({ name: s.name, voterId: s.voterId, photo: s.photo })));
  const byName = await Member.find({ name: /मीना/ }).limit(3).lean();
  console.log('Meena sample:', byName.map(s => ({ name: s.name, voterId: s.voterId, photo: s.photo })));
  process.exit(0);
}
test();
