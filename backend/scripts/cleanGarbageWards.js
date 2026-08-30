require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../src/config/db');
const Ward = require('../src/models/Ward');
const Area = require('../src/models/Area');

async function cleanGarbageAssemblies() {
  console.log('--- Cleaning Garbage Test Assemblies from Database ---');
  await connectDB();

  const junkRegex = /FeTST|TeTST|TST|aaa:|test/i;

  const wards = await Ward.find({});
  let deletedWardsCount = 0;
  for (const w of wards) {
    const hasDevanagari = /[\u0900-\u097F]/.test(w.name);
    if (junkRegex.test(w.name) || !hasDevanagari || w.name.includes('aaa')) {
      await Ward.deleteOne({ _id: w._id });
      deletedWardsCount++;
    }
  }

  const areas = await Area.find({ type: 'assembly' });
  let deletedAreasCount = 0;
  for (const a of areas) {
    const hasDevanagari = /[\u0900-\u097F]/.test(a.name);
    if (junkRegex.test(a.name) || !hasDevanagari || a.name.includes('aaa')) {
      await Area.deleteOne({ _id: a._id });
      deletedAreasCount++;
    }
  }

  console.log(`Deleted ${deletedWardsCount} junk Wards from MongoDB.`);
  console.log(`Deleted ${deletedAreasCount} junk Areas from MongoDB.`);

  const remainingWards = await Ward.find({});
  console.log('\n--- Remaining Active Assemblies ---');
  remainingWards.forEach(w => console.log(`- [${w.number}] ${w.name}`));

  await mongoose.disconnect();
  process.exit(0);
}

cleanGarbageAssemblies().catch(err => {
  console.error('Cleanup Error:', err);
  process.exit(1);
});
