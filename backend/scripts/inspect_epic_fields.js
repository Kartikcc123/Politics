const mongoose = require('mongoose');
const URI = process.env.MONGO_URI || 'mongodb://187.127.173.42:27017/political_crm';

async function test() {
  await mongoose.connect(URI);
  const Member = mongoose.model('Member', new mongoose.Schema({}, { strict: false }));
  
  const sample = await Member.findOne({ partNumber: '67', voterSerial: '19', hasAssemblyMembership: true }).lean();
  console.log('Part 67 Serial 19 Nandubai:', {
    _id: sample._id,
    name: sample.name,
    voterId: sample.voterId,
    epicNumber: sample.epicNumber,
    sourceDocument: sample.sourceDocument
  });

  const sample54 = await Member.findOne({ partNumber: '54', voterSerial: '29', hasAssemblyMembership: true }).lean();
  console.log('Part 54 Serial 29 Gopal:', {
    _id: sample54._id,
    name: sample54.name,
    voterId: sample54.voterId,
    epicNumber: sample54.epicNumber,
    sourceDocument: sample54.sourceDocument
  });

  // Check how many total members exist
  const total = await Member.countDocuments();
  console.log('Total members in DB:', total);

  // Check how many have sourceDocument.file starting with Ward No
  const wardCount = await Member.countDocuments({
    'sourceDocument.file': { $regex: /Ward No/i }
  });
  console.log('Total Ward PDF members in DB:', wardCount);

  // Check how many members have sourceDocument.type === 'manual' or no Ward No file
  const assemblyCount = await Member.countDocuments({
    $or: [
      { 'sourceDocument.file': { $exists: false } },
      { 'sourceDocument.file': null },
      { 'sourceDocument.file': { $not: { $regex: /Ward No/i } } }
    ]
  });
  console.log('Total non-Ward-PDF members (Assembly voters) in DB:', assemblyCount);

  process.exit(0);
}
test().catch(e => { console.error(e); process.exit(1); });
