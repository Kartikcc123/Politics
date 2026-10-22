const mongoose = require('mongoose');

const uri = 'mongodb+srv://Politic:Shree123@cluster0.lsrvqwd.mongodb.net/test?appName=Cluster0';

async function run() {
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
    const db = mongoose.connection.db;

    // Distinct gramPanchayat
    const gps = await db.collection('members').distinct('gramPanchayat');
    console.log(`Distinct gramPanchayat (${gps.length}):`, gps);

    // Distinct tehsils / samitis
    const tehsils = await db.collection('members').distinct('tehsil');
    console.log(`Distinct tehsils (${tehsils.length}):`, tehsils);

    // Check users collection to see what user was created for Koshithal!
    console.log('\n=== USERS COLLECTION ===');
    const users = await db.collection('users').find({}).toArray();
    console.log(`Found ${users.length} users:`);
    for (const u of users) {
      console.log(`- Username: ${u.username} | Role: ${u.role} | Ward: ${u.ward} | Area: ${u.area} | GP: ${u.gramPanchayat} | Booth: ${u.booth} | Scope: ${JSON.stringify(u.scope || u.assignedWards || u.permissions)}`);
    }

    // Check areas collection
    console.log('\n=== AREAS COLLECTION ===');
    const areas = await db.collection('areas').find({}).limit(50).toArray();
    console.log(`Found ${areas.length} areas sample:`, areas.map(a => `${a.name} (${a.type})`));

    // Search members with regex for 'kosh' or 'कोश' anywhere in all string fields
    console.log('\n=== SEARCHING FOR KOSHITHAL / कोशिथल IN ANY FIELD OF MEMBERS ===');
    const koshMembers = await db.collection('members').find({
      $or: [
        { village: { $regex: 'कोश|kosh', $options: 'i' } },
        { gramPanchayat: { $regex: 'कोश|kosh', $options: 'i' } },
        { address: { $regex: 'कोश|kosh', $options: 'i' } },
        { pollingStation: { $regex: 'कोश|kosh', $options: 'i' } },
        { boothName: { $regex: 'कोश|kosh', $options: 'i' } },
      ]
    }).limit(10).toArray();
    console.log(`Found ${koshMembers.length} sample members with 'कोश' or 'kosh':`);
    for (const m of koshMembers) {
      console.log(m);
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run();
