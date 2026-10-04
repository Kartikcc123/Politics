const mongoose = require('mongoose');
const Member = require('../src/models/Member');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://187.127.173.42:27017/political_crm';

async function fastFixGlyphs() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB.\n');

  // 1. Target Bheeta Ward 1 Serial 28 directly
  await Member.updateOne(
    { voterId: 'SNE1013739' },
    {
      $set: {
        name: 'इना देवी',
        guardianName: 'रमेश चन्द्र',
        relativeName: 'रमेश चन्द्र',
        relationType: 'husband',
        houseNumber: '131',
        age: 26,
        gender: 'female',
        gramPanchayat: 'भींटा',
        village: 'भींटा',
        wardNumber: '1',
        wardVoterSerial: '28',
        voterSerial: '28'
      }
    }
  );

  // 2. Fetch specific matching documents by regex on indexed fields or lean find
  const docs = await Member.find({
    hasMunicipalMembership: true,
    $or: [
      { name: { $regex: 'साचि|इरि|बाचि|भलल' } },
      { guardianName: { $regex: 'साचि|इरि|बाचि|भलल' } }
    ]
  }).select('_id name guardianName').lean();

  console.log(`Found ${docs.length} documents matching glyph patterns.`);

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
    { from: /\bभलल\b/g, to: 'भील' }
  ];

  const bulkOps = [];
  for (const doc of docs) {
    let name = doc.name || '';
    let guard = doc.guardianName || '';

    replacements.forEach(r => {
      name = name.replace(r.from, r.to);
      guard = guard.replace(r.from, r.to);
    });

    bulkOps.push({
      updateOne: {
        filter: { _id: doc._id },
        update: { $set: { name, guardianName: guard, relativeName: guard } }
      }
    });
  }

  if (bulkOps.length > 0) {
    await Member.bulkWrite(bulkOps, { ordered: false });
    console.log(`Updated ${bulkOps.length} documents!`);
  }

  // Verify Bheeta Ward 1 Serial 28
  const verified = await Member.findOne({ voterId: 'SNE1013739' }).lean();
  console.log('\nVerified Bheeta Ward 1 Serial 28:', {
    name: verified.name,
    guardianName: verified.guardianName,
    relationType: verified.relationType,
    voterId: verified.voterId,
    wardNumber: verified.wardNumber,
    wardVoterSerial: verified.wardVoterSerial,
    village: verified.village,
    gramPanchayat: verified.gramPanchayat,
    age: verified.age,
    gender: verified.gender
  });

  await mongoose.disconnect();
}

fastFixGlyphs().catch(console.error);
