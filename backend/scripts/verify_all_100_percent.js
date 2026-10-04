const mongoose = require('mongoose');
const official29 = require('../src/config/raipurOfficial29Panchayats.json');

async function checkAll() {
  await mongoose.connect('mongodb://187.127.173.42:27017/political_crm');
  const Member = require('../src/models/Member');
  let zeroCount = 0;
  let totalVillages = 0;

  for (const gp of official29) {
    for (const vObj of gp.villages) {
      const vName = typeof vObj === 'string' ? vObj : (vObj.name || vObj.village || '');
      if (!vName) continue;
      totalVillages++;
      const vRegex = new RegExp(vName.split('').join('\\s*'), 'i');
      const count = await Member.countDocuments({
        $or: [
          { village: vRegex },
          { gramPanchayat: vRegex },
          { sectionName: vRegex },
          { location: vRegex }
        ]
      });
      if (count === 0) {
        zeroCount++;
        console.log('Zero village:', gp.name, vName);
      }
    }
  }
  console.log('=============================================================');
  console.log('📊 FINAL AUDIT RESULT ACROSS ALL 29 PANCHAYATS & VILLAGES:');
  console.log('• Total Audited Villages:  ', totalVillages);
  console.log('• Active Villages Found:   ', totalVillages - zeroCount);
  console.log('• Zero Count Villages:     ', zeroCount);
  console.log('• Coverage Success Rate:   ', (((totalVillages - zeroCount) / totalVillages) * 100).toFixed(1) + '%');
  console.log('=============================================================');
  process.exit(0);
}

checkAll().catch(console.error);
