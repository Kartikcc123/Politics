const mongoose = require('mongoose');

const uri = 'mongodb+srv://Politic:Shree123@cluster0.lsrvqwd.mongodb.net/test?appName=Cluster0';

async function run() {
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
    const db = mongoose.connection.db;

    // Distinct pollingStation
    const pollingStations = await db.collection('members').distinct('pollingStation');
    console.log(`Distinct pollingStation (${pollingStations.length}):`, pollingStations.slice(0, 30));

    // Search for kos or kosh or कोश or कोस in pollingStation, village, gramPanchayat
    const matches = pollingStations.filter(p => /कोश|कोस|kosh|kosi/i.test(p));
    console.log('Matching pollingStations:', matches);

    // Also check partName
    const partNames = await db.collection('members').distinct('partName');
    console.log(`Distinct partName (${partNames.length}):`, partNames.filter(p => /कोश|कोस|kosh|kosi/i.test(p)));

    // Also check village
    const villages = await db.collection('members').distinct('village');
    console.log(`Distinct villages matching /कोश|कोस|kosh|kosi/i:`, villages.filter(v => /कोश|कोस|kosh|kosi/i.test(v)));

    // Let's check what areas exist with 'सहाडा'
    const sahadaAreas = await db.collection('areas').find({ name: /सहाडा|sahada/i }).toArray();
    console.log('Sahada areas:', sahadaAreas);

    // Let's check what booths exist with 'सहाडा'
    const sahadaBooths = await db.collection('booths').find({ area: /सहाडा|sahada/i }).toArray();
    console.log(`Sahada booths count: ${sahadaBooths.length}`);

    // Let's check users collection again - print full user objects
    const users = await db.collection('users').find({}).toArray();
    console.log('All Users in DB:', JSON.stringify(users, null, 2));

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run();
