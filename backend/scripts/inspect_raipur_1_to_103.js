const mongoose = require('mongoose');
const MONGO_URI = 'mongodb://187.127.173.42:27017/political_crm';
const Member = require('../src/models/Member');

async function inspectRaipurParts() {
  await mongoose.connect(MONGO_URI);
  
  // Aggregate parts 1 to 103
  for (let p = 1; p <= 103; p++) {
    const pStr = String(p);
    const sections = await Member.aggregate([
      { $match: { partNumber: pStr } },
      { $group: {
        _id: '$sectionName',
        villages: { $addToSet: '$village' },
        gramPanchayats: { $addToSet: '$gramPanchayat' },
        count: { $sum: 1 }
      } },
      { $sort: { count: -1 } }
    ]);

    const totalVoters = sections.reduce((acc, s) => acc + s.count, 0);
    if (totalVoters > 0) {
      console.log(`\n=== PART ${p} (Total: ${totalVoters}) ===`);
      sections.slice(0, 3).forEach(s => {
        console.log(`  Section: "${s._id}" (${s.count}) | Current Village: [${s.villages.join(', ')}] | GP: [${s.gramPanchayats.join(', ')}]`);
      });
    }
  }

  await mongoose.disconnect();
}

inspectRaipurParts().catch(console.error);
