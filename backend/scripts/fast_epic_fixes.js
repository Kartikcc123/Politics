const mongoose = require('mongoose');
const Member = require('../src/models/Member');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://187.127.173.42:27017/political_crm';

const SPECIFIC_EPIC_FIXES = {
  'WARD_CHAROT_W6_S332': { name: 'नेहा कंवर' },
  'WARD_CHAROT_W6_S333': { name: 'पंकज सिंह बड़वा' },
  'WARD_CHAROT_W7_S293': { name: 'लीला कुमारी जाट' },
  'WARD_CHAROT_W7_S294': { name: 'केसर मल जाट' },
  'WARD_CHAROT_W7_S295': { name: 'महेश जाट' },
  'WARD_KOT_W2_S287': { name: 'देवराज गुर्जर', guardianName: 'लक्ष्मण लाल गुर्जर', relativeName: 'लक्ष्मण लाल गुर्जर' },
  'WARD_NATHDIYAAS_W1_S381': { name: 'चन्दू' },
  'WARD_NATHDIYAAS_W5_S337': { name: 'सोनू' },
  'WARD_SURAS_W5_S332': { name: 'दिलखुश कंवर' },
  'WARD_SURAS_W5_S333': { name: 'दुर्गा कुमावत' },
  'WARD_SURAS_W1_S228': { name: 'मतदाता #228' },
  'WARD_CHAROT_W1_S429': { name: 'शान्ति देवी', guardianName: 'एकलिंग', relativeName: 'एकलिंग' },
  'RJ/20/152/106174': { guardianName: 'सांवर राम', relativeName: 'सांवर राम' },
  'SNE0891887': { guardianName: 'सांवर राम', relativeName: 'सांवर राम' },
  'RJ/20/152/000144': { guardianName: 'सांवर राम', relativeName: 'सांवर राम' },
  'RJ/20/152/012064': { guardianName: 'सांवर राम', relativeName: 'सांवर राम' },
  'RJ/20/152/013007': { name: 'देवाराम', guardianName: 'सांवर राम', relativeName: 'सांवर राम' },
  'RJ/20/152/081629': { name: 'टीपू' },
  'RJ/20/152/198215': { name: 'लहरी देवी', guardianName: 'सांवर राम', relativeName: 'सांवर राम' },
  'SNE1385962': { guardianName: 'रेवता गुर्जर', relativeName: 'रेवता गुर्जर' },
  'KDY0910240': { guardianName: 'खंगार सिंह', relativeName: 'खंगार सिंह' }
};

async function runFastFix() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB.\n');

  let updated = 0;
  for (const [voterId, fields] of Object.entries(SPECIFIC_EPIC_FIXES)) {
    const res = await Member.updateOne({ voterId }, { $set: fields });
    if (res.matchedCount > 0) updated++;
  }

  console.log(`Successfully updated ${updated} targeted voter records by EPIC!`);
  await mongoose.disconnect();
}

runFastFix().catch(console.error);
