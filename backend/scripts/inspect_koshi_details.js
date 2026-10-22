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

  const parts = await db.collection('members').distinct('partNumber', query);
  console.log('Distinct partNumbers for कोशी:', parts);

  for (const p of parts) {
    const c = await db.collection('members').countDocuments({ ...query, partNumber: p });
    const s = await db.collection('members').findOne({ ...query, partNumber: p });
    console.log(`Part ${p}: ${c} records | Section: ${s.sectionName} | GP: '${s.gramPanchayat}' | Village: '${s.village}' | Ward: '${s.wardNumber}'`);
  }

  // Check sample names to see what is wrong with the names as mentioned by user:
  // "koshithal ke max name sb glt he to un sb ke name shi kro glt na,e he to sb ke name aqurate kro"
  const sampleVoters = await db.collection('members').find(query).limit(50).toArray();
  console.log('\n--- 50 Sample Koshithal voters (inspecting names) ---');
  for (const m of sampleVoters) {
    console.log(`[${m.voterId}] Name: "${m.name}" | Guardian: "${m.guardianName}" | Age: ${m.age} | Gender: ${m.gender} | Caste: "${m.caste}" | House: "${m.houseNumber}"`);
  }

  await client.close();
}

run().catch(console.error);
