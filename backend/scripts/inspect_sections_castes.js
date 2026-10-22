const { MongoClient } = require('mongodb');
const uri = 'mongodb+srv://Politic:Shree123@cluster0.lsrvqwd.mongodb.net/test?appName=Cluster0';

async function run() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('test');

  const parts = ['112', '113', '114', '115', '116', '117', '118', '119'];
  
  // Aggregate sectionNames and counts
  const sections = await db.collection('members').aggregate([
    { $match: { partNumber: { $in: parts } } },
    { $group: { _id: { part: '$partNumber', section: '$sectionName', secNum: '$sectionNumber' }, count: { $sum: 1 } } },
    { $sort: { '_id.part': 1, count: -1 } }
  ]).toArray();

  console.log('Sections in parts 112-119:');
  sections.forEach(s => console.log(`Part ${s._id.part} | Sec ${s._id.secNum} | "${s._id.section}" -> ${s.count} voters`));

  // Also let's inspect castes in parts 112-119
  const castes = await db.collection('members').distinct('caste', { partNumber: { $in: parts } });
  console.log('\nCastes in parts 112-119:', castes);

  // Castes across entire database
  const allCastes = await db.collection('members').distinct('caste');
  console.log('\nAll distinct castes in DB (count ' + allCastes.length + '):', allCastes);

  await client.close();
}

run().catch(console.error);
