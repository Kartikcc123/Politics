const fs = require('fs');
const mongoose = require('mongoose');

async function analyze() {
  await mongoose.connect('mongodb://187.127.173.42:27017/political_crm');
  const Member = require('../src/models/Member');

  const fullText = fs.readFileSync('scratch_ward2_text.txt', 'utf8');
  const pattern = /(?:[A-Z]{3}\d{7})|(?:RJ\/\d+\/\d+\/\d+)/g;
  const epics = fullText.match(pattern) || [];
  const uniqueEpics = [...new Set(epics)];

  console.log(`Total EPICs found in Ward 2 text: ${epics.length} (Unique: ${uniqueEpics.length})`);

  let matched = 0;
  const notFound = [];

  for (const epic of uniqueEpics) {
    const m = await Member.findOne({ voterId: epic });
    if (m) {
      matched++;
    } else {
      notFound.push(epic);
    }
  }

  console.log(`Matched in MongoDB by EPIC: ${matched} / ${uniqueEpics.length} (${((matched/uniqueEpics.length)*100).toFixed(1)}%)`);
  console.log(`Not found count: ${notFound.length}`);
  if (notFound.length > 0) {
    console.log('Sample not found:', notFound.slice(0, 10));
  }

  process.exit(0);
}

analyze().catch(console.error);
