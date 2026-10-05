const mongoose = require('mongoose');
const URI = process.env.MONGO_URI || 'mongodb://187.127.173.42:27017/political_crm';

async function test() {
  await mongoose.connect(URI);
  const Member = mongoose.model('Member', new mongoose.Schema({}, { strict: false }));
  
  const raipurW6 = await Member.find({ 
    $or: [{ gramPanchayat: 'रायपुर' }, { village: 'रायपुर' }],
    wardNumber: '6' 
  }).lean();
  console.log('Total Raipur Ward 6 members:', raipurW6.length);

  const partsInW6 = {};
  for (const m of raipurW6) {
    const p = m.partNumber || 'NONE';
    partsInW6[p] = (partsInW6[p] || 0) + 1;
  }
  console.log('Part numbers in Raipur Ward 6:', partsInW6);

  let asmbTrue = 0, asmbFalse = 0;
  for (const m of raipurW6) {
    if (m.hasAssemblyMembership) asmbTrue++;
    else asmbFalse++;
  }
  console.log('hasAssemblyMembership true:', asmbTrue, 'false:', asmbFalse);

  // Check how many have sourceDocument
  const sourceTypes = {};
  for (const m of raipurW6) {
    const src = (m.sourceDocument && m.sourceDocument.file) || (m.sourceDocument && m.sourceDocument.type) || 'NONE';
    sourceTypes[src] = (sourceTypes[src] || 0) + 1;
  }
  console.log('Sources in Raipur Ward 6:', sourceTypes);

  // Look closely at Manisha
  const manisha = await Member.findOne({ voterId: 'SNE1533090' }).lean();
  console.log('Manisha full record:\n', JSON.stringify(manisha, null, 2));

  // Look closely at Parsi Devi
  const parsi = await Member.findOne({ voterId: 'SNE0404822' }).lean();
  console.log('Parsi full record:\n', JSON.stringify(parsi, null, 2));

  // Where did Part 67 come from for Manisha? Let's check part 67 voters in assembly
  const part67Voters = await Member.find({ partNumber: '67' }).limit(5).lean();
  console.log('Part 67 sample voters:', part67Voters.map(v => ({ name: v.name, voterSerial: v.voterSerial, voterId: v.voterId, village: v.village, gramPanchayat: v.gramPanchayat })));

  // Where did Part 54 come from for Parsi Devi? Let's check part 54 voters in assembly
  const part54Voters = await Member.find({ partNumber: '54' }).limit(5).lean();
  console.log('Part 54 sample voters:', part54Voters.map(v => ({ name: v.name, voterSerial: v.voterSerial, voterId: v.voterId, village: v.village, gramPanchayat: v.gramPanchayat })));

  process.exit(0);
}
test().catch(err => {
  console.error(err);
  process.exit(1);
});
