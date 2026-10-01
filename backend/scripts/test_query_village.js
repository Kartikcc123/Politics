const mongoose = require('mongoose');

async function test() {
  await mongoose.connect('mongodb://187.127.173.42:27017/political_crm');
  const Member = require('../src/models/Member');

  const c1 = await Member.countDocuments({ village: 'पीथाकाखेड़ा' });
  const c2 = await Member.countDocuments({ gramPanchayat: 'पीथाकाखेड़ा' });
  const c3 = await Member.countDocuments({
    $or: [
      { village: /पीथा/i },
      { gramPanchayat: /पीथा/i },
      { sectionName: /पीथा/i },
      { location: /पीथा/i }
    ]
  });

  console.log('Query Results:');
  console.log('village = "पीथाकाखेड़ा":', c1);
  console.log('gramPanchayat = "पीथाकाखेड़ा":', c2);
  console.log('$or [village, gramPanchayat, sectionName, location]:', c3);

  process.exit(0);
}

test().catch(console.error);
