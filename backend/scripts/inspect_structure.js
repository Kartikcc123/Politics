const { MongoClient } = require('mongodb');
const uri = 'mongodb+srv://Politic:Shree123@cluster0.lsrvqwd.mongodb.net/test?appName=Cluster0';

async function run() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('test');

  console.log('--- Sample Areas ---');
  const areas = await db.collection('areas').find({}).limit(20).toArray();
  for (const a of areas) {
    console.log(JSON.stringify(a));
  }

  console.log('\n--- Searching Areas for Koshithal / Sahada ---');
  const matchedAreas = await db.collection('areas').find({
    $or: [
      { name: /कोशि/ },
      { name: /kosh/i },
      { name: /सहाडा/ },
      { name: /sahada/i },
      { tehsil: /सहाडा/ },
      { samiti: /सहाडा/ }
    ]
  }).toArray();
  console.log('Matched areas count:', matchedAreas.length);
  matchedAreas.forEach(a => console.log(JSON.stringify(a)));

  console.log('\n--- Sample Booths ---');
  const booths = await db.collection('booths').find({}).limit(20).toArray();
  booths.forEach(b => console.log(JSON.stringify(b)));

  console.log('\n--- Sample Members ---');
  const sampleMembers = await db.collection('members').find({}).limit(5).toArray();
  sampleMembers.forEach(m => console.log(JSON.stringify(m)));

  console.log('\n--- Checking members text search for कोशिथल ---');
  const koshMembers = await db.collection('members').find({
    $or: [
      { address: /कोशिथल/ },
      { pollingStation: /कोशिथल/ },
      { area: /कोशिथल/ },
      { assembly: /सहाडा/ },
      { tehsil: /सहाडा/ },
      { name: /कोशिथल/ }
    ]
  }).limit(5).toArray();
  console.log('Matched koshMembers count (sample):', koshMembers.length);
  koshMembers.forEach(m => console.log(JSON.stringify(m)));

  await client.close();
}

run().catch(console.error);
