const mongoose = require('mongoose');
const URI = process.env.MONGO_URI || 'mongodb://187.127.173.42:27017/political_crm';

async function test() {
  await mongoose.connect(URI);
  const Member = mongoose.model('Member', new mongoose.Schema({}, { strict: false }));
  
  const wardPdfVoters = await Member.find({ 
    'sourceDocument.file': { $regex: /Ward/i } 
  }).lean();
  console.log('Total voters created from Ward PDFs:', wardPdfVoters.length);

  let hasPart = 0;
  let noPart = 0;
  let hasAssemblyTrue = 0;
  let hasAssemblyFalse = 0;

  for (const v of wardPdfVoters) {
    if (v.partNumber) hasPart++;
    else noPart++;
    if (v.hasAssemblyMembership) hasAssemblyTrue++;
    else hasAssemblyFalse++;
  }
  console.log('Ward PDF voters: with partNumber:', hasPart, 'without partNumber:', noPart);
  console.log('Ward PDF voters: hasAssemblyMembership true:', hasAssemblyTrue, 'false:', hasAssemblyFalse);

  // Check how many of these Ward PDF voters actually match a REAL Assembly voter with the same EPIC:
  const epics = wardPdfVoters.map(v => v.voterId).filter(Boolean);
  const assemblyMatches = await Member.find({
    voterId: { $in: epics },
    'sourceDocument.file': { $not: { $regex: /Ward/i } },
    hasAssemblyMembership: true
  }).lean();
  console.log('Of those EPICs, how many exist as separate Assembly voters in DB:', assemblyMatches.length);

  process.exit(0);
}
test().catch(e => { console.error(e); process.exit(1); });
