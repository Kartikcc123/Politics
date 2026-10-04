const mongoose = require('mongoose');
const Member = require('../src/models/Member');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://187.127.173.42:27017/political_crm';

async function deepAuditNames() {
  await mongoose.connect(MONGO_URI);
  console.log('MongoDB Connected.\n');

  console.log('Scanning all voters for name quality issues...');

  // 1. Check for administrative prefixes / labels inside name or guardianName
  const labelIssues = await Member.find({
    hasMunicipalMembership: true,
    $or: [
      { name: /(?:नाम|पिता|पति|माता|मकान|संख्या|आयु|लिंग|Photo|Available|Available|is|निर्वाचक|वार्ड)/i },
      { guardianName: /(?:नाम|पिता|पति|माता|मकान|संख्या|आयु|लिंग|Photo|Available|Available|is|निर्वाचक|वार्ड)/i }
    ]
  }).select('name guardianName voterId gramPanchayat wardNumber');

  console.log(`\n1. Records with administrative label remnants: ${labelIssues.length}`);
  if (labelIssues.length > 0) {
    console.log('Sample label issues:');
    labelIssues.slice(0, 10).forEach(d => {
      console.log(`   [${d.gramPanchayat} W${d.wardNumber}] Name: "${d.name}" | Guardian: "${d.guardianName}" | EPIC: ${d.voterId}`);
    });
  }

  // 2. Check for numeric characters inside name or guardianName
  const numericIssues = await Member.find({
    hasMunicipalMembership: true,
    $or: [
      { name: /\d/ },
      { guardianName: /\d/ }
    ]
  }).select('name guardianName voterId gramPanchayat wardNumber');

  console.log(`\n2. Records with numbers in name or guardianName: ${numericIssues.length}`);
  if (numericIssues.length > 0) {
    console.log('Sample numeric issues:');
    numericIssues.slice(0, 10).forEach(d => {
      console.log(`   [${d.gramPanchayat} W${d.wardNumber}] Name: "${d.name}" | Guardian: "${d.guardianName}" | EPIC: ${d.voterId}`);
    });
  }

  // 3. Check for English letters inside Hindi name
  const englishIssues = await Member.find({
    hasMunicipalMembership: true,
    $or: [
      { name: /[a-zA-Z]/ },
      { guardianName: /[a-zA-Z]/ }
    ]
  }).select('name guardianName voterId gramPanchayat wardNumber');

  console.log(`\n3. Records with English alphabets in name: ${englishIssues.length}`);
  if (englishIssues.length > 0) {
    console.log('Sample English alphabet issues:');
    englishIssues.slice(0, 10).forEach(d => {
      console.log(`   [${d.gramPanchayat} W${d.wardNumber}] Name: "${d.name}" | Guardian: "${d.guardianName}" | EPIC: ${d.voterId}`);
    });
  }

  // 4. Check for unmapped legacy font glyphs (SEC font remnants)
  const legacyFontIssues = await Member.find({
    hasMunicipalMembership: true,
    $or: [
      { name: /नरम|नपतर|पनत|मरतर|मकरन|सपखजर|आजच|ललग|पचरष|दकरल|भकरर|नगरधर|सनतयक|कच मर|दकरर|गचजर|लरदब|भरगब|सयहन|ननद|शपकरल|मरपगल|सचशल|कदशल|मलनर|सलमर|पबजर|पलनत|समतर|सचगनर|कपचन|भगरतल|हलरर|कजयड|गयहर|दकशन|नकसल/ },
      { guardianName: /नरम|नपतर|पनत|मरतर|मकरन|सपखजर|आजच|ललग|पचरष|दकरल|भकरर|नगरधर|सनतयक|कच मर|दकरर|गचजर|लरदब|भरगब|सयहन|ननद|शपकरल|मरपगल|सचशल|कदशल|मलनर|सलमर|पबजर|पलनत|समतर|सचगनर|कपचन|भगरतल|हलरर|कजयड|गयहर|दकशन|नकसल/ }
    ]
  }).select('name guardianName voterId gramPanchayat wardNumber');

  console.log(`\n4. Records with legacy SEC font remnants: ${legacyFontIssues.length}`);
  if (legacyFontIssues.length > 0) {
    console.log('Sample legacy font issues:');
    legacyFontIssues.slice(0, 10).forEach(d => {
      console.log(`   [${d.gramPanchayat} W${d.wardNumber}] Name: "${d.name}" | Guardian: "${d.guardianName}" | EPIC: ${d.voterId}`);
    });
  }

  // 5. Check for weird double matras or invalid unicode combinations (e.g. 'बार्ई', 'प्रकाशबचन्द्र')
  const doubleMatraIssues = await Member.find({
    hasMunicipalMembership: true,
    $or: [
      { name: /([ािीुूेैोौ्])\1/ },
      { guardianName: /([ािीुूेैोौ्])\1/ },
      { name: /बार्ई|बाइी|देाभ|सालाभ|मनिषा|संगभता|सभमा|कंमार|कहिजिर/ },
      { guardianName: /बार्ई|बाइी|देाभ|सालाभ|मनिषा|संगभता|सभमा|कंमार|कहिजिर/ }
    ]
  }).select('name guardianName voterId gramPanchayat wardNumber');

  console.log(`\n5. Records with double matras or legacy spelling artifacts: ${doubleMatraIssues.length}`);
  if (doubleMatraIssues.length > 0) {
    console.log('Sample double matra / artifact issues:');
    doubleMatraIssues.slice(0, 15).forEach(d => {
      console.log(`   [${d.gramPanchayat} W${d.wardNumber}] Name: "${d.name}" | Guardian: "${d.guardianName}" | EPIC: ${d.voterId}`);
    });
  }

  // 6. Check single character or empty names
  const emptyOrShort = await Member.find({
    hasMunicipalMembership: true,
    $or: [
      { name: { $exists: false } },
      { name: null },
      { name: '' },
      { name: /^.{1,2}$/ }
    ]
  }).select('name guardianName voterId gramPanchayat wardNumber');

  console.log(`\n6. Records with empty or 1-2 char names: ${emptyOrShort.length}`);
  if (emptyOrShort.length > 0) {
    console.log('Sample short names:');
    emptyOrShort.slice(0, 10).forEach(d => {
      console.log(`   [${d.gramPanchayat} W${d.wardNumber}] Name: "${d.name}" | Guardian: "${d.guardianName}" | EPIC: ${d.voterId}`);
    });
  }

  await mongoose.disconnect();
}

deepAuditNames().catch(console.error);
