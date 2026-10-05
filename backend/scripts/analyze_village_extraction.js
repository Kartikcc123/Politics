const mongoose = require('mongoose');
const MONGO_URI = 'mongodb://187.127.173.42:27017/political_crm';
const Member = require('../src/models/Member');

async function analyzeVillageResolution() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to DB');

  // Let's sample sections across various parts
  const sections = await Member.aggregate([
    { $match: { sectionName: { $nin: ['', null, 'undefined'] } } },
    { $group: {
      _id: '$sectionName',
      partNumbers: { $addToSet: '$partNumber' },
      currentVillages: { $addToSet: '$village' },
      count: { $sum: 1 }
    } },
    { $sort: { count: -1 } },
    { $limit: 40 }
  ]);

  console.log('Top 40 Section Names and their current Villages:');
  sections.forEach(s => {
    // Extract candidate village from sectionName (usually after comma)
    let candidate = '';
    const raw = String(s._id).trim();
    if (raw.includes(',')) {
      const parts = raw.split(',');
      candidate = parts[parts.length - 1].trim();
    } else if (raw.includes('-')) {
      const parts = raw.split('-');
      candidate = parts[parts.length - 1].trim();
    } else {
      candidate = raw;
    }
    // Clean up trailing garbage or dates if any
    candidate = candidate.replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').trim();

    console.log(`Section: "${s._id}" (Count: ${s.count}, Parts: [${s.partNumbers.slice(0, 3).join(', ')}])`);
    console.log(`   -> Current Villages in DB: [${s.currentVillages.join(', ')}]`);
    console.log(`   -> Extracted Village Candidate: "${candidate}"\n`);
  });

  await mongoose.disconnect();
}

analyzeVillageResolution().catch(console.error);
