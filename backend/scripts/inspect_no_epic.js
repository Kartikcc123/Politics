const { MongoClient } = require('mongodb');
const uri = 'mongodb+srv://Politic:Shree123@cluster0.lsrvqwd.mongodb.net/?appName=Cluster0';

async function test() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('test');
  const gpsWithCastes = await db.collection('members').aggregate([
    { $match: { caste: { $nin: ['', null] } } },
    { $group: { _id: '$gramPanchayat', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]).toArray();
  console.log('GPs with populated caste (top 15):');
  console.log(gpsWithCastes.slice(0, 15));
  await client.close();
}
test().catch(console.error);
