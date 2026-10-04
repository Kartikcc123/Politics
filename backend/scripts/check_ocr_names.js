const mongoose = require('mongoose');

async function checkAssemblyFields() {
  await mongoose.connect('mongodb://187.127.173.42:27017/political_crm');
  const Member = mongoose.model('Member', new mongoose.Schema({}, { strict: false }));

  // Check how many touched assembly members have ocrValues with name
  const withRawName = await Member.countDocuments({ 'ocrValues.raw.name': { $exists: true, $ne: '' } });
  const withVerifiedName = await Member.countDocuments({ 'ocrValues.verified.name': { $exists: true, $ne: '' } });
  const withSuggestedName = await Member.countDocuments({ 'ocrValues.suggested.name': { $exists: true, $ne: '' } });
  const withCardImage = await Member.countDocuments({ hasAssemblyMembership: true, cardImage: { $exists: true, $ne: '' } });
  
  console.log({ withRawName, withVerifiedName, withSuggestedName, withCardImage });

  // Sample with raw name if any
  if (withRawName > 0) {
    const s = await Member.findOne({ 'ocrValues.raw.name': { $exists: true, $ne: '' } });
    console.log('Sample with raw name:', s.toObject());
  }

  // Let's check a sample of assembly members from Sahara part 2 (Bhita), part 56 (Thala), etc.
  const sampleP2 = await Member.find({ partNumber: '2' }).limit(5);
  console.log('\nPart 2 samples:');
  sampleP2.forEach(m => console.log({ epic: m.get('voterId'), name: m.get('name'), guardian: m.get('guardianName'), serial: m.get('voterSerial'), wardSerial: m.get('wardVoterSerial') }));

  const sampleP56 = await Member.find({ partNumber: '56' }).limit(5);
  console.log('\nPart 56 samples:');
  sampleP56.forEach(m => console.log({ epic: m.get('voterId'), name: m.get('name'), guardian: m.get('guardianName'), serial: m.get('voterSerial'), wardSerial: m.get('wardVoterSerial') }));

  await mongoose.disconnect();
}

checkAssemblyFields().catch(console.error);
