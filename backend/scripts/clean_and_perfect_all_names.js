const mongoose = require('mongoose');
const Member = require('../src/models/Member');
const { decodeSecHindi } = require('../src/utils/secHindiDecoder');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://187.127.173.42:27017/political_crm';

function cleanNameString(str) {
  if (!str || typeof str !== 'string') return '';
  let s = str.trim();
  if (!s) return '';

  // 1. Remove trailing EPIC or serial tokens (e.g. "उदा O 128 RJ/20/152/169006" -> "उदा")
  s = s.replace(/\s*(?:[OESR]?\s*\d{1,4})?\s*[A-Z]{2,4}\/?\d{6,10}.*$/gi, '');
  s = s.replace(/\s*RJ\/\d{2}\/\d{2,4}\/\d{5,8}.*$/gi, '');
  s = s.replace(/\s*KDY\d{6,10}.*$/gi, '');
  s = s.replace(/\s*SNE\d{6,10}.*$/gi, '');

  // 2. Decode legacy SEC font glyphs if present
  s = decodeSecHindi(s);

  // 3. Remove leading/trailing symbols, colons, punctuation
  s = s.replace(/^[:\s\-#.,ः~|]+/, '').replace(/[:\s\-#.,ः~|]+$/, '').trim();

  // 4. Remove residual English alphabets or isolated numbers
  s = s.replace(/[a-zA-Z]/g, '').trim();
  s = s.replace(/\b\d+\b/g, '').trim();

  // 5. Fix double virama / ligatures (e.g. 'नन््दलाल' -> 'नन्दलाल', 'चान््दी' -> 'चान्दी')
  s = s.replace(/्+/g, '्');
  s = s.replace(/न््/g, 'न्');
  s = s.replace(/न्\s*्/g, 'न्');
  s = s.replace(/न््द/g, 'न्द');
  s = s.replace(/न््दा/g, 'न्दा');
  s = s.replace(/न््दू/g, 'न्दू');
  s = s.replace(/श्ं/g, 'शं');
  s = s.replace(/([ािीुूेैोौ्])\1+/g, '$1');

  // 6. Fix known specific OCR/spelling anomalies
  s = s.replace(/बार्ई|बाइी/g, 'बाई');
  s = s.replace(/देाभ/g, 'देवी');
  s = s.replace(/सालाभ/g, 'सालवी');
  s = s.replace(/मनिषा/g, 'मनीषा');
  s = s.replace(/संगभता/g, 'संगीता');
  s = s.replace(/सभमा/g, 'सीमा');
  s = s.replace(/कं\s*मारत/g, 'कुमावत');
  s = s.replace(/कं\s*मार/g, 'कुमार');
  s = s.replace(/कहिजिर\s*लाल|कहिकजा\s*लाल/g, 'कन्हैयालाल');
  s = s.replace(/कहिजिर|कहिकजा/g, 'कन्हैया');
  s = s.replace(/सवार्ड\s*राम|सवार्डराम/g, 'सांवर राम');
  s = s.replace(/खवार्ड\s*सिंह|खवार्डसिंह/g, 'खंगार सिंह');
  s = s.replace(/शापि/g, 'शान्ति');
  s = s.replace(/कालूारम/g, 'कालुराम');
  s = s.replace(/कसतूाल/g, 'कस्तुरी');
  s = s.replace(/रेमणूाई/g, 'रेमणु बाई');
  s = s.replace(/प्रकाशबचन्द्र/g, 'प्रकाश चन्द्र');
  s = s.replace(/श्रीभैरूलाल/g, 'भैरूलाल');
  s = s.replace(/बदामबार्ई/g, 'बदाम बाई');
  s = s.replace(/नास्लाल/g, 'नाथूलाल');
  s = s.replace(/गभता/g, 'गीता');
  s = s.replace(/बागारजा/g, 'बागरिया');
  s = s.replace(/गोाधान/g, 'गोवर्धन');
  s = s.replace(/अजूान|अजबरन/g, 'अर्जुन');
  s = s.replace(/पूणामल/g, 'पूरणमल');
  s = s.replace(/संाजमल/g, 'सूरजमल');
  s = s.replace(/नहरल/g, 'लहरी');
  s = s.replace(/सचडज/g, 'छोगा');
  s = s.replace(/रयडब/g, 'रोडू');
  s = s.replace(/भभरलरल/g, 'भैरुलाल');
  s = s.replace(/मयहनल/g, 'मोहनी');
  s = s.replace(/मरपगब/g, 'मांगू');
  s = s.replace(/लयभलररम/g, 'लोभाराम');
  s = s.replace(/अजबरनलरल/g, 'अर्जुनलाल');

  // Clean double spaces
  s = s.replace(/\s{2,}/g, ' ').trim();
  return s;
}

async function runCleanAllNames() {
  console.log('Connecting to MongoDB:', MONGO_URI);
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB.\n');

  console.log('Starting full cleanup & standardization of all voter names...');

  const query = { hasMunicipalMembership: true };
  const total = await Member.countDocuments(query);
  console.log(`Total municipal voters to review and polish: ${total}`);

  const cursor = Member.find(query).cursor();
  let count = 0;
  let updatedCount = 0;
  let bulkOps = [];

  for await (const doc of cursor) {
    count++;
    const origName = doc.name || '';
    const origGuard = doc.guardianName || doc.relativeName || '';

    const cleanName = cleanNameString(origName);
    const cleanGuard = cleanNameString(origGuard);

    if (cleanName !== origName || cleanGuard !== origGuard) {
      bulkOps.push({
        updateOne: {
          filter: { _id: doc._id },
          update: {
            $set: {
              name: cleanName || origName,
              guardianName: cleanGuard,
              relativeName: cleanGuard
            }
          }
        }
      });
      updatedCount++;
    }

    if (bulkOps.length >= 1000) {
      await Member.bulkWrite(bulkOps, { ordered: false });
      console.log(`Progress: ${count}/${total} voters checked (Polished: ${updatedCount})...`);
      bulkOps = [];
    }
  }

  if (bulkOps.length > 0) {
    await Member.bulkWrite(bulkOps, { ordered: false });
    console.log(`Progress: ${count}/${total} voters checked (Polished: ${updatedCount})...`);
  }

  console.log('\n========================================================================');
  console.log(`COMPLETE: Successfully reviewed ${count} voters and perfected ${updatedCount} names!`);
  console.log('========================================================================\n');

  await mongoose.disconnect();
}

runCleanAllNames().catch(err => {
  console.error('Error polishing names:', err);
  process.exit(1);
});
