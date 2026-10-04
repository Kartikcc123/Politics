const mongoose = require('mongoose');
const Member = require('../src/models/Member');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://187.127.173.42:27017/political_crm';

async function fixNameGlyphPatterns() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB.\n');

  const replacements = [
    { from: /\bइरि\b/g, to: 'इना' },
    { from: /\bइरि देवी\b/g, to: 'इना देवी' },
    { from: /\bअफसाचि\b/g, to: 'अफसाना' },
    { from: /\bबाचि\b/g, to: 'बानो' },
    { from: /\bसाचिद\s*र\s*क\s*ल\b/g, to: 'शान्ति देवी' },
    { from: /\bसाचिडल\b/g, to: 'शान्ति देवी' },
    { from: /\bसाचि\s*देवी\b/g, to: 'शान्ति देवी' },
    { from: /\bसाचि\s*भलल\b/g, to: 'शान्ति भील' },
    { from: /\bसाचि\s*कु\s*म\s*हार\b/g, to: 'शान्ति कुम्हार' },
    { from: /\bसाचि\b/g, to: 'शान्ति' },
    { from: /\bभलल\b/g, to: 'भील' },
    { from: /\bचन\b/g, to: 'चन्द्र' },
    { from: /\bचनद\b/g, to: 'चन्द्र' },
    { from: /\bचनन\b/g, to: 'चन्द्र' },
    { from: /\bरमेश\s*चन\b/g, to: 'रमेश चन्द्र' },
    { from: /\bदिनेश\s*चन\b/g, to: 'दिनेश चन्द्र' },
    { from: /\bसुरेश\s*चन\b/g, to: 'सुरेश चन्द्र' },
    { from: /\bकैलाश\s*चन\b/g, to: 'कैलाश चन्द्र' },
    { from: /\bप्रकाश\s*चन\b/g, to: 'प्रकाश चन्द्र' },
    { from: /\bपूरण\s*चन\b/g, to: 'पूरण चन्द्र' },
    { from: /\bतारा\s*चन\b/g, to: 'तारा चन्द' },
    { from: /\bनेमी\s*चन\b/g, to: 'नेमी चन्द' },
    { from: /\bसुभाष\s*चन\b/g, to: 'सुभाष चन्द्र' },
    { from: /\bजगदीश\s*चन\b/g, to: 'जगदीश चन्द्र' }
  ];

  const cursor = Member.find({
    hasMunicipalMembership: true,
    $or: [
      { name: /साचि|इरि|बाचि|भलल|\bचन\b/ },
      { guardianName: /साचि|इरि|बाचि|भलल|\bचन\b/ }
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

    await Member.updateOne(
      { _id: doc._id },
      { $set: { name, guardianName: guard, relativeName: guard } }
    );
    count++;
  }

  console.log(`Cleaned and perfected ${count} voter records with font glyph patterns!`);

  // Verify Bheeta Ward 1 Serial 28
  const bDoc = await Member.findOne({ voterId: 'SNE1013739' });
  console.log('\nVerified Bheeta Ward 1 Serial 28:');
  console.log({
    name: bDoc.name,
    guardianName: bDoc.guardianName,
    relationType: bDoc.relationType,
    wardNumber: bDoc.wardNumber,
    wardVoterSerial: bDoc.wardVoterSerial,
    village: bDoc.village,
    gramPanchayat: bDoc.gramPanchayat,
    voterId: bDoc.voterId
  });

  await mongoose.disconnect();
}

fixNameGlyphPatterns().catch(console.error);
