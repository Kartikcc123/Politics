const mongoose = require('mongoose');
const Member = require('../src/models/Member');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://187.127.173.42:27017/political_crm';

const wordReplacements = [
  // Multi-word phrases first
  { from: /पेम\s*चादं\s*कु\s*मारत/g, to: 'प्रेम चन्द कुमावत' },
  { from: /पेम\s*चादं/g, to: 'प्रेम चन्द' },
  { from: /गोाधन\s*दास/g, to: 'गोवर्धन दास' },
  { from: /शजाम\s*लाल/g, to: 'श्याम लाल' },
  { from: /नि\s*द\s*लाल/g, to: 'नन्द लाल' },
  { from: /उदज\s*राम/g, to: 'उदय राम' },
  { from: /उदज\s*लाल/g, to: 'उदय लाल' },
  { from: /अम\s*बा\s*लाल/g, to: 'अम्बा लाल' },
  { from: /अमूा\s*लाल/g, to: 'अमरा लाल' },
  { from: /हा\s*लाल/g, to: 'हीरा लाल' },
  { from: /समंत\s*लाल/g, to: 'सम्पत लाल' },
  { from: /मगलि\s*राम/g, to: 'मांगी राम' },
  { from: /मगलि\s*लाल/g, to: 'मांगी लाल' },
  { from: /सुार\s*लाल/g, to: 'सुगन लाल' },
  { from: /कहिजिर\s*लाल/g, to: 'कन्हैया लाल' },
  { from: /कहिभजा\s*लाल/g, to: 'कन्हैया लाल' },
  { from: /की\s*लाश\s*चन्द्र/g, to: 'कैलाश चन्द्र' },
  { from: /की\s*लाश/g, to: 'कैलाश' },
  { from: /कमल\s*काति/g, to: 'कमलकांत' },
  { from: /राजेच\s*मार/g, to: 'राजेश कुमार' },
  { from: /जगदीश\s*लोहार\s*शातंि/g, to: 'जगदीश लोहार' },
  { from: /गाजतल\s*लोहार\s*लोहार/g, to: 'गायत्री लोहार' },
  { from: /गाजतल\s*लोहार/g, to: 'गायत्री लोहार' },
  { from: /गाजतल/g, to: 'गायत्री' },

  // General single-word patterns
  { from: /कु\s*मारत/g, to: 'कुमावत' },
  { from: /गोाधन/g, to: 'गोवर्धन' },
  { from: /गोािदिर/g, to: 'गोविन्द' },
  { from: /गोािदि/g, to: 'गोविन्द' },
  { from: /गोाि/g, to: 'गोविन्द' },
  { from: /सुदिर/g, to: 'सुधीर' },
  { from: /चादंल/g, to: 'चांदमल' },
  { from: /भगलिराम/g, to: 'बगदीराम' },
  { from: /मगलिराम/g, to: 'मांगीराम' },
  { from: /मगलि/g, to: 'मांगी' },
  { from: /नि\s*द/g, to: 'नन्द' },
  { from: /निदा/g, to: 'नन्दा' },
  { from: /निदु/g, to: 'नन्दू' },
  { from: /शजाम/g, to: 'श्याम' },
  { from: /उरमला/g, to: 'उर्मिला' },
  { from: /अम\s*बा/g, to: 'अम्बा' },
  { from: /उदज/g, to: 'उदय' },
  { from: /पेम/g, to: 'प्रेम' },
  { from: /कमलेाति/g, to: 'कमलकांत' },
  { from: /दुगार/g, to: 'दुर्गा' },
  { from: /समंतल/g, to: 'सम्पति' },
  { from: /समंत/g, to: 'सम्पत' },
  { from: /चदिर/g, to: 'चन्द्रा' },
  { from: /कमेलश/g, to: 'कमलेश' },
  { from: /लोेक\s*श/g, to: 'लोकेश' },
  { from: /सतजािराजण/g, to: 'सत्यनारायण' },
  { from: /कालल/g, to: 'काली' },
  { from: /भूा/g, to: 'भूरा' },
  { from: /कहिभजा/g, to: 'कन्हैया' },
  { from: /कहिजिर/g, to: 'कन्हैया' },
  { from: /बालुारम/g, to: 'बालूराम' },
  { from: /डालुारम/g, to: 'डालूराम' },
  { from: /बालु/g, to: 'बालू' },
  { from: /डालु/g, to: 'डालू' },
  { from: /शलारम/g, to: 'शोभाराम' },
  { from: /अमा\s*चन्द्र/g, to: 'अमर चन्द' },
  { from: /अमा/g, to: 'अमर' },
  { from: /अमार/g, to: 'अमरा' },
  { from: /अमूा/g, to: 'अमरा' },
  { from: /रिबिराम/g, to: 'रविराम' },
  { from: /भंारल/g, to: 'भंवरी' },
  { from: /कत\s*षण/g, to: 'कृष्ण' },
  { from: /कत\s*षणा/g, to: 'कृष्णा' },
  { from: /शातंि/g, to: 'शान्ति' },
  { from: /सुार/g, to: 'सुगन' },
  { from: /साचि/g, to: 'शान्ति' },
  { from: /इरि/g, to: 'इना' },
  { from: /बाचि/g, to: 'बानो' },
  { from: /भलल/g, to: 'भील' },
  { from: /धािरज/g, to: 'धीरज' },
  { from: /पाजल/g, to: 'पायल' },
  { from: /बािरगल/g, to: 'बागरिया' },
  { from: /पुषंा/g, to: 'पुष्पा' },
  { from: /जंारल/g, to: 'जवारी' },
  { from: /लडंल/g, to: 'लाडली' },
  { from: /भगारन/g, to: 'भगवान' },
  { from: /पालि/g, to: 'पाली' },
  { from: /भाराि/g, to: 'भवानी' },
  { from: /गोलं/g, to: 'गोपी' },
  { from: /बिमला/g, to: 'विमला' },
  { from: /सुखल/g, to: 'सुखी' },
  { from: /पाि/g, to: 'पन्ना' },
  { from: /गुलाबल/g, to: 'गुलाबी' },
  { from: /कायि/g, to: 'काली' },
  { from: /लादल/g, to: 'लादी' },
  { from: /किबि/g, to: 'किशन' },
  { from: /चुलि/g, to: 'चुन्नी' },
  { from: /रघुािस/g, to: 'रघुनाथ सिंह' },
  { from: /रगािस/g, to: 'रघुनाथ सिंह' },
  { from: /जजदेा/g, to: 'जयदेव' },
  { from: /सुाकश/g, to: 'सुरेश' },
  { from: /कसतुा/g, to: 'कस्तूर' },
  { from: /गोेल/g, to: 'गोपाल' },
  { from: /बसतलारम/g, to: 'बस्तीराम' },
  { from: /किचिराम/g, to: 'खींवाराम' },
  { from: /धाि/g, to: 'धापू' },
  { from: /लहेा/g, to: 'लहरी' },
  { from: /गलि/g, to: 'गाली' },
  { from: /सोसा/g, to: 'सोभा' },
  { from: /गलसु/g, to: 'गणेश' },
  { from: /लुचु/g, to: 'लाडू' },
  { from: /रिसु/g, to: 'रघु' }
];

