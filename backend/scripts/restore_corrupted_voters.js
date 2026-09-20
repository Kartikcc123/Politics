const mongoose = require('mongoose');
require('dotenv').config();

const Member = require('../src/models/Member');
const ElectoralMembership = require('../src/models/ElectoralMembership');
const { isValidEpic, normalizeEpic } = require('../src/utils/epic');
const { buildMemberSearchData } = require('../src/utils/memberSearch');

const mongoUri = process.env.MONGO_URI || 'mongodb://politics_user:PoliticsApp2026SecurePass!@politics.mathxmedia.tech:27017/politics_db?authSource=admin';

async function restoreCorruptedVoters() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB successfully.');

  try {
    const allMembers = await Member.find({}).lean();
    console.log(`Total members in database: ${allMembers.length}`);

    let restoredEpicCount = 0;
    let restoredSerialCount = 0;
    let cleanedSectionCount = 0;

    for (const doc of allMembers) {
      const updates = {};
      let needsUpdate = false;

      // 1. Restore pristine EPIC from ocrValues.suggested.voterId
      const suggestedEpic = normalizeEpic(doc.ocrValues?.suggested?.voterId || '');
      const currentEpic = normalizeEpic(doc.voterId || '');

      if (suggestedEpic && isValidEpic(suggestedEpic) && suggestedEpic !== currentEpic) {
        updates.voterId = suggestedEpic;
        needsUpdate = true;
        restoredEpicCount++;
        console.log(`[RESTORE EPIC] Serial ${doc.voterSerial} | Name: ${doc.name} | '${currentEpic}' -> '${suggestedEpic}'`);
      }

      // 2. Restore true Serial if sequence drift overwrote printed serial (e.g. 505 -> 500)
      const rawSerial = String(doc.rawVoterSerial || doc.ocrValues?.raw?.rawVoterSerial || '').trim();
      const currentSerial = String(doc.voterSerial || '').trim();
      if (rawSerial && /^\d{1,5}$/.test(rawSerial) && rawSerial !== currentSerial && doc.serialOcrDisagreement) {
        // If rawSerial is a clear 2-4 digit number and differs from drifted sequence
        if (Math.abs(parseInt(rawSerial, 10) - parseInt(currentSerial, 10)) >= 3) {
          updates.voterSerial = rawSerial;
          updates.serialOcrDisagreement = false;
          needsUpdate = true;
          restoredSerialCount++;
          console.log(`[RESTORE SERIAL] Name: ${doc.name} | '${currentSerial}' -> '${rawSerial}'`);
        }
      }

      // 3. Clean sectionName
      const currentSection = String(doc.sectionName || '').trim();
      if (currentSection) {
        let cleanSection = currentSection
          .replace(/^(?:गम|गाम)\s+/i, 'ग्राम ')
          .replace(/[\|=_\"`{}><;~!\?\u0964\u0965]/g, '')
          .replace(/\s{2,}/g, ' ')
          .trim();
        if (cleanSection !== currentSection && cleanSection.length >= 3) {
          updates.sectionName = cleanSection;
          needsUpdate = true;
          cleanedSectionCount++;
        }
      }

      if (needsUpdate) {
        const updatedDoc = { ...doc, ...updates };
        const searchData = buildMemberSearchData(updatedDoc);
        await Member.updateOne(
          { _id: doc._id },
          { $set: { ...updates, ...searchData } }
        );

        if (updates.voterId || updates.voterSerial) {
          await ElectoralMembership.updateMany(
            { member: doc._id },
            {
              $set: {
                ...(updates.voterId ? { voterId: updates.voterId } : {}),
                ...(updates.voterSerial ? { voterSerial: updates.voterSerial } : {}),
              },
            }
          );
        }
      }
    }

    console.log('\n==========================================');
    console.log('RESTORATION SUMMARY:');
    console.log(`- Restored EPICs: ${restoredEpicCount}`);
    console.log(`- Restored Serials: ${restoredSerialCount}`);
    console.log(`- Cleaned Sections: ${cleanedSectionCount}`);
    console.log('==========================================\n');

  } catch (err) {
    console.error('Error during restoration:', err);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB disconnected.');
  }
}

restoreCorruptedVoters();
