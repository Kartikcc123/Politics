const mongoose = require('mongoose');
const Member = require('../src/models/Member');

const extraReplacements = [
  { from: /अमरर/g, to: 'अमरा' },
  { from: /गलता/g, to: 'ललिता' },
  { from: /जोदा\s*राज/g, to: 'जोधाराम' },
  { from: /जोदा/g, to: 'जोधा' }
];

async function fixRemaining() {
  await mongoose.connect('mongodb://187.127.173.42:27017/political_crm');
  const cursor = Member.find({
    $or: [
      { name: /अमरर|गलता|जोदा/ },
      { guardianName: /अमरर|गलता|जोदा/ }
    ]
  }).cursor();

  let count = 0;
  for await (const doc of cursor) {
    let name = doc.name || '';
    let guard = doc.guardianName || '';

    extraReplacements.forEach(r => {
      name = name.replace(r.from, r.to);
      guard = guard.replace(r.from, r.to);
    });

    await Member.updateOne(
      { _id: doc._id },
      { $set: { name, guardianName: guard, relativeName: guard } }
    );
    count++;
  }

  console.log(`Cleaned ${count} remaining minor patterns.`);
  await mongoose.disconnect();
}

fixRemaining().catch(console.error);
