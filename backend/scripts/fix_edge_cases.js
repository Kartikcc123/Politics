const mongoose = require('mongoose');
const Member = require('../src/models/Member');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://187.127.173.42:27017/political_crm';

const TRANSLITERATIONS = {
  'Neha Kanwar': 'नेहा कंवर',
  'Pankaj Singh Badwa': 'पंकज सिंह बड़वा',
  'Lila Kumari Jat': 'लीला कुमारी जाट',
  'Kesar Mal Jat': 'केसर मल जाट',
  'Mahesh Jat': 'महेश जाट',
  'Devraj gurjar': 'देवराज गुर्जर',
  'Chandu': 'चन्दू',
  'Sonu': 'सोनू',
  'Dilkhush Kanwar': 'दिलखुश कंवर',
  'Durga Kumawat': 'दुर्गा कुमावत',
  'Sunil Kumar': 'सुनील कुमार',
  'Rahul': 'राहुल',
  'Pooja': 'पूजा',
  'Rekha': 'रेखा',
  'Ramesh': 'रमेश'
};

async function fixEdgeCases() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB.\n');

  // 1. Transliterate English names
  for (const [eng, hin] of Object.entries(TRANSLITERATIONS)) {
    await Member.updateMany(
      { hasMunicipalMembership: true, name: eng },
      { $set: { name: hin } }
    );
  }

  // 2. Fix specific glyph misspellings across all records
  const replacements = [
    { from: /सवार्डाम|सवार्ड\s*ाम|सवार्ड/g, to: 'सांवर राम' },
    { from: /एकललग/g, to: 'एकलिंग' },
    { from: /गुर्जा\b/g, to: 'गुर्जर' },
    { from: /मनोहा\b/g, to: 'मनोहर' },
    { from: /लहाी/g, to: 'लहरी' },
    { from: /दोाराम/g, to: 'देवाराम' },
    { from: /बजांग/g, to: 'बजरंग' },
    { from: /लेमण/g, to: 'लक्ष्मण' },
    { from: /रैमाता/g, to: 'रेवता' },
    { from: /टीपूवार्ड/g, to: 'टीपू' },
    { from: /राजू धा्मां रवल/g, to: 'राजू धाकड़' }
  ];

  const cursor = Member.find({
    hasMunicipalMembership: true,
    $or: [
      { name: /सवार्ड|एकललग|गुर्जा|मनोहा|लहाी|दोाराम|बजांग|लेमण|रैमाता|टीपूवार्ड|राजू धा्मां/ },
      { guardianName: /सवार्ड|एकललग|गुर्जा|मनोहा|लहाी|दोाराम|बजांग|लेमण|रैमाता|टीपूवार्ड|राजू धा्मां/ }
    ]
  }).cursor();

  let count = 0;
  for await (const doc of cursor) {
    let name = doc.name || '';
    let guard = doc.guardianName || '';

    replacements.forEach(r => {
      name = name.replace(r.from, r.to);
      guard = guard.replace(r.from, r.to);
    });

    if (name === '6') name = 'मतदाता #228';

    await Member.updateOne(
      { _id: doc._id },
      { $set: { name, guardianName: guard, relativeName: guard } }
    );
    count++;
  }

  console.log(`Updated ${count} edge-case voter records!`);
  await mongoose.disconnect();
}

fixEdgeCases().catch(console.error);
