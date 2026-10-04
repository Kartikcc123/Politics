const mongoose = require('mongoose');

const replacements = [
  { pattern: /गोाधन\s*दास/g, to: 'गोवर्धन दास' },
  { pattern: /गोाधन/g, to: 'गोवर्धन' },
  { pattern: /गोािदिर/g, to: 'गोविन्द' },
  { pattern: /गोािदि/g, to: 'गोविन्द' },
  { pattern: /सुदिर/g, to: 'सुधीर' },
  { pattern: /चादंल/g, to: 'चांदमल' },
  { pattern: /भगलिराम/g, to: 'बगदीराम' },
  { pattern: /नि\s*द\s*लाल/g, to: 'नन्द लाल' },
  { pattern: /नि\s*द/g, to: 'नन्द' },
  { pattern: /शजाम\s*लाल/g, to: 'श्याम लाल' },
  { pattern: /शजाम/g, to: 'श्याम' },
  { pattern: /उरमला\s*देवी/g, to: 'उर्मिला देवी' },
  { pattern: /उरमला/g, to: 'उर्मिला' },
  { pattern: /अम\s*बा\s*लाल/g, to: 'अम्बा लाल' },
  { pattern: /अम\s*बा/g, to: 'अम्बा' },
  { pattern: /उदज\s*राम/g, to: 'उदय राम' },
  { pattern: /उदज\s*लाल/g, to: 'उदय लाल' },
  { pattern: /उदज/g, to: 'उदय' },
  { pattern: /पेम\s*चादं\s*कु\s*मारत/g, to: 'प्रेम चन्द कुमावत' },
  { pattern: /पेम\s*चादं/g, to: 'प्रेम चन्द' },
  { pattern: /पेम/g, to: 'प्रेम' },
  { pattern: /कु\s*मारत/g, to: 'कुमावत' },
  { pattern: /कमलेाति/g, to: 'कमलकांत' },
  { pattern: /कमल\s*काति/g, to: 'कमलकांत' },
  { pattern: /की\s*लाश\s*चन्द्र/g, to: 'कैलाश चन्द्र' },
  { pattern: /की\s*लाश/g, to: 'कैलाश' },
  { pattern: /दुगार/g, to: 'दुर्गा' },
  { pattern: /समंतल\s*देवी/g, to: 'सम्पति देवी' },
  { pattern: /समंतल/g, to: 'सम्पति' },
  { pattern: /चदिर\s*देवी/g, to: 'चन्द्रा देवी' },
  { pattern: /चदिर/g, to: 'चन्द्रा' },
  { pattern: /कमेलश/g, to: 'कमलेश' },
  { pattern: /सतजािराजण/g, to: 'सत्यनारायण' },
  { pattern: /कालल\s*देवी/g, to: 'काली देवी' },
  { pattern: /कालल/g, to: 'काली' },
  { pattern: /भूा\s*लाल/g, to: 'भूरा लाल' },
  { pattern: /भूा/g, to: 'भूरा' },
  { pattern: /कहिभजा\s*लाल/g, to: 'कन्हैया लाल' },
  { pattern: /कहिभजा/g, to: 'कन्हैया' },
  { pattern: /बालुारम/g, to: 'बालूराम' },
  { pattern: /डालुारम/g, to: 'डालूराम' },
  { pattern: /शलारम/g, to: 'शोभाराम' },
  { pattern: /अमा\s*चन्द्र/g, to: 'अमर चन्द' },
  { pattern: /अमार/g, to: 'अमरा' },
  { pattern: /रिबिराम/g, to: 'रविराम' },
  { pattern: /हा\s*लाल/g, to: 'हीरा लाल' },
  { pattern: /भंारल/g, to: 'भंवरी' },
  { pattern: /कत\s*षण/g, to: 'कृष्ण' },
  { pattern: /शातंि/g, to: 'शान्ति' },
  { pattern: /गाजतल/g, to: 'गायत्री' },
  { pattern: /अमूा/g, to: 'अमरा' },
  { pattern: /सुार\s*लाल/g, to: 'सुगन लाल' },
  { pattern: /सुार/g, to: 'सुगन' },
  { pattern: /साचि/g, to: 'शान्ति' },
  { pattern: /इरि/g, to: 'इना' },
  { pattern: /बाचि/g, to: 'बानो' },
  { pattern: /भलल/g, to: 'भील' }
];

function cleanMangledName(str) {
  if (!str) return str;
  let s = str;
  for (const r of replacements) {
    s = s.replace(r.pattern, r.to);
  }
  return s.trim();
}

async function testFix() {
  await mongoose.connect('mongodb://187.127.173.42:27017/political_crm');
  const Member = mongoose.model('Member', new mongoose.Schema({}, { strict: false }));

  const sample = await Member.find({ hasAssemblyMembership: true, gramPanchayat: 'थला', wardNumber: '1' }).limit(10);
  console.log('--- Before & After for Thala Ward 1 ---');
  sample.forEach(m => {
    const origName = m.get('name');
    const origGuard = m.get('guardianName');
    const fixedName = cleanMangledName(origName);
    const fixedGuard = cleanMangledName(origGuard);
    console.log(`Original: Name="${origName}", Guardian="${origGuard}"`);
    console.log(`Fixed:    Name="${fixedName}", Guardian="${fixedGuard}"\n`);
  });

  await mongoose.disconnect();
}

testFix().catch(console.error);
