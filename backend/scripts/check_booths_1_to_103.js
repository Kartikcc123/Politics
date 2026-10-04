const mongoose = require('mongoose');
const Member = require('../src/models/Member');
const { boothToVillageMap } = require('../src/config/boothToVillageMaster');

async function run() {
  await mongoose.connect('mongodb://187.127.173.42:27017/political_crm');
  console.log('Connected to DB');

  const presentBooths = [];
  const missingBooths = [];
  let totalVoters = 0;

  for (let i = 1; i <= 103; i++) {
    const partQueries = [
      { partNumber: String(i) },
      { partNumber: i }
    ];
    const count = await Member.countDocuments({ $or: partQueries });
    const info = boothToVillageMap[i] || { village: 'अज्ञात', gramPanchayat: 'अज्ञात' };

    if (count > 0) {
      presentBooths.push({ booth: i, count, village: info.village, gp: info.gramPanchayat });
      totalVoters += count;
    } else {
      missingBooths.push({ booth: i, village: info.village, gp: info.gramPanchayat });
    }
  }

  console.log('========================================================================');
  console.log(`📊 1 से 103 बूथों की स्थिति:`);
  console.log(`✅ मौजूद बूथ (Present Booths): ${presentBooths.length} / 103`);
  console.log(`⏳ छूटे हुए बूथ (Missing/Pending Booths): ${missingBooths.length} / 103`);
  console.log(`👥 कुल मतदाता (Total Voters in 1-103): ${totalVoters.toLocaleString()}`);
  console.log('========================================================================\n');

  if (missingBooths.length > 0) {
    console.log('⚠️ ये बूथ डेटाबेस में नहीं मिले (Missing Booths):');
    missingBooths.forEach(b => {
      console.log(`   - भाग ${String(b.booth).padStart(3, ' ')}: गाँव "${b.village}" (ग्राम पंचायत: ${b.gp})`);
    });
  } else {
    console.log('🎉 सभी 1 से 103 बूथ डेटाबेस में मौजूद हैं!');
  }

  process.exit(0);
}

run().catch(console.error);
