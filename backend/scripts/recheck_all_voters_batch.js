const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
const Member = require('../src/models/Member');
const User = require('../src/models/User');
const { applyRecheckOcr } = require('../src/controllers/memberController');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/political-booth-crm';

async function recheckAllVoters() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB.');

    // Look for admin user for audit trail
    const adminUser = (await User.findOne({ role: 'admin' })) || { _id: new mongoose.Types.ObjectId() };

    const args = process.argv.slice(2);
    const recheckAll = args.includes('--all');
    const boothArg = args.find(a => a.startsWith('--booth='))?.split('=')[1];

    const query = {
      cardImage: { $exists: true, $ne: '' }
    };

    if (boothArg) {
      query.booth = boothArg;
    }

    if (!recheckAll && !boothArg) {
      // By default target records with disagreement reasons or potentially truncated values
      query.$or = [
        { ocrReviewReasons: { $in: ['serial_ocr_disagreement', 'house_number_missing', 'location_unmatched'] } },
        { voterSerial: { $in: ['1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16','17','18','19','20','21','22','23','24','25','26','27','28','29','30','31','32','33','34','35','36','37','38','39','40','41','42','43','44','45','46','47','48','49','50','51','52','53','54','55','56','57','58','59','60','61','62','63','64','65','66','67','68','69','70','71','72','73','74','75','76','77','78','79','80','81','82','83','84','85','86','87','88','89','90','91','92','93','94','95','96','97','98','99'] } }
      ];
    }

    const members = await Member.find(query);
    console.log(`Found ${members.length} voters to re-check with improved OCR.`);

    let updatedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < members.length; i++) {
      const member = members[i];
      const prevSerial = member.voterSerial;
      const prevHouse = member.houseNumber;

      try {
        const fakeReq = { currentUser: adminUser, ip: '127.0.0.1', get: () => 'CLI' };
        const outcome = await applyRecheckOcr(member, adminUser, fakeReq);
        const newSerial = outcome.member.voterSerial;
        const newHouse = outcome.member.houseNumber;

        const serialChanged = prevSerial !== newSerial;
        const houseChanged = prevHouse !== newHouse;

        if (serialChanged || houseChanged) {
          updatedCount++;
          console.log(`[${i + 1}/${members.length}] Fixed Voter: ${member.name} (${member.voterId})`);
          if (serialChanged) console.log(`   Serial: "${prevSerial}" -> "${newSerial}"`);
          if (houseChanged)  console.log(`   House:  "${prevHouse}" -> "${newHouse}"`);
        } else {
          console.log(`[${i + 1}/${members.length}] OK (No changes needed): ${member.name} (${member.voterId})`);
        }
      } catch (err) {
        failedCount++;
        console.warn(`[${i + 1}/${members.length}] Failed for ${member.name} (${member.voterId}): ${err.message}`);
      }
    }

    console.log(`\n========================================`);
    console.log(`Re-check Batch Complete!`);
    console.log(`Total Inspected: ${members.length}`);
    console.log(`Total Corrected: ${updatedCount}`);
    console.log(`Total Failed:    ${failedCount}`);
    console.log(`========================================\n`);

  } catch (error) {
    console.error('Fatal batch re-check error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

recheckAllVoters();
