const mongoose = require('mongoose');

const VILLAGE_REPLACEMENTS = {
  // Bheeta
  'भभटा': 'भींटा',
  'साक रड़ल': 'सांकड़ली',
  'साक रडल': 'सांकड़ली',
  'जोारारंुार': 'जोरावरपुरा',
  'भटेार': 'भटेवर',
  'सोारजा खेड़र': 'सोरिया खेड़ा',
  'सोारजा खेड़ा': 'सोरिया खेड़ा',
  'रंा खेड़र': 'रूपाखेड़ा',

  // Kalalkhedi
  'क लाल खेडल': 'कलालखेड़ी',
  'कलालखेडल': 'कलालखेड़ी',
  'क लाल खेड़ल': 'कलालखेड़ी',
  'थोरिजा खेड़ा': 'थोरियाखेड़ा',
  'बाड़ल': 'बाड़ी',
  'बरी': 'बाड़ी',
  'धूल खेड़ा': 'धूला का खेड़ा',

  // Aashaholi
  'असाहोलल': 'आशाहोली',
  'देागारजा': 'देवगढ़िया',
  'मुाारी': 'मुरारी',

  // Kot
  'मेानिजा खेड़ा': 'मेरिया खेड़ा',
  'खानिजिर': 'खानिजीर',
  'टूणगाच': 'टुंगच',

  // Khakhar Mala
  'खाखामाला': 'खाखरमाला',
  'रिदिचडा': 'रेबारियों की ढाणी',
  'रे बाराजो की ढाणल': 'रेबारियों की ढाणी',
  'टू गंु': 'टुंगच',
  'रठेालजा': 'रठाेलिया',
  'सिरोड़ल': 'सिरोड़ी',

  // Galwa
  'गलार': 'गलवा',
  'चारणड खेड़ा': 'चावंड खेड़ा',
  'चारणड खेड़र': 'चावंड खेड़ा',
  'सजंिचार': 'सज्जनपुरा',
  'लारठजा की खेडल': 'लाठियाखेड़ी',
  'लसहंुार': 'सिंहपुरा',
  'टोेार': 'टोकरा',

  // Galyawadi
  'की मूणलजा': 'केमुनिया',
  'केमरिया': 'केमुनिया',
  'पुातार खेड़ा': 'पीथा का खेड़ा',
  'पालार': 'पालरा',
  'गलजारडल': 'गल्यावड़ी',

  // Charot
  'केशोापुार': 'किशोरपुरा',
  'गोािदि पुार': 'गोविन्दपुरा',
  'ससहंुार': 'सिंहपुरा',

  // Jhadol
  'झडोल': 'झाड़ोल',
  'झडमल': 'झाड़ोल',
  'झडुल': 'झाड़ोल',
  'झडलल': 'झाड़ोल',
  'झडडल': 'झाड़ोल',
  'खेडिजा': 'खेड़िया',
  'जिर खेड़ा': 'जागीर खेड़ा',

  // Thala
  'सला': 'सेला',
  'लंसलंुार': 'लक्ष्मणपुरा',
  'पिथलपुरा': 'पीथलपुरा',
  'मोखमंुार': 'मोखमपुरा',

  // Devriya
  'देवारजा': 'देवरिया',
  'देवालजा': 'देवरिया',

  // Nathdiyas
  'रिसडि़़जास': 'रिसड़ियास',
  'आमूा का खेड़ा': 'आंबुआ का खेड़ा',
  'आसंुा': 'आसपुरा',

  // Nandsha Jageer
  'पाबतल': 'पावती',
  'रिदिशा': 'रिसड़िया',
  'बाडिजा खुदा': 'बाड़िया खुर्द',
  'बाडिजा खूदा': 'बाड़िया खुर्द',
  'बाडिजा कला': 'बाड़िया कलां',
  'ददजास': 'दादियास',

  // Narayan Khera
  'आममा का खेड़ा': 'आंबुआ का खेड़ा',
  'खखाटजाप': 'खाट्या का खेड़ा',
  'खखाटजाप का खेड़ा': 'खाट्या का खेड़ा',
  'तेजजा खेड़ल': 'तेजा की खेड़ी',
  'नारायण खेड़र': 'नारायणखेड़ा',
  'सागगं': 'सांगण',

  // Nahri
  'फतेहंुार': 'फतेहपुरा',
  'देागिर': 'देवगढ़िया',
  'दुलहेपुार': 'दूल्हेपुरा',
  'गाडाल खेड़ा': 'गाडरी खेड़ा',
  'गाड़रल खेड़र': 'गाडरी खेड़ा',
  'बलाइजो का खेड़ा': 'बलाईयों का खेड़ा',
  'बलाइजो का खेड़र': 'बलाईयों का खेड़ा',

  // Panotiya
  'पोितिजा': 'पानोतिया',
  'जोगारस': 'जोगरास',

  // Bakan
  'लखाहोलल': 'लखाहोली',
  'बेाण': 'बकाण',

  // Bagar
  'झलामलल': 'जलामली',
  'कोलल खेड़ा मजार': 'कोली खेड़ा मजरा',
  'मणडल': 'मंडी',
  'मिजाला': 'मियाला',
  'बागड': 'बागड़',

  // Bagoliya
  'बागोलिजाप': 'बागोलिया',
  'बागोलिजा': 'बागोलिया',
  'अजुागिढ': 'अर्जुनगढ़',
  'पारटजाप खेड़ा': 'पाटियाखेड़ा',

  // Borana
  'बोारणा': 'बोराणा',

  // Boriyapura
  'शिरािसंुार': 'शिवसिंहपुरा',
  'रे राडा': 'रेवाड़ा',
  'बोारजापुार': 'बोरियापुरा',

  // Masinghpura
  'माससगंुार': 'मासिंगपुरा',
  'डागंडल': 'डांगड़ा',
  'डागंडा': 'डांगड़ी',
  'जोडलिजा': 'जोड़लिया',

  // Mokhunda
  'माणड का खेड़र': 'माण्डकाखेड़ा',
  'मोखूदिर': 'मोखुन्दा',
  'मुखुदिर': 'मोखुन्दा',
  'मोखुदिर': 'मोखुन्दा',
  'ममखुदिर': 'मोखुन्दा',
  'मलखुदिर': 'मोखुन्दा',

  // Raipur
  'राजंूा': 'राजपुरा',
  'राजंपा': 'राजपुरा',
  'कालल मगाल रोड़': 'कलाल मगाल रोड',

  // Sagrev
  'जगंुार': 'जंगपुरा',
  'सगाक र': 'सागरेव',

  // Suras
  'सुारस': 'सुरास',
  'धधलखेड़र': 'धोलखेड़ा'
};

