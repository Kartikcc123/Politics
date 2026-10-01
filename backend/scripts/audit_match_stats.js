const mongoose = require('mongoose');
const Member = require('../src/models/Member');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://187.127.173.42:27017/political_crm';

async function auditVoterMatchStats() {
  await mongoose.connect(MONGO_URI);
  console.log('MongoDB Connected.\n');

  const panchayats = ['नाथड़ियास', 'पानोतिया', 'पालरा', 'रायपुर', 'सागरेव', 'सुरास', 'थला', 'पीथाकाखेड़ा'];

  console.log('========================================================================================');
  console.log('                 विधानसभा (ASSEMBLY) vs वार्ड (MUNICIPAL/WARD) मिलान रिपोर्ट            ');
  console.log('========================================================================================\n');

  for (const gp of panchayats) {
    const gpRegex = new RegExp(gp, 'i');

    const matchedBoth = await Member.countDocuments({
      gramPanchayat: gpRegex,
      hasAssemblyMembership: true,
      hasMunicipalMembership: true
    });

    const assemblyOnly = await Member.countDocuments({
      gramPanchayat: gpRegex,
      hasAssemblyMembership: true,
      hasMunicipalMembership: { $ne: true }
    });

    const wardOnly = await Member.countDocuments({
      gramPanchayat: gpRegex,
      hasMunicipalMembership: true,
      hasAssemblyMembership: { $ne: true }
    });

    const totalWardVoters = matchedBoth + wardOnly;
    const totalAssemblyVoters = matchedBoth + assemblyOnly;
    const matchPercent = totalWardVoters > 0 ? ((matchedBoth / totalWardVoters) * 100).toFixed(1) : '0';

    console.log(`📌 नगर / ग्राम पंचायत: ${gp.toUpperCase()}`);
    console.log(`   ├─ कुल विधानसभा मतदाता (Assembly Roll): ${totalAssemblyVoters}`);
    console.log(`   ├─ कुल वार्ड मतदाता (Ward Roll):         ${totalWardVoters}`);
    console.log(`   ├─ 🟢 दोनों में मौजूद (Matched in Both):   ${matchedBoth} (${matchPercent}% वार्ड मिलान)`);
    console.log(`   ├─ 🟡 सिर्फ विधानसभा में (Only Assembly): ${assemblyOnly}`);
    console.log(`   └─ 🔵 सिर्फ वार्ड में (Only Ward/New):    ${wardOnly}\n`);
  }

  const grandMatchedBoth = await Member.countDocuments({
    hasAssemblyMembership: true,
    hasMunicipalMembership: true
  });

  const grandWardOnly = await Member.countDocuments({
    hasMunicipalMembership: true,
    hasAssemblyMembership: { $ne: true }
  });

  const grandAssemblyOnly = await Member.countDocuments({
    hasAssemblyMembership: true,
    hasMunicipalMembership: { $ne: true }
  });

  const totalAllWard = grandMatchedBoth + grandWardOnly;

  console.log('========================================================================================');
  console.log(`🌍 कुल डेटाबेस समग्र आंकड़े (GRAND TOTAL OVERALL):`);
  console.log(`   ├─ कुल वार्ड मतदाता (Total Ward Voters):      ${totalAllWard}`);
  console.log(`   ├─ 🟢 दोनों में मौजूद (Both Assembly & Ward):  ${grandMatchedBoth} (${((grandMatchedBoth/totalAllWard)*100).toFixed(1)}%)`);
  console.log(`   ├─ 🔵 सिर्फ वार्ड में (Ward Only / New Added): ${grandWardOnly}`);
  console.log(`   └─ 🟡 सिर्फ विधानसभा में (Assembly Only):      ${grandAssemblyOnly}`);
  console.log('========================================================================================\n');

  await mongoose.disconnect();
}

auditVoterMatchStats().catch(console.error);
