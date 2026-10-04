const mongoose = require('mongoose');
const Member = require('../src/models/Member');
const fs = require('fs');

async function run() {
  await mongoose.connect('mongodb://187.127.173.42:27017/political_crm');

  const content = fs.readFileSync('./mobile/lib/features/areas/samiti_hierarchy_page.dart', 'utf8');

  // Extract from 'रायपुर': to 'सहाड़ा':
  const raipurSection = content.substring(content.indexOf("'रायपुर':"), content.indexOf("'सहाड़ा':"));

  // Regex to match Panchayats
  const gpBlocks = raipurSection.split(/\s{6,8}'([^']+)':\s*\{\s*\n\s*'wards':/);

  let totalGps = 0;
  let totalVillages = 0;
  let presentVillages = 0;
  let missingVillages = [];
  const results = [];

  for (let i = 1; i < gpBlocks.length; i += 2) {
    const gpName = gpBlocks[i];
    const blockContent = gpBlocks[i + 1];
    totalGps++;

    const villageMatches = [...blockContent.matchAll(/'name':\s*'([^']+)',\s*'parts':\s*'([^']*)'/g)];
    const vList = [];

    for (const vm of villageMatches) {
      const vName = vm[1];
      const parts = vm[2];
      totalVillages++;

      const vRegex = new RegExp(vName.replace(/[\u0901\u0902\u0903\u093C]/g, ''), 'i');
      const count = await Member.countDocuments({
        $or: [
          { village: vRegex },
          { sectionName: vRegex },
          { location: vRegex }
        ]
      });

      if (count > 0) {
        presentVillages++;
        vList.push({ name: vName, parts, count, status: '✅' });
      } else {
        missingVillages.push({ gp: gpName, village: vName, parts });
        vList.push({ name: vName, parts, count: 0, status: '❌' });
      }
    }

    const gpRegex = new RegExp(gpName.replace(/[\u0901\u0902\u0903\u093C]/g, ''), 'i');
    const gpCount = await Member.countDocuments({
      $or: [
        { gramPanchayat: gpRegex },
        { village: gpRegex }
      ]
    });

    results.push({ gp: gpName, gpCount, villages: vList });
  }

  console.log('================================================================================');
  console.log(`📊 रायपुर पंचायत समिति - मोबाइल ऐप के सभी गाँवों का पूर्ण ऑडिट:`);
  console.log(`• कुल ग्राम पंचायतें (GPs):  ${totalGps}`);
  console.log(`• कुल गाँव (Villages):      ${totalVillages}`);
  console.log(`• डेटा उपलब्ध गाँव (Working): ${presentVillages} / ${totalVillages} (${((presentVillages / totalVillages) * 100).toFixed(1)}%)`);
  console.log(`• 0 डेटा वाले गाँव (Missing): ${missingVillages.length}`);
  console.log('================================================================================\n');

  for (const r of results) {
    console.log(`🏢 ग्राम पंचायत: "${r.gp}" -> कुल GP मतदाता: ${r.gpCount}`);
    for (const v of r.villages) {
      console.log(`   ${v.status} गाँव: "${v.name}" (${v.parts}) -> ${v.count} मतदाता`);
    }
    console.log('--------------------------------------------------------------------------------');
  }

  if (missingVillages.length > 0) {
    console.log('\n❌ ये गाँव 0 मतदाता दिखा रहे हैं:');
    console.log(JSON.stringify(missingVillages, null, 2));
  } else {
    console.log('\n🎉 रायपुर के 100% सभी गाँवों का डेटा ऐप और डेटाबेस में पूरी तरह मौजूद और लाइव है!');
  }

  process.exit(0);
}

run().catch(console.error);
