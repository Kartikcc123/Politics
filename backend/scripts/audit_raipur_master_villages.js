const mongoose = require('mongoose');
const Member = require('../src/models/Member');
const { boothToVillageMap } = require('../src/config/boothToVillageMaster');

async function run() {
  await mongoose.connect('mongodb://187.127.173.42:27017/political_crm');

  // Group boothToVillageMap by Gram Panchayat
  const gps = {};
  for (const [booth, info] of Object.entries(boothToVillageMap)) {
    const gp = info.gramPanchayat;
    const v = info.village;
    if (!gps[gp]) gps[gp] = { villages: {} };
    if (!gps[gp].villages[v]) gps[gp].villages[v] = [];
    gps[gp].villages[v].push(Number(booth));
  }

  const report = [];
  let totalGps = 0;
  let totalVillages = 0;
  let okVillages = 0;
  let pendingVillages = [];

  for (const [gpName, gpData] of Object.entries(gps)) {
    totalGps++;
    const vList = [];

    for (const [vName, booths] of Object.entries(gpData.villages)) {
      totalVillages++;

      // Query database for this exact village
      const count = await Member.countDocuments({
        village: vName
      });

      if (count > 0) {
        okVillages++;
        vList.push({ name: vName, booths: `भाग ${booths.join(', ')}`, count, status: '✅' });
      } else {
        pendingVillages.push({ gp: gpName, village: vName, booths: `भाग ${booths.join(', ')}` });
        vList.push({ name: vName, booths: `भाग ${booths.join(', ')}`, count: 0, status: '❌' });
      }
    }

    const gpCount = await Member.countDocuments({ gramPanchayat: gpName });
    report.push({ gp: gpName, gpCount, villages: vList });
  }

  console.log('========================================================================================');
  console.log(`📊 रायपुर (भाग 1 से 103) - सभी 32 ग्राम पंचायतों और 64 गाँवों की स्थिति:`);
  console.log(`• कुल ग्राम पंचायतें (Total GPs): ${totalGps}`);
  console.log(`• कुल गाँव (Total Villages):     ${totalVillages}`);
  console.log(`• डेटा उपलब्ध गाँव (Working):   ${okVillages} / ${totalVillages} (${((okVillages / totalVillages) * 100).toFixed(1)}%)`);
  console.log(`• पेंडिंग गाँव (Missing/Pending):${pendingVillages.length}`);
  console.log('========================================================================================\n');

  for (const r of report) {
    console.log(`🏢 ग्राम पंचायत: "${r.gp}" (कुल मतदाता: ${r.gpCount.toLocaleString()})`);
    for (const v of r.villages) {
      console.log(`   ${v.status} गाँव: "${v.name}" (${v.booths}) -> ${v.count.toLocaleString()} मतदाता`);
    }
    console.log('----------------------------------------------------------------------------------------');
  }

  if (pendingVillages.length > 0) {
    console.log('\n⚠️ पेंडिंग गाँव:');
    console.log(JSON.stringify(pendingVillages, null, 2));
  } else {
    console.log('\n🎉 रायपुर के सभी 64 गाँवों और 32 ग्राम पंचायतों का डेटा पूरी तरह 100% मौजूद है!');
  }

  process.exit(0);
}

run().catch(console.error);
