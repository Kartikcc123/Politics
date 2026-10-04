const mongoose = require('mongoose');
const Member = require('../src/models/Member');

async function checkRemaining() {
  await mongoose.connect('mongodb://187.127.173.42:27017/political_crm');
  
  const docs = await Member.find({
    $or: [
      { name: /चूर/i },
      { name: /कहिकया/i }
    ]
  }).select('name voterId gramPanchayat wardNumber wardVoterSerial sourceDocument');
  
  console.log('Remaining docs:', docs);
  process.exit(0);
}

checkRemaining();
