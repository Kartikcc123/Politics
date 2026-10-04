const mongoose = require('mongoose');

async function checkAssemblyPart1() {
  await mongoose.connect('mongodb://187.127.173.42:27017/political_crm');
  const db = mongoose.connection.db;

  const part1Members = await db.collection('members')
    .find({ partNumber: '1', hasAssemblyMembership: true })
    .sort({ voterSerial: 1 })
    .collation({ locale: 'en', numericOrdering: true, strength: 1 })
    .limit(20)
    .project({
      voterSerial: 1,
      name: 1,
      guardianName: 1,
      voterId: 1,
      partNumber: 1,
      wardNumber: 1,
      wardVoterSerial: 1,
      sectionName: 1,
      houseNumber: 1
    })
    .toArray();

  console.log(`Total Part 1 Assembly members in DB: ${await db.collection('members').countDocuments({ partNumber: '1', hasAssemblyMembership: true })}`);
  console.log('First 20 voters in Part 1 sorted by voterSerial:');
  console.log(JSON.stringify(part1Members, null, 2));

  // Check if any voterSerial is missing or duplicated in Part 1
  const serials = await db.collection('members')
    .find({ partNumber: '1', hasAssemblyMembership: true })
    .project({ voterSerial: 1, voterId: 1, name: 1 })
    .toArray();
    
  const serialCounts = {};
  for (const s of serials) {
    serialCounts[s.voterSerial] = (serialCounts[s.voterSerial] || 0) + 1;
  }
  const duplicates = Object.entries(serialCounts).filter(([k, v]) => v > 1);
  console.log(`Part 1 duplicate voterSerial count: ${duplicates.length}`);
  if (duplicates.length > 0) {
    console.log('Sample duplicate serials:', duplicates.slice(0, 10));
  }

  await mongoose.disconnect();
}

checkAssemblyPart1().catch(console.error);