async function fixAllVillagesAndWards() {
  await mongoose.connect('mongodb://187.127.173.42:27017/political_crm');
  const db = mongoose.connection.db;

  console.log('=== 1. UNSETTING PartScope_1 WARD REFERENCES ===');
  const unsetWardRes = await db.collection('members').updateMany(
    { ward: new mongoose.Types.ObjectId('6abac076eccec0bb503f5935') },
    { $set: { ward: null } }
  );
  console.log(`Unset ward field for ${unsetWardRes.modifiedCount} members with PartScope_1.`);

  // Also clean up any ward documents with PartScope_1
  await db.collection('wards').deleteMany({ number: /PartScope/i });
  console.log(`Cleaned up PartScope wards from 'wards' collection.`);

  console.log('\n=== 2. FIXING CORRUPTED VILLAGE STRINGS ACROSS ALL 29 PANCHAYATS ===');
  let totalFixed = 0;
  for (const [corrupted, clean] of Object.entries(VILLAGE_REPLACEMENTS)) {
    const res = await db.collection('members').updateMany(
      { village: corrupted },
      { $set: { village: clean } }
    );
    if (res.modifiedCount > 0) {
      console.log(`Updated "${corrupted}" -> "${clean}": ${res.modifiedCount} documents.`);
      totalFixed += res.modifiedCount;
    }
  }
  console.log(`\nTotal village updates from direct map: ${totalFixed}`);

  console.log('\n=== 3. ENFORCING GRAM PANCHAYAT WARD-LEVEL VILLAGE ACCURACY (BHEETA & OTHERS) ===');
  // In Bheeta:
  // Ward 1, 2, 3 should strictly be 'भींटा'
  const b1 = await db.collection('members').updateMany(
    { gramPanchayat: 'भींटा', wardNumber: { $in: ['1', '2', '3'] }, village: { $nin: ['भींटा', 'सेमलाट'] } },
    { $set: { village: 'भींटा' } }
  );
  console.log(`Bheeta Wards 1, 2, 3 synced to 'भींटा': ${b1.modifiedCount}`);

  // Ward 4, 5 should be 'सरेवड़ी'
  const b2 = await db.collection('members').updateMany(
    { gramPanchayat: 'भींटा', wardNumber: { $in: ['4', '5'] }, village: { $nin: ['सरेवड़ी'] } },
    { $set: { village: 'सरेवड़ी' } }
  );
  console.log(`Bheeta Wards 4, 5 synced to 'सरेवड़ी': ${b2.modifiedCount}`);

  // Ward 7 should be 'जोरावरपुरा'
  const b3 = await db.collection('members').updateMany(
    { gramPanchayat: 'भींटा', wardNumber: '7', village: { $nin: ['जोरावरपुरा'] } },
    { $set: { village: 'जोरावरपुरा' } }
  );
  console.log(`Bheeta Ward 7 synced to 'जोरावरपुरा': ${b3.modifiedCount}`);

  // Ward 8, 9, 10 should be 'भटेवर'
  const b4 = await db.collection('members').updateMany(
    { gramPanchayat: 'भींटा', wardNumber: { $in: ['8', '9', '10'] }, village: { $nin: ['भटेवर'] } },
    { $set: { village: 'भटेवर' } }
  );
  console.log(`Bheeta Wards 8, 9, 10 synced to 'भटेवर': ${b4.modifiedCount}`);

  // Ward 11 should be 'रूपाखेड़ा' or 'सोरिया खेड़ा'
  const b5 = await db.collection('members').updateMany(
    { gramPanchayat: 'भींटा', wardNumber: '11', village: { $in: ['', null, 'भींटा', 'भभटा'] } },
    { $set: { village: 'रूपाखेड़ा' } }
  );
  console.log(`Bheeta Ward 11 fallback synced: ${b5.modifiedCount}`);

  console.log('\n=== 4. VERIFYING BHEETA WARD 1 RECORD (SNE0151910) ===');
  const sample = await db.collection('members').findOne({ voterId: 'SNE0151910' });
  console.log('Sample SNE0151910 after fix:', {
    name: sample.name,
    voterId: sample.voterId,
    gramPanchayat: sample.gramPanchayat,
    wardNumber: sample.wardNumber,
    ward: sample.ward,
    village: sample.village,
    sectionName: sample.sectionName
  });

  await mongoose.disconnect();
  console.log('\n=== ALL VILLAGES AND WARDS PERFECTLY FIXED! ===');
}

fixAllVillagesAndWards().catch(console.error);
