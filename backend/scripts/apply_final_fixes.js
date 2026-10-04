const mongoose = require('mongoose');
const Member = require('../src/models/Member');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://187.127.173.42:27017/political_crm';

const FINAL_FIXES = {
  'WARD_SURAS_W6_S388': { name: 'दीपक कुमावत' },
  'WARD_SURAS_W6_S389': { name: 'खुशी वैष्णव' },
  'WARD_SURAS_W7_S364': { name: 'कमलेश कुमावत' },
  'WARD_SURAS_W7_S365': { name: 'रतन कंवर राठौड़' },
  'WARD_SURAS_W7_S366': { name: 'अशोक कुमावत' },
  'RJ/20/152/201151': { name: 'साथा' },
  'RJ/20/152/207206': { name: 'मांगी', guardianName: 'चम्पालाल', relativeName: 'चम्पालाल' },
  'RJ/20/152/115150': { name: 'एजी' },
  'RJ/20/152/117390': { name: 'ऐजी' },
  'RJ/20/152/162024': { guardianName: 'सांवर राम', relativeName: 'सांवर राम' },
  'SNE0607093': { guardianName: 'सांवर राम', relativeName: 'सांवर राम' },
  'RJ/20/152/112012': { name: 'फेफी' },
  'RJ/20/152/112142': { name: 'बद्रीलाल', guardianName: 'सांवर राम', relativeName: 'सांवर राम' }
};

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB.\n');

  for (const [voterId, fields] of Object.entries(FINAL_FIXES)) {
    await Member.updateOne({ voterId }, { $set: fields });
  }

  console.log('Final fixes applied successfully!');
  await mongoose.disconnect();
}

run().catch(console.error);
