const { MongoClient } = require('mongodb');
const uri = 'mongodb+srv://Politic:Shree123@cluster0.lsrvqwd.mongodb.net/test?appName=Cluster0';

async function run() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('test');

  const parts = ['112', '113', '114', '115', '116', '117', '118', '119'];
  console.log('Total members in parts 112-119:');
  const total = await db.collection('members').countDocuments({ partNumber: { $in: parts } });
  console.log('Total:', total);

  // Check how many have empty GP
  const emptyGp = await db.collection('members').countDocuments({ partNumber: { $in: parts }, gramPanchayat: { $in: ['', null] } });
  console.log('Empty GP count:', emptyGp);

  // Check assembly and tehsil
  const s = await db.collection('members').findOne({ partNumber: { $in: parts } });
  console.log('Sample record details:');
  console.log({
    assemblyName: s.assemblyName,
    assemblyNumber: s.assemblyNumber,
    tehsil: s.tehsil,
    samiti: s.panchayatSamiti,
    gramPanchayat: s.gramPanchayat,
    village: s.village,
    sectionName: s.sectionName,
    sectionNumber: s.sectionNumber
  });

  // Find strange patterns in names and guardians:
  // e.g. names containing digits, punctuation, stray symbols (:, ;, ., ?, !, etc.),
  // common OCR errors (जैसे 'धल' for 'थल', 'बचन्द्र' for 'चन्द्र', 'गुणेश' for 'गणेश', etc.)
  const cursor = db.collection('members').find({ partNumber: { $in: parts } });
  let strangeCount = 0;
  const strangeSamples = [];
  
  while (await cursor.hasNext()) {
    const m = await cursor.next();
    const name = m.name || '';
    const gName = m.guardianName || '';
    
    // Check for weird characters: digits in name, punctuation in name, stray chars
    const hasDigits = /\d/.test(name) || /\d/.test(gName);
    const hasPunctuation = /[:;,.?!@#$%^*()_+=\\/{}\[\]|~`<>"'ः]/.test(name) || /[:;,.?!@#$%^*()_+=\\/{}\[\]|~`<>"'ः]/.test(gName);
    const hasLatin = /[a-zA-Z]/.test(name) || /[a-zA-Z]/.test(gName);
    const hasDoubleVowels = /[ािीुूृेैोौंँ]{2,}/.test(name) || /[ािीुूृेैोौंँ]{2,}/.test(gName);

    if (hasDigits || hasPunctuation || hasLatin || hasDoubleVowels) {
      strangeCount++;
      if (strangeSamples.length < 30) {
        strangeSamples.push({
          id: m._id,
          voterId: m.voterId,
          name,
          guardianName: gName,
          issue: { hasDigits, hasPunctuation, hasLatin, hasDoubleVowels }
        });
      }
    }
  }

  console.log(`Found ${strangeCount} / ${total} with obvious OCR anomalies:`);
  strangeSamples.forEach(s => console.log(JSON.stringify(s)));

  await client.close();
}

run().catch(console.error);
