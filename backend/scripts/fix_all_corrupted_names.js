const mongoose = require('mongoose');

const URI = process.env.MONGO_URI || 'mongodb://187.127.173.42:27017/political_crm';

async function fixNames() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(URI);
  const Member = mongoose.model('Member', new mongoose.Schema({}, { strict: false }));

  console.log('\n--- 1. Fixing All-Caps and English names using searchExact / searchKeys / transliteration ---');
  
  // Find all members where name contains english characters
  const englishVoters = await Member.find({
    name: /[a-zA-Z]/
  }).select('_id name voterId searchExact searchKeys searchText relativeName guardianName').lean();

  console.log(`Found ${englishVoters.length} voters with English in their name.`);

  let fixedEnglish = 0;
  for (const doc of englishVoters) {
    let bestHindiName = '';
    
    // 1. Check if searchExact[0] is Hindi
    if (doc.searchExact && doc.searchExact.length > 0) {
      const candidate = doc.searchExact[0];
      if (/[\u0900-\u097F]/.test(candidate) && !/[a-zA-Z0-9]/.test(candidate) && candidate.length >= 2) {
        bestHindiName = candidate;
      }
    }

    // 2. If not, check searchKeys
    if (!bestHindiName && doc.searchKeys && doc.searchKeys.length > 0) {
      for (const k of doc.searchKeys) {
        if (/[\u0900-\u097F]/.test(k) && !/[a-zA-Z0-9]/.test(k) && k.length >= 2) {
          bestHindiName = k;
          break;
        }
      }
    }

    // Specific known mappings for common corrupted uppercase words
    if (doc.name === 'GULAFAMABEGAM') bestHindiName = 'गुलफाम बेगम';
    if (doc.name === 'UDERAM') bestHindiName = 'उदेराम';
    if (doc.name === 'DEUU') bestHindiName = 'देवू';
    if (doc.name === 'FEFAKAEVAR') bestHindiName = 'पेपा कंवर';
    if (doc.name === 'NARES') bestHindiName = 'नरेश';

    if (bestHindiName) {
      await Member.updateOne({ _id: doc._id }, { $set: { name: bestHindiName } });
      fixedEnglish++;
    }
  }
  console.log(`Fixed ${fixedEnglish} English-named voters to proper Hindi!`);

  console.log('\n--- 2. Fixing "डाक्टर" -> "हकीम" ---');
  const docFix = await Member.updateMany(
    { name: /डाक्टर|डॉक्टर/, searchExact: 'हकीम' },
    { $set: { name: 'हकीम' } }
  );
  console.log(`Fixed ${docFix.modifiedCount} "डाक्टर" records to "हकीम"`);

  // Any remaining "डाक्टर" where guardian is a Muslim name / Naseer / Kasam / Hasan
  const docFix2 = await Member.updateMany(
    { name: /डाक्टर|डॉक्टर/ },
    { $set: { name: 'हकीम' } }
  );
  console.log(`Fixed ${docFix2.modifiedCount} remaining "डाक्टर" records to "हकीम"`);

  console.log('\n--- 3. Fixing trailing digits or symbols in names ---');
  const trailingDigits = await Member.find({ name: /\s+\d+$/ }).select('_id name').lean();
  for (const doc of trailingDigits) {
    const cleaned = doc.name.replace(/\s+\d+$/, '').trim();
    if (cleaned.length >= 2) {
      await Member.updateOne({ _id: doc._id }, { $set: { name: cleaned } });
    }
  }
  console.log(`Fixed ${trailingDigits.length} names with trailing digits.`);

  console.log('\n--- 4. Checking specific cases in Ward 13 & Ward 4 ---');
  const samples = await Member.find({
    voterId: { $in: ['KDY0973636', 'RJ/20/152/067227', 'KDY2003184', 'KDY0973644'] }
  }).select('name voterId wardNumber gramPanchayat').lean();
  console.log(samples);

  process.exit(0);
}

fixNames().catch(err => {
  console.error(err);
  process.exit(1);
});
