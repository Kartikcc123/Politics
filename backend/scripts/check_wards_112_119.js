const { MongoClient } = require('mongodb');
const uri = 'mongodb+srv://Politic:Shree123@cluster0.lsrvqwd.mongodb.net/test?appName=Cluster0';

async function run() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('test');

  const parts = ['112', '113', '114', '115', '116', '117', '118', '119'];
  for (const p of parts) {
    const s = await db.collection('members').findOne({ partNumber: p });
    console.log(`Part ${p}:`);
    console.log(`  sectionName: ${s.sectionName}`);
    console.log(`  sectionNumber: ${s.sectionNumber}`);
    console.log(`  ward: ${s.ward}, wardNumber: ${s.wardNumber}`);
    console.log(`  pollingStation: ${s.pollingStation}`);
  }

  // Check all distinct wardNumbers across parts 112-119
  const wards = await db.collection('members').distinct('wardNumber', { partNumber: { $in: parts } });
  console.log('Distinct wardNumber in parts 112-119:', wards);

  const secNums = await db.collection('members').distinct('sectionNumber', { partNumber: { $in: parts } });
  console.log('Distinct sectionNumber in parts 112-119:', secNums);

  await client.close();
}

run().catch(console.error);
