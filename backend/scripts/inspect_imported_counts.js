const mongoose = require('mongoose');
const Member = require('../src/models/Member');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://187.127.173.42:27017/political_crm';

async function check() {
  await mongoose.connect(MONGO_URI);
  console.log('MongoDB Connected.');

  for (let w = 1; w <= 9; w++) {
    const wardStr = String(w);
    const totalWithWard = await Member.countDocuments({ municipalWardNumbers: wardStr });
    const distinctGPs = await Member.distinct('gramPanchayat', { municipalWardNumbers: wardStr });
    const distinctVillages = await Member.distinct('village', { municipalWardNumbers: wardStr });
    console.log(`Ward ${wardStr}: Total Voters in DB = ${totalWithWard} | GPs: ${distinctGPs.join(', ')} | Villages: ${distinctVillages.join(', ')}`);
  }

  await mongoose.disconnect();
}

check().catch(console.error);
