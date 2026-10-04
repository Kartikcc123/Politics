const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
const Member = require('../src/models/Member');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/political-booth-crm';

async function fixDisagreedSerials() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB.');

    // Find all members with serial_ocr_disagreement or suspicious single-digit voterSerial values
    const query = {
      $or: [
        { ocrReviewReasons: 'serial_ocr_disagreement' },
        { voterSerial: { $in: ['1', '2', '3', '4', '5', '6', '7', '8', '9'] } }
      ]
    };

    const members = await Member.find(query);
    console.log(`Found ${members.length} candidate members to inspect for serial number issues.`);

    let fixedCount = 0;

    for (const member of members) {
      let updated = false;
      const ocrSerial = member.ocrValues?.voterSerial ? String(member.ocrValues.voterSerial).trim() : '';

      // If ocrValues has a valid multi-digit voterSerial (e.g. 591, 772, 54) while member.voterSerial is single-digit
      if (ocrSerial && ocrSerial !== member.voterSerial && ocrSerial.length > String(member.voterSerial || '').length) {
        console.log(`Fixing Member ${member._id} (${member.name || 'N/A'}, EPIC: ${member.voterId}): voterSerial "${member.voterSerial}" -> "${ocrSerial}"`);
        member.voterSerial = ocrSerial;
        updated = true;
      }

      // Clear serial_ocr_disagreement if voterSerial is now valid and matches ocrValues or sequence
      if (Array.isArray(member.ocrReviewReasons) && member.ocrReviewReasons.includes('serial_ocr_disagreement')) {
        member.ocrReviewReasons = member.ocrReviewReasons.filter(r => r !== 'serial_ocr_disagreement');
        if (member.ocrReviewReasons.length === 0) {
          member.ocrNeedsReview = false;
        }
        updated = true;
      }

      if (updated) {
        await member.save();
        fixedCount++;
      }
    }

    console.log(`\nCleanup complete. Total records updated: ${fixedCount}`);
  } catch (error) {
    console.error('Error during data cleanup:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

fixDisagreedSerials();
