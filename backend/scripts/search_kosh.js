const { MongoClient } = require('mongodb');
const uri = 'mongodb+srv://Politic:Shree123@cluster0.lsrvqwd.mongodb.net/test?appName=Cluster0';

async function run() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('test');

  console.log('--- Booths in DB ---');
  const booths = await db.collection('booths').find({}).toArray();
  for (const b of booths) {
    console.log(JSON.stringify({ number: b.number, name: b.name, location: b.location, area: b.area, gramPanchayat: b.gramPanchayat }));
  }

  console.log('\n--- Searching sectionName, village, pollingStation, searchText for कोशि ---');
  const query = {
    $or: [
      { sectionName: /कोशि/ },
      { village: /कोशि/ },
      { searchText: /कोशि/ },
      { address: /कोशि/ },
      { sectionName: /kosh/i },
      { village: /kosh/i },
      { searchText: /kosh/i }
    ]
  };
  const count = await db.collection('members').countDocuments(query);
  console.log('Total matches count for कोशि / kosh:', count);

  const matches = await db.collection('members').find(query).limit(10).toArray();
  matches.forEach(m => console.log(JSON.stringify({
    id: m._id,
    name: m.name,
    relativeName: m.relativeName,
    guardianName: m.guardianName,
    partNumber: m.partNumber,
    sectionName: m.sectionName,
    gramPanchayat: m.gramPanchayat,
    village: m.village,
    wardNumber: m.wardNumber,
    panchayatSamitiWard: m.panchayatSamitiWard,
    caste: m.caste
  })));

  // Also search in all existing backend files to see where koshithal was used
  await client.close();
}

run().catch(console.error);