function cleanString(text) {
  if (!text) return text;
  let str = text;
  for (const r of wordReplacements) {
    str = str.replace(r.from, r.to);
  }
  // Remove trailing or leading junk punctuation/spaces
  str = str.replace(/[:;]/g, '').replace(/\s{2,}/g, ' ').trim();
  return str;
}

async function runGlobalDemangle() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');
  console.log('========================================================================');
  console.log('   PERFECTING ALL ASSEMBLY & WARD VOTER NAMES (GLOBAL DEMANGLING)      ');
  console.log('========================================================================\n');

  const cursor = Member.find({
    $or: [
      { name: /कु\s*मारत|गोाधन|सुदिर|चादंल|भगलि|नि\s*द|शजाम|उरमला|अम\s*बा|उदज|पेम|कमलेाति|दुगार|समंत|चदिर|कमेलश|लोेक|सतजा|कालल|भूा|कहि|बालु|डालु|शलारम|अमा|अमार|अमूा|रिबि|भंार|कत\s*षण|शातंि|सुार|साचि|इरि|बाचि|भलल|धािरज|पाजल|बािरगल|पुषंा|जंारल|लडंल|भगारन|पालि|भाराि|गोलं|बिमला|सुखल|पाि|गुलाबल|कायि|लादल|किबि|चुलि|रघुािस|रगािस|जजदेा|सुाकश|कसतुा|गोेल|बसतलारम|किचिराम|धाि|लहेा|गलि|सोसा|गलसु|लुचु|रिसु/ },
      { guardianName: /कु\s*मारत|गोाधन|सुदिर|चादंल|भगलि|नि\s*द|शजाम|उरमला|अम\s*बा|उदज|पेम|कमलेाति|दुगार|समंत|चदिर|कमेलश|लोेक|सतजा|कालल|भूा|कहि|बालु|डालु|शलारम|अमा|अमार|अमूा|रिबि|भंार|कत\s*षण|शातंि|सुार|साचि|इरि|बाचि|भलल|धािरज|पाजल|बािरगल|पुषंा|जंारल|लडंल|भगारन|पालि|भाराि|गोलं|बिमला|सुखल|पाि|गुलाबल|कायि|लादल|किबि|चुलि|रघुािस|रगािस|जजदेा|सुाकश|कसतुा|गोेल|बसतलारम|किचिराम|धाि|लहेा|गलि|सोसा|गलसु|लुचु|रिसु/ }
    ]
  }).cursor();

  let totalFound = 0;
  let totalUpdated = 0;
  let bulkOps = [];

  for await (const doc of cursor) {
    totalFound++;
    const oldName = doc.name || '';
    const oldGuard = doc.guardianName || '';

    const newName = cleanString(oldName);
    const newGuard = cleanString(oldGuard);

    if (newName !== oldName || newGuard !== oldGuard) {
      const updates = {};
      if (newName !== oldName) updates.name = newName;
      if (newGuard !== oldGuard) {
        updates.guardianName = newGuard;
        updates.relativeName = newGuard;
      }

      bulkOps.push({
        updateOne: {
          filter: { _id: doc._id },
          update: { $set: updates }
        }
      });
      totalUpdated++;
    }

    if (bulkOps.length >= 1000) {
      await Member.bulkWrite(bulkOps, { ordered: false });
      console.log(`Processed ${totalFound} matching documents (Updated: ${totalUpdated})...`);
      bulkOps = [];
    }
  }

  if (bulkOps.length > 0) {
    await Member.bulkWrite(bulkOps, { ordered: false });
    console.log(`Processed ${totalFound} matching documents (Updated: ${totalUpdated})...`);
  }

  console.log('\n========================================================================');
  console.log('                          DEMANGLING SUMMARY                            ');
  console.log('========================================================================');
  console.log(`Total Documents Scanned with Glyphs: ${totalFound}`);
  console.log(`Total Documents Perfected & Saved:   ${totalUpdated}`);
  console.log('========================================================================\n');

  // Verify Sample of 20 touched voters
  const sample = await Member.find({ hasMunicipalMembership: true, gramPanchayat: 'थला' }).limit(20).select('name guardianName wardNumber wardVoterSerial voterId');
  console.log('Sample Cleaned Thala Voters:');
  sample.forEach((m, idx) => {
    console.log(`${idx + 1}. [W${m.wardNumber} #${m.wardVoterSerial}] Name: "${m.name}", Guardian: "${m.guardianName}", EPIC: "${m.voterId}"`);
  });

  await mongoose.disconnect();
}

runGlobalDemangle().catch(err => {
  console.error('Fatal Demangling Error:', err);
  process.exit(1);
});
