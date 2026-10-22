const { MongoClient } = require('mongodb');
const uri = 'mongodb+srv://Politic:Shree123@cluster0.lsrvqwd.mongodb.net/test?appName=Cluster0';

async function run() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('test');

  console.log('--- Wards collection ---');
  const wards = await db.collection('wards').find({}).toArray();
  console.log('Total wards:', wards.length);
  for (const w of wards) {
    console.log(JSON.stringify({
      id: w._id,
      wardNumber: w.wardNumber,
      name: w.name,
      area: w.area,
      gramPanchayat: w.gramPanchayat,
      panchayatSamiti: w.panchayatSamiti
    }));
  }

  console.log('\n--- Checking distinct gramPanchayat containing koshithal/कोशिथल ---');
  const gps = await db.collection('members').distinct('gramPanchayat');
  const koshGPs = gps.filter(g => g && (g.includes('कोशि') || g.toLowerCase().includes('kosh')));
  console.log('Matching gramPanchayats:', koshGPs);

  const villages = await db.collection('members').distinct('village');
  const koshVillages = villages.filter(v => v && (v.includes('कोशि') || v.toLowerCase().includes('kosh')));
  console.log('Matching villages:', koshVillages);

  const samitis = await db.collection('members').distinct('panchayatSamiti');
  console.log('Distinct panchayatSamiti:', samitis);

  // Search members in Koshithal
  const query = {
    $or: [
      { gramPanchayat: { $in: koshGPs } },
      { village: { $in: koshVillages } }
    ]
  };
  const count = await db.collection('members').countDocuments(query);
  console.log(`Found ${count} members in Koshithal`);

  const distinctParts = await db.collection('members').distinct('partNumber', query);
  console.log('Distinct partNumbers in Koshithal:', distinctParts);

  const distinctWards = await db.collection('members').distinct('wardNumber', query);
  console.log('Distinct wardNumbers in Koshithal:', distinctWards);

  const sampleMembers = await db.collection('members').find(query).limit(15).toArray();
  console.log('\nSample members:');
  for (const m of sampleMembers) {
    console.log(JSON.stringify({
      id: m._id,
      name: m.name,
      relativeName: m.relativeName,
      epicNumber: m.epicNumber,
      caste: m.caste,
      gramPanchayat: m.gramPanchayat,
      village: m.village,
      wardNumber: m.wardNumber,
      partNumber: m.partNumber,
      panchayatSamitiWard: m.panchayatSamitiWard
    }));
  }

  // Also check users and see what user is assigned to Koshithal
  console.log('\n--- Users with Koshithal or Sahada ---');
  const users = await db.collection('users').find({}).toArray();
  for (const u of users) {
    console.log(JSON.stringify({
      id: u._id,
      name: u.name,
      phone: u.phone,
      role: u.role,
      assignedArea: u.assignedArea,
      assignedGramPanchayat: u.assignedGramPanchayat,
      assignedWard: u.assignedWard,
      assignedWards: u.assignedWards,
      panchayatSamiti: u.panchayatSamiti
    }));
  }

  await client.close();
}

run().catch(console.error);
