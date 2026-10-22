const mongoose = require('mongoose');

const uri = 'mongodb+srv://Politic:Shree123@cluster0.lsrvqwd.mongodb.net/test?appName=Cluster0';

async function run() {
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
    const db = mongoose.connection.db;

    // Check distinct wardNumber across entire members collection
    const allWards = await db.collection('members').distinct('wardNumber');
    console.log(`Distinct wardNumber in members (${allWards.length}):`, allWards);

    const allMunicipalWards = await db.collection('members').distinct('municipalWardNumbers');
    console.log(`Distinct municipalWardNumbers in members (${allMunicipalWards.length}):`, allMunicipalWards);

    const assemblies = await db.collection('members').distinct('assemblyName');
    console.log('Distinct assemblyName:', assemblies);

    const areas = await db.collection('members').distinct('area');
    console.log('Distinct area:', areas);

    const sections = await db.collection('members').distinct('sectionName');
    console.log(`Distinct sectionName (${sections.length}):`, sections.slice(0, 30));

    // Check if 'कोशिथल' or 'koshithal' exists in sectionName, pollingStation, or any text field
    const koshSection = await db.collection('members').find({
      $or: [
        { sectionName: { $regex: 'कोशिथल|koshithal', $options: 'i' } },
        { pollingStation: { $regex: 'कोशिथल|koshithal', $options: 'i' } },
        { partName: { $regex: 'कोशिथल|koshithal', $options: 'i' } },
      ]
    }).limit(5).toArray();
    console.log(`Found ${koshSection.length} members with koshithal in section/pollingStation/partName:`);
    for (const m of koshSection) {
      console.log(`- GP: ${m.gramPanchayat} | Vil: ${m.village} | Sec: ${m.sectionName} | Poll: ${m.pollingStation} | Ward: ${m.wardNumber} | Name: ${m.name}`);
    }

    // Also search in all areas collection for 'कोशिथल' or 'kosh'
    const koshAreas = await db.collection('areas').find({
      name: { $regex: 'कोशिथल|kosh', $options: 'i' }
    }).toArray();
    console.log('Koshithal in areas collection:', koshAreas);

    // Also check booths collection
    const booths = await db.collection('booths').find({}).toArray();
    console.log(`Total booths: ${booths.length}`);
    for (const b of booths) {
      console.log(`- Booth ${b.number}: ${b.name} | GP: ${b.gramPanchayat} | Area: ${b.area}`);
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run();
