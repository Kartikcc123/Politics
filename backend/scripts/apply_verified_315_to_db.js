const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const masterPath = path.join(__dirname, '../src/config/official_315_verified_master.json');

const NAME_FIXES = {
  'bagtu': 'बगतु',
  'somal': 'सोमल',
  'shetan': 'शैतान',
  'Anavar': 'अनवर',
  'OKANR': 'ओंकार',
  'ASOO': 'आसू',
  'manhor': 'मनोहर',
  'Keurig': 'केसरी',
  'GAUPU': 'गोपू',
  'mauhani': 'मोहनी',
  'sojiram': 'सोजीराम',
  'shivranjeet': 'शिवरणजीत',
  'satyprakash': 'सत्यप्रकाश',
  'parsmal': 'पारसमल',
  'mithulal': 'मीठूलाल',
  'kelash': 'कैलाश',
  'Enkalig': 'एकलिंग',
  'debilal': 'देवीलाल',
  'Gangga': 'गंगा',
  'balkishan': 'बालकिशन',
  'Hajrudin': 'हजरुद्दीन',
  'prsram': 'परसराम',
  'preamchand': 'प्रेमचंद',
  'Kailasagiri': 'कैलाशगिरी'
};

async function main() {
  if (!fs.existsSync(masterPath)) {
    console.error(`Master file not found at ${masterPath}! Waiting for generator to finish...`);
    process.exit(1);
  }

  const master = JSON.parse(fs.readFileSync(masterPath, 'utf-8'));
  console.log(`Loaded verified master data for ${Object.keys(master).length} parts.`);

  await mongoose.connect('mongodb://187.127.173.42:27017/political_crm');
  console.log('Connected to MongoDB.');
  const db = mongoose.connection.db;

  // 1. Update booths collection
  console.log('\n--- 1. Updating Booths Collection ---');
  let boothUpdates = 0;
  for (let p = 1; p <= 315; p++) {
    const d = master[p] || master[String(p)];
    if (!d) continue;

    await db.collection('booths').updateOne(
      { number: String(p) },
      {
        $set: {
          number: String(p),
          name: d.label,
          village: d.village,
          area: d.village,
          address: d.building,
          building: d.building,
          tehsil: d.tehsil,
          assemblyNumber: '179',
          assemblyName: 'सहाड़ा',
          active: true,
          updatedAt: new Date()
        },
        $setOnInsert: { createdAt: new Date() }
      },
      { upsert: true }
    );
    boothUpdates++;
  }
  console.log(`Updated ${boothUpdates} booths in database.`);

  // 2. Update members collection per part (Standard Assembly Voters)
  console.log('\n--- 2. Updating Members Village & Booth Metadata ---');
  let totalMembersUpdated = 0;

  for (let p = 1; p <= 315; p++) {
    const d = master[p] || master[String(p)];
    if (!d) continue;

    const res = await db.collection('members').updateMany(
      { partNumber: String(p) },
      {
        $set: {
          village: d.village,
          mukhyaGram: d.village,
          tehsil: d.tehsil,
          boothName: d.label
        }
      }
    );

    totalMembersUpdated += res.modifiedCount;
    if (p % 50 === 0 || p === 315) {
      console.log(`Part ${p} complete: ${res.matchedCount} voters matched, ${res.modifiedCount} updated.`);
    }
  }
  console.log(`Total voter records updated with verified village names: ${totalMembersUpdated}`);

  // 3. Clean up non-Hindi / broken English names across all non-Raipur voters
  console.log('\n--- 3. Cleaning Up Non-Hindi & English Names ---');
  let nameFixesApplied = 0;
  for (const [bad, good] of Object.entries(NAME_FIXES)) {
    const r1 = await db.collection('members').updateMany(
      { relativeName: bad },
      { $set: { relativeName: good, guardianName: good } }
    );
    const r2 = await db.collection('members').updateMany(
      { name: bad },
      { $set: { name: good } }
    );
    if (r1.modifiedCount > 0 || r2.modifiedCount > 0) {
      console.log(`Fixed "${bad}" -> "${good}": ${r1.modifiedCount + r2.modifiedCount} voters`);
      nameFixesApplied += (r1.modifiedCount + r2.modifiedCount);
    }
  }
  console.log(`Total voter names sanitized: ${nameFixesApplied}`);

  // 4. Verification Check
  console.log('\n--- 4. Verification Check ---');
  const distinctVillages = await db.collection('members').distinct('village');
  console.log(`Total distinct villages in DB now: ${distinctVillages.length}`);
  console.log('Sample distinct villages:', distinctVillages.slice(0, 25));

  console.log('\n✅ All 315 parts village names, comparisons, and voter names successfully updated!');
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

