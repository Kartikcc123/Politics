const mongoose = require('mongoose');
const Member = require('../src/models/Member');
const { decodeSecHindi } = require('../src/utils/secHindiDecoder');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://187.127.173.42:27017/political_crm';

async function testFix() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to DB');

  // Find members that have mangled characters
  const mangledQuery = {
    $or: [
      { name: /नरम|नपतर|पनत|मकरन|सपखजर|आजच|ललग|पचरष|दकरल|भकरर|नगरधर|सनतयक|लरल|कच मर|दकरर|गचजर|लरदब|भरगब|सयहन|ननद|शपकरल|मरपगल|सचशल|कदशल|मलनर|सलमर|पबजर|पलनत|समतर|सचगनर|कपचन|भगरतल|हलरर|कजयड|गयहर|दकशन|नकसल/ },
      { guardianName: /नरम|नपतर|पनत|मकरन|सपखजर|आजच|ललग|पचरष|दकरल|भकरर|नगरधर|सनतयक|लरल|कच मर|दकरर|गचजर|लरदब|भरगब|सयहन|ननद|शपकरल|मरपगल|सचशल|कदशल|मलनर|सलमर|पबजर|पलनत|समतर|सचगनर|कपचन|भगरतल|हलरर|कजयड|गयहर|दकशन|नकसल/ }
    ]
  };

  const count = await Member.countDocuments(mangledQuery);
  console.log(`Found ${count} members with mangled names in DB.`);

  const sample = await Member.find(mangledQuery).limit(40).select('name guardianName voterId gramPanchayat wardNumber village');

  console.log('\n--- SAMPLE BEFORE -> AFTER ---');
  sample.forEach((m, idx) => {
    const fixedName = decodeSecHindi(m.name);
    const fixedGuardian = decodeSecHindi(m.guardianName);
    console.log(`${idx+1}. [${m.gramPanchayat || 'GP'} W${m.wardNumber || '-'}] EPIC: ${m.voterId || '-'}`);
    console.log(`   Name: "${m.name}"  ==>  "${fixedName}"`);
    console.log(`   Guardian: "${m.guardianName}"  ==>  "${fixedGuardian}"`);
  });

  await mongoose.disconnect();
}

testFix();
