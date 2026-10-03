const mongoose = require('mongoose');
const Member = require('../src/models/Member');

async function cleanGhosts() {
  await mongoose.connect('mongodb://187.127.173.42:27017/political_crm');
  
  // Ghost records criteria:
  // 1. Created from PDF source
  // 2. AND has NO valid voterId (empty, null, or starts with TEMP/GEN)
  const result = await Member.deleteMany({
    'sourceDocument.type': 'pdf',
    $or: [
      { voterId: { $exists: false } },
      { voterId: null },
      { voterId: '' },
      { voterId: { $regex: /^TEMP_/i } },
      { voterId: { $regex: /^GEN_/i } }
    ]
  });
  
  console.log('Deleted mangled ghost PDF records:', result.deletedCount);
  
  const remainingGhosts = await Member.countDocuments({
    $or: [
      { name: /चूर/i },
      { name: /कहिकया/i }
    ]
  });
  console.log('Remaining mangled name samples:', remainingGhosts);

  process.exit(0);
}

cleanGhosts();
