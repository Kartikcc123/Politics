const mongoose = require('mongoose');

async function inspect() {
  await mongoose.connect('mongodb://187.127.173.42:27017/political_crm');
  const db = mongoose.connection.db;

  // Let's find SNE0151910 from the screenshot
  const doc = await db.collection('members').findOne({ voterId: 'SNE0151910' });
  console.log('SNE0151910 record:', JSON.stringify(doc, null, 2));

  // Let's check how many documents have village/gramPanchayat containing 'भभटा' or 'PartScope'
  const countBhabhataVillage = await db.collection('members').countDocuments({ village: /भभटा/i });
  const countBhabhataGP = await db.collection('members').countDocuments({ gramPanchayat: /भभटा/i });
  const countBhabhataSection = await db.collection('members').countDocuments({ sectionName: /भभटा/i });
  const countPartScopeWard = await db.collection('members').countDocuments({ ward: /PartScope/i });
  const countPartScopeWardNum = await db.collection('members').countDocuments({ wardNumber: /PartScope/i });

  console.log({
    countBhabhataVillage,
    countBhabhataGP,
    countBhabhataSection,
    countPartScopeWard,
    countPartScopeWardNum
  });

  await mongoose.disconnect();
}

inspect().catch(console.error);
