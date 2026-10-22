const { MongoClient } = require('mongodb');
const uri = 'mongodb+srv://Politic:Shree123@cluster0.lsrvqwd.mongodb.net/test?appName=Cluster0';

async function run() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('test');

  const query = {
    $or: [
      { gramPanchayat: /कोशी/ },
      { village: /कोशी/ },
      { sectionName: /कोशी/ },
      { searchText: /कोशी/ },
      { address: /कोशी/ }
    ]
  };

  const count = await db.collection('members').countDocuments(query);
  console.log('Count with बड़ी ई कोशी:', count);

  const sample = await db.collection('members').find(query).limit(20).toArray();
  sample.forEach(m => console.log(JSON.stringify({
    id: m._id,
    name: m.name,
    guardianName: m.guardianName,
    partNumber: m.partNumber,
    gramPanchayat: m.gramPanchayat,
    village: m.village,
    wardNumber: m.wardNumber,
    panchayatSamitiWard: m.panchayatSamitiWard,
    caste: m.caste
  })));

  await client.close();
}

run().catch(console.error);
