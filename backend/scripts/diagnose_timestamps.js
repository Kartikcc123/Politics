const mongoose = require('mongoose');
const URI = process.env.MONGO_URI || 'mongodb://187.127.173.42:27017/political_crm';

async function test() {
  await mongoose.connect(URI);
  const Member = mongoose.model('Member', new mongoose.Schema({}, { strict: false }));
  
  const sample = await Member.find({ 
    'sourceDocument.file': { $regex: /Ward/i },
    partNumber: { $exists: true, $ne: null, $ne: '' }
  }).limit(5).lean();

  console.log('Sample ward pdf voters with part:');
  for (const s of sample) {
    console.log({
      name: s.name,
      voterId: s.voterId,
      partNumber: s.partNumber,
      voterSerial: s.voterSerial,
      wardNumber: s.wardNumber,
      wardVoterSerial: s.wardVoterSerial,
      hasAssemblyMembership: s.hasAssemblyMembership,
      hasMunicipalMembership: s.hasMunicipalMembership,
      file: s.sourceDocument && s.sourceDocument.file,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      searchExact: s.searchExact
    });
  }

  const timestamps = await Member.aggregate([
    { $match: { 
      'sourceDocument.file': { $regex: /Ward/i },
      partNumber: { $exists: true, $ne: null, $ne: '' }
    } },
    { $group: {
      _id: { $substr: ['$updatedAt', 0, 16] },
      count: { $sum: 1 }
    } },
    { $sort: { count: -1 } }
  ]);
  console.log('Top update timestamps:', timestamps.slice(0, 10));

  process.exit(0);
}
test().catch(e => { console.error(e); process.exit(1); });
