const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Member = require('../src/models/Member');

async function auditRaipurDeep() {
  await mongoose.connect('mongodb://187.127.173.42:27017/political_crm');

  const summary = [];
  let grandTotal = 0;
  let grandMatched = 0;
  let grandWardOnly = 0;

  for (let i = 1; i <= 17; i++) {
    const wardStr = String(i);
    const dbVoters = await Member.find({
      gramPanchayat: 'रायपुर',
      wardNumber: wardStr
    }).select('name voterId wardVoterSerial voterSerial hasAssemblyMembership hasMunicipalMembership isDeleted');

    const activeVoters = dbVoters.filter(v => !v.isDeleted);
    const matchedBoth = activeVoters.filter(v => v.hasAssemblyMembership && v.hasMunicipalMembership).length;
    const wardOnly = activeVoters.filter(v => !v.hasAssemblyMembership || !v.hasMunicipalMembership).length;

    const serials = activeVoters
      .map(v => parseInt(v.wardVoterSerial || v.voterSerial || '0', 10))
      .filter(s => s > 0)
      .sort((a,b) => a - b);

    const minS = serials.length > 0 ? serials[0] : '-';
    const maxS = serials.length > 0 ? serials[serials.length - 1] : '-';

    summary.push({
      'वार्ड नं.': `वार्ड ${i}`,
      'कुल लाइव मतदाता': activeVoters.length,
      'दोनों में मैच (Matched)': matchedBoth,
      'सिर्फ वार्ड (Ward Only)': wardOnly,
      'क्रमांक रेंज': `#${minS} से #${maxS}`
    });

    grandTotal += activeVoters.length;
    grandMatched += matchedBoth;
    grandWardOnly += wardOnly;
  }

  console.table(summary);
  console.log(`\n======================================================`);
  console.log(`कुल लाइव रायपुर मतदाता (Grand Total): ${grandTotal}`);
  console.log(`विधानसभा + वार्ड दोनों में मैच: ${grandMatched}`);
  console.log(`सिर्फ वार्ड सूची में: ${grandWardOnly}`);
  console.log(`======================================================\n`);

  process.exit(0);
}

auditRaipurDeep();
