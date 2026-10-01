const mongoose = require('mongoose');

async function mapMicroHamlets() {
  await mongoose.connect('mongodb://187.127.173.42:27017/political_crm');
  console.log('Connected to MongoDB');
  const Member = require('../src/models/Member');

  const mappings = [
    { targetVillage: 'रूपाखेड़ा', matchQuery: { gramPanchayat: /भींटा/i, village: /सेमलाट/i } },
    { targetVillage: 'सरेवड़ी का बाड़ीया', matchQuery: { gramPanchayat: /भींटा/i, village: /सरेवड़ी/i } },
    { targetVillage: 'पचातरों का खेड़ा', matchQuery: { gramPanchayat: /गल्यावड़ी/i } },
    { targetVillage: 'नान्दूड़ा', matchQuery: { gramPanchayat: /खाखरमाला/i } },
    { targetVillage: 'लाठियाखेड़ी', matchQuery: { gramPanchayat: /गलवा/i } },
    { targetVillage: 'डांगडा', matchQuery: { gramPanchayat: /मासिंगपुरा/i, village: /डांगडी/i } },
    { targetVillage: 'अंजनगढ़', matchQuery: { gramPanchayat: /बागोलिया/i } },
    { targetVillage: 'नयाखेड़ा जाटान', matchQuery: { gramPanchayat: /सगरेव/i } },
    { targetVillage: 'आम्बाखेड़ा', matchQuery: { gramPanchayat: /नारायणखेड़ा/i } },
    { targetVillage: 'खुटियांखेड़ा', matchQuery: { gramPanchayat: /नारायणखेड़ा/i, village: /खुटियां/i } },
    { targetVillage: 'जलामली', matchQuery: { gramPanchayat: /बागड़/i } }
  ];

  for (const m of mappings) {
    const res = await Member.updateMany(
      m.matchQuery,
      { $set: { location: m.targetVillage } }
    );
    console.log(`Linked micro-hamlet "${m.targetVillage}" -> Updated ${res.modifiedCount} voters.`);
  }

  console.log('All micro-hamlets linked!');
  process.exit(0);
}

mapMicroHamlets().catch(console.error);
