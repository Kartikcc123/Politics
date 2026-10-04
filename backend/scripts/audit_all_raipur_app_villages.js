const mongoose = require('mongoose');
const Member = require('../src/models/Member');
const fs = require('fs');

async function run() {
  await mongoose.connect('mongodb://187.127.173.42:27017/political_crm');
  console.log('Connected to DB');

  // Read samiti_hierarchy_page.dart
  const dartContent = fs.readFileSync('./mobile/lib/features/areas/samiti_hierarchy_page.dart', 'utf8');

  // Extract रायपुर block
  const raipurMatch = dartContent.match(/'रायपुर':\s*\{[\s\S]*?'panchayats':\s*\{([\s\S]*?)\n\s*\},/);
  if (!raipurMatch) {
    console.error('Could not find Raipur block in samiti_hierarchy_page.dart');
    process.exit(1);
  }

  // Parse all GPs and villages in Raipur
  const gpRegex = /'([^']+)':\s*\{\s*'wards':\s*\d+,\s*'pop':\s*\d+,\s*'villages':\s*\[([\s\S]*?)\]\s*\}/g;
  let match;
  const report = [];
  let totalGp = 0;
  let totalVillages = 0;
  let successVillages = 0;
  let zeroVillages = [];

  while ((match = gpRegex.exec(raipurMatch[1])) !== null) {
    const gpName = match[1];
    const villagesBlock = match[2];
    totalGp++;

    const vRegex = /'name':\s*'([^']+)',\s*'parts':\s*'([^']*)'/g;
    let vMatch;
    const gpVillages = [];

    while ((vMatch = vRegex.exec(villagesBlock)) !== null) {
      const vName = vMatch[1];
      const partsStr = vMatch[2];
      totalVillages++;

      // Query database for this village
      const vFlexibleRegex = new RegExp(vName.replace(/[\u0901\u0902\u0903\u093C]/g, ''), 'i');
      const count = await Member.countDocuments({
        $or: [
          { village: vFlexibleRegex },
          { sectionName: vFlexibleRegex },
          { location: vFlexibleRegex }
        ]
      });

      if (count > 0) {
        successVillages++;
        gpVillages.push({ name: vName, parts: partsStr, count, status: '✅' });
      } else {
        zeroVillages.push({ gp: gpName, village: vName, parts: partsStr });
        gpVillages.push({ name: vName, parts: partsStr, count: 0, status: '❌' });
      }
    }

    // GP Total count
    const gpFlexibleRegex = new RegExp(gpName.replace(/[\u0901\u0902\u0903\u093C]/g, ''), 'i');
    const gpCount = await Member.countDocuments({
      $or: [
        { gramPanchayat: gpFlexibleRegex },
        { village: gpFlexibleRegex }
      ]
    });

    report.push({
      gp: gpName,
      gpCount,
      villages: gpVillages
    });
  }

  console.log('\n========================================================================================');
  console.log(`📊 रायपुर पंचायत समिति - सभी ग्राम पंचायतों और गाँवों की स्थिति ऑडिट:`);
  console.log(`• कुल ग्राम पंचायतें (Total GPs): ${totalGp}`);
  console.log(`• कुल गाँव (Total Villages):     ${totalVillages}`);
  console.log(`• डेटा उपलब्ध गाँव (Working):   ${successVillages} / ${totalVillages} (${((successVillages/totalVillages)*100).toFixed(1)}%)`);
  console.log(`• 0 डेटा वाले गाँव (Zero Count): ${zeroVillages.length}`);
  console.log('========================================================================================\n');

  for (const gp of report) {
    console.log(`🏢 ग्राम पंचायत: "${gp.gp}" (कुल GP मतदाता: ${gp.gpCount})`);
    for (const v of gp.villages) {
      console.log(`   ${v.status} गाँव: "${v.name}" (${v.parts}) -> ${v.count} मतदाता`);
    }
    console.log('----------------------------------------------------------------------------------------');
  }

  if (zeroVillages.length > 0) {
    console.log('\n⚠️ 0 मतदाता वाले गाँव सूची:');
    console.log(JSON.stringify(zeroVillages, null, 2));
  } else {
    console.log('\n🎉 रायपुर के सभी गाँवों का डेटा सफलतापूर्वक 100% लोड हो रहा है!');
  }

  process.exit(0);
}

run().catch(console.error);
