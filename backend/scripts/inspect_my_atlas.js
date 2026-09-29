const mongoose = require('mongoose');

const uri = 'mongodb+srv://Politic:Shree123@cluster0.lsrvqwd.mongodb.net/test?retryWrites=true&w=majority';

async function inspectAtlas() {
  console.log('========================================================================');
  console.log('🔍 CHECKING YOUR MONGODB ATLAS CLUSTER DATA');
  console.log('========================================================================\n');

  console.log('Connecting to Atlas...');
  await mongoose.connect(uri);
  console.log('✅ Connected successfully!\n');

  const db = mongoose.connection.db;
  const count = await db.collection('members').countDocuments();
  console.log(`📊 Total Voters in Atlas: ${count.toLocaleString()}\n`);

  console.log('👤 First 5 Voter Samples from Atlas:');
  const sample = await db.collection('members').find().limit(5).toArray();
  sample.forEach((v, i) => {
    console.log(`   ${i + 1}. नाम: ${v.name || '-'} | पिता/पति: ${v.guardianName || '-'} | भाग संख्या: ${v.partNumber || '-'} | गाँव: ${v.village || '-'} | EPIC: ${v.voterId || '-'}`);
  });

  console.log('\n========================================================================\n');
  await mongoose.disconnect();
}

inspectAtlas().catch(e => console.error('Error:', e.message));
