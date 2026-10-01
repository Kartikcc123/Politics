const mongoose = require('mongoose');
const fs = require('fs');

const hindiFlexibleRegex = (value) => {
  if (!value) return undefined;
  const clean = String(value).trim().normalize('NFC');
  const tokens = [];
  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    if (/[ँं़]/.test(char)) continue;
    if (/[डड़ड़]/.test(char)) {
      tokens.push('[डड़ड़][ँं़]?');
    } else if (/[ढढ़ढ़]/.test(char)) {
      tokens.push('[ढढ़ढ़][ँं़]?');
    } else if (/[नण]/.test(char)) {
      tokens.push('[नण][ँं़]?');
    } else if (/[शषस]/.test(char)) {
      tokens.push('[शषस][ँं़]?');
    } else if (/[बव]/.test(char)) {
      tokens.push('[बव][ँं़]?');
    } else if (/[इईिी]/.test(char)) {
      tokens.push('[इईिी]?[ँं़]?');
    } else if (/[उऊुू]/.test(char)) {
      tokens.push('[उऊुू]?[ँं़]?');
    } else if (/[एऐेै]/.test(char)) {
      tokens.push('[एऐेै]?[ँं़]?');
    } else if (/[दधथ]/.test(char)) {
      tokens.push('[दधथ][ँं़]?');
    } else if (char === ' ') {
      // space handled between tokens
    } else {
      tokens.push(char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[ँं़]?');
    }
  }
  return new RegExp(tokens.join('\\s*'), 'i');
};

async function audit() {
  await mongoose.connect('mongodb://187.127.173.42:27017/political_crm');
  const Member = require('../src/models/Member');

  const official29 = require('../src/config/raipurOfficial29Panchayats.json');
  console.log(`Auditing all ${official29.length} official Panchayats and their constituent villages...\n`);

  const results = [];
  let zeroCountVillages = [];
  let foundVillages = 0;
  let totalVillages = 0;

  for (const gp of official29) {
    const gpRegex = hindiFlexibleRegex(gp.name);
    const gpCount = await Member.countDocuments({
      $or: [
        { gramPanchayat: gpRegex },
        { village: gpRegex },
        { sectionName: gpRegex },
        { location: gpRegex }
      ]
    });

    const villageDetails = [];

    for (const vObj of gp.villages) {
      const vName = typeof vObj === 'string' ? vObj : (vObj.name || vObj.village || '');
      if (!vName) continue;
      totalVillages++;
      const vRegex = hindiFlexibleRegex(vName);
      const vCount = await Member.countDocuments({
        $or: [
          { village: vRegex },
          { gramPanchayat: vRegex },
          { sectionName: vRegex },
          { location: vRegex }
        ]
      });

      if (vCount > 0) {
        foundVillages++;
      } else {
        zeroCountVillages.push({ gp: gp.name, village: vName });
      }

    villageDetails.push({ village: vName, count: vCount });
    }

    results.push({
      panchayat: gp.name,
      wards: gp.wards,
      population: gp.population,
      gpCount,
      villages: villageDetails
    });
  }

  console.log('========================================================================');
  console.log(`📊 ALL 29 PANCHAYATS AUDIT SUMMARY:`);
  console.log(`• Total Official Panchayats: ${official29.length}`);
  console.log(`• Panchayats with >0 Voters: ${results.filter(r => r.gpCount > 0).length} / ${official29.length}`);
  console.log(`• Total Villages Audited:    ${totalVillages}`);
  console.log(`• Villages with >0 Voters:   ${foundVillages} / ${totalVillages} (${((foundVillages/totalVillages)*100).toFixed(1)}%)`);
  console.log(`• Zero-count Villages:       ${zeroCountVillages.length}`);
  console.log('========================================================================\n');

  console.log('Panchayat Breakdown:');
  for (const r of results) {
    const vSummary = r.villages.map(v => `${v.village} (${v.count})`).join(', ');
    console.log(`🏛️ [${r.panchayat}] -> Total GP Voters: ${r.gpCount} | Villages: ${vSummary}`);
  }

  if (zeroCountVillages.length > 0) {
    console.log('\n⚠️ Zero Count Villages List:');
    zeroCountVillages.forEach(z => console.log(`- GP "${z.gp}" -> Village: "${z.village}"`));
  }

  process.exit(0);
}

audit().catch(console.error);
