const mongoose = require('mongoose');
const Member = require('../src/models/Member');

const extraRules = [
  { from: /रिस\b/g, to: 'सिंह' },
  { from: /ािस\b/g, to: 'सिंह' },
  { from: /की\s*रा\b/g, to: 'कंवर' },
  { from: /कं\s*मारभ\b/g, to: 'कुमारी' },
  { from: /कं\s*मारत\b/g, to: 'कुमावत' },
  { from: /देाभ\b/g, to: 'देवी' },
  { from: /सादार/g, to: 'सरदार' },
  { from: /छोगािस/g, to: 'छोगा सिंह' },
  { from: /गणेशािस/g, to: 'गणेश सिंह' },
  { from: /बदभ\s*लाल/g, to: 'बद्री लाल' },
  { from: /बाबं\s*लाल/g, to: 'बाबू लाल' },
  { from: /राहल\b/g, to: 'राहुल' },
  { from: /पंाण\s*सिंह\s*चुहान/g, to: 'प्रवीण सिंह चौहान' },
  { from: /चुहान/g, to: 'चौहान' },
  { from: /संखारल/g, to: 'सुखलाल' },
  { from: /रनिता/g, to: 'अनिता' },
  { from: /माज\s*शर्मा/g, to: 'माया शर्मा' },
  { from: /शंभं/g, to: 'शम्भु' },
  { from: /अकज/g, to: 'अजय' },
  { from: /टभाि/g, to: 'टीना' },
  { from: /पुखारज/g, to: 'पुखराज' },
  { from: /केलाश/g, to: 'कैलाश' },
  { from: /माजा\s*देवी/g, to: 'माया देवी' },
  { from: /सारता\s*देवी/g, to: 'सरिता देवी' },
  { from: /प्रेमभ\s*देाभ/g, to: 'प्रेमी देवी' },
  { from: /सभता/g, to: 'संगीता' },
  { from: /मंेकश/g, to: 'मुकेश' },
  { from: /गोटभ/g, to: 'गोपी' },
  { from: /भोया\s*राम/g, to: 'भोया राम' },
  { from: /चं\s*र\s*लाल/g, to: 'चम्पा लाल' }
];

async function runExtra() {
  await mongoose.connect('mongodb://187.127.173.42:27017/political_crm');
  const cursor = Member.find({
    $or: [
      { name: /रिस|की रा|कं मार|देाभ|सादार|छोगािस|गणेशािस|बदभ|बाबं|राहल|चुहान|संखारल|रनिता|माज|शंभं|अकज|टभाि|पुखारज|केलाश|माजा|सारता|प्रेमभ|सभता|मंेकश|गोटभ|चं र/ },
      { guardianName: /रिस|की रा|कं मार|देाभ|सादार|छोगािस|गणेशािस|बदभ|बाबं|राहल|चुहान|संखारल|रनिता|माज|शंभं|अकज|टभाि|पुखारज|केलाश|माजा|सारता|प्रेमभ|सभता|मंेकश|गोटभ|चं र/ }
    ]
  }).cursor();

  let count = 0;
  let bulk = [];

  for await (const doc of cursor) {
    let name = doc.name || '';
    let guard = doc.guardianName || '';

    extraRules.forEach(r => {
      name = name.replace(r.from, r.to);
      guard = guard.replace(r.from, r.to);
    });

    bulk.push({
      updateOne: {
        filter: { _id: doc._id },
        update: { $set: { name: name.trim(), guardianName: guard.trim(), relativeName: guard.trim() } }
      }
    });
    count++;

    if (bulk.length >= 1000) {
      await Member.bulkWrite(bulk, { ordered: false });
      bulk = [];
    }
  }

  if (bulk.length > 0) {
    await Member.bulkWrite(bulk, { ordered: false });
  }

  console.log(`Updated ${count} additional records with pristine names.`);
  await mongoose.disconnect();
}

runExtra().catch(console.error);
