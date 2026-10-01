const mongoose = require('mongoose');

async function fixLast3() {
  await mongoose.connect('mongodb://187.127.173.42:27017/political_crm');
  const Member = require('../src/models/Member');

  await Member.updateMany(
    { gramPanchayat: /भींटा/i, $or: [{ village: /सरेवड़ी/i }, { sectionName: /सरेवड़ी/i }] },
    { $set: { location: 'सरेवड़ी का बाड़ीया' } }
  );

  await Member.updateMany(
    { gramPanchayat: /मासिंगपुरा/i, $or: [{ village: /डांग/i }, { sectionName: /डांग/i }] },
    { $set: { location: 'डांगडा' } }
  );

  await Member.updateMany(
    { gramPanchayat: /नारायणखेड़ा/i, $or: [{ village: /खुटि/i }, { sectionName: /खुटि/i }] },
    { $set: { location: 'खुटियांखेड़ा' } }
  );

  console.log('Fixed last 3 micro-hamlets!');
  process.exit(0);
}

fixLast3().catch(console.error);
