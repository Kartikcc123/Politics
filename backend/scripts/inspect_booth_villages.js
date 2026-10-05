const mongoose = require('mongoose');
const MONGO_URI = 'mongodb://187.127.173.42:27017/political_crm';
const Member = require('../src/models/Member');
const Booth = require('../src/models/Booth');

async function check() {
  await mongoose.connect(MONGO_URI);
  
  // Check Booths
  const booths = await Booth.find({}).select('number name nameHi village gramPanchayat').lean();
  console.log(`Total Booths in DB: ${booths.length}`);
  const boothMap = new Map();
  booths.forEach(b => {
    boothMap.set(String(b.number).trim(), b);
  });

  // Check samples of Part 62 to 75
  for (let p = 62; p <= 75; p++) {
    const pStr = String(p);
    const booth = boothMap.get(pStr);
    const voterSample = await Member.findOne({ partNumber: pStr }).select('partNumber village sectionName pollingStationName gramPanchayat').lean();
    console.log(`Part ${p}: Booth Name = "${booth ? (booth.nameHi || booth.name) : 'N/A'}", Booth Village = "${booth?.village}", Voter's village = "${voterSample?.village}", Voter's section = "${voterSample?.sectionName}"`);
  }

  // Check overall how many voters have blank village vs populated
  const blankCount = await Member.countDocuments({ $or: [{ village: '' }, { village: null }, { village: { $exists: false } }] });
  const totalCount = await Member.countDocuments({});
  console.log(`\nTotal Voters: ${totalCount}, Blank Village: ${blankCount}, Populated Village: ${totalCount - blankCount}`);

  await mongoose.disconnect();
}

check().catch(console.error);
