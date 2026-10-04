const mongoose = require('mongoose');
const Member = require('../src/models/Member');

async function auditRaipurWards() {
  await mongoose.connect('mongodb://187.127.173.42:27017/political_crm');

  const raipurVoters = await Member.find({
    gramPanchayat: 'रायपुर',
    $or: [
      { hasMunicipalMembership: true },
      { wardNumber: { $exists: true, $ne: '' } }
    ]
  }).select('name voterId wardNumber wardVoterSerial voterSerial hasAssemblyMembership hasMunicipalMembership');

  console.log(`Total Live Voters for Gram Panchayat रायपुर: ${raipurVoters.length}`);

  const wardGroups = {};
  for (let i = 1; i <= 17; i++) {
    wardGroups[String(i)] = {
      total: 0,
      matchedBoth: 0,
      wardOnly: 0,
      serials: []
    };
  }

  for (const v of raipurVoters) {
    const w = String(v.wardNumber);
    if (!wardGroups[w]) {
      wardGroups[w] = { total: 0, matchedBoth: 0, wardOnly: 0, serials: [] };
    }
    wardGroups[w].total++;
    if (v.hasAssemblyMembership && v.hasMunicipalMembership) {
      wardGroups[w].matchedBoth++;
    } else {
      wardGroups[w].wardOnly++;
    }
    const s = parseInt(v.wardVoterSerial || v.voterSerial || '0', 10);
    if (s > 0) wardGroups[w].serials.push(s);
  }

  console.log('\n--- रायपुर वार्डवार लाइव डेटा (MongoDB) ---');
  let grandTotal = 0;
  let grandMatched = 0;
  let grandWardOnly = 0;

  const summary = [];
  for (let i = 1; i <= 17; i++) {
    const w = String(i);
    const data = wardGroups[w];
    data.serials.sort((a,b) => a - b);
    const minS = data.serials.length > 0 ? data.serials[0] : '-';
    const maxS = data.serials.length > 0 ? data.serials[data.serials.length - 1] : '-';
    
    summary.push({
      ward: `वार्ड ${i}`,
      total: data.total,
      matchedBoth: data.matchedBoth,
      wardOnly: data.wardOnly,
      serialRange: `#${minS} से #${maxS}`
    });

    grandTotal += data.total;
    grandMatched += data.matchedBoth;
    grandWardOnly += data.wardOnly;
  }

  console.table(summary);
  console.log(`\nकुल योग (Grand Total): ${grandTotal}`);
  console.log(`दोनों सूचियों में मैच (Matched in Both): ${grandMatched}`);
  console.log(`सिर्फ वार्ड सूची में (Ward Only): ${grandWardOnly}`);

  process.exit(0);
}

auditRaipurWards();
