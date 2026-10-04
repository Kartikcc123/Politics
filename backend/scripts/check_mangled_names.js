const mongoose = require('mongoose');
const Member = require('../src/models/Member');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://187.127.173.42:27017/political_crm';

async function check() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to DB');

  const totalMembers = await Member.countDocuments({});
  console.log(`Total Members in DB: ${totalMembers}`);

  // Find members with mangled names (containing words like नरम, सपखजर, नपतर, or patterns with 'नरर' / 'लरल' / 'दकरल' etc.)
  const mangled1 = await Member.countDocuments({
    $or: [
      { name: /नरम|नपतर|पनत|मकरन|सपखजर|आजच|ललग|पचरष|दकरल|भकरर|नगरधर|सनतयक/ },
      { relativeName: /नरम|नपतर|पनत|मकरन|सपखजर|आजच|ललग|पचरष|दकरल|भकरर|नगरधर|सनतयक/ }
    ]
  });

  console.log(`Members with obviously mangled names/relatives: ${mangled1}`);

  const sample = await Member.find({
    $or: [
      { name: /नरम|नपतर|पनत|मकरन|सपखजर|आजच|ललग|पचरष|दकरल|भकरर|नगरधर|सनतयक/ },
      { relativeName: /नरम|नपतर|पनत|मकरन|सपखजर|आजच|ललग|पचरष|दकरल|भकरर|नगरधर|सनतयक/ }
    ]
  }).limit(15).select('name relativeName voterId gramPanchayat wardNumber source isWardOnly');

  console.log('\nSample Mangled Members:');
  sample.forEach((m, idx) => {
    console.log(`${idx+1}. Name: "${m.name}", Relative: "${m.relativeName}", EPIC: "${m.voterId}", GP: "${m.gramPanchayat}", Ward: "${m.wardNumber}"`);
  });

  await mongoose.disconnect();
}

check();
