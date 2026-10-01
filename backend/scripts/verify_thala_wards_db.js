const mongoose = require('mongoose');
const Member = require('../src/models/Member');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://187.127.173.42:27017/political_crm';

async function verify() {
  await mongoose.connect(MONGO_URI);
  console.log('MongoDB Connected.');

  console.log('\n=== VERIFYING THALA WARDS DATA IN MONGODB ===\n');

  for (let w = 1; w <= 9; w++) {
    const wardStr = String(w);
    const count = await Member.countDocuments({
      gramPanchayat: { $regex: /थला/i },
      municipalWardNumbers: wardStr
    });

    const withWardSerial = await Member.countDocuments({
      gramPanchayat: { $regex: /थला/i },
      municipalWardNumbers: wardStr,
      $or: [
        { wardVoterSerial: { $exists: true, $ne: '' } },
        { [`wardSerialMap.${wardStr}`]: { $exists: true, $ne: '' } }
      ]
    });

    const samples = await Member.find({
      gramPanchayat: { $regex: /थला/i },
      municipalWardNumbers: wardStr
    })
    .sort({ wardVoterSerial: 1 })
    .limit(3)
    .select('name voterId voterSerial wardVoterSerial wardSerialMap municipalWardNumbers village gramPanchayat');

    console.log(`Ward ${wardStr.padStart(2)}: Total Voters = ${String(count).padStart(4)} | With Matdata Kramank = ${String(withWardSerial).padStart(4)} (${((withWardSerial/count)*100).toFixed(1)}%)`);
    samples.forEach((s, idx) => {
      const serial = s.wardVoterSerial || s.wardSerialMap?.[wardStr] || s.voterSerial;
      console.log(`   Sample ${idx + 1}: [Ward Serial: #${serial}] [EPIC: ${s.voterId || '-'}] ${s.name} | Village: ${s.village}`);
    });
  }

  // Check total in GP Thala
  const totalThala = await Member.countDocuments({ gramPanchayat: { $regex: /थला/i } });
  const totalThalaMunicipal = await Member.countDocuments({
    gramPanchayat: { $regex: /थला/i },
    hasMunicipalMembership: true
  });
  console.log(`\n------------------------------------------------------------`);
  console.log(`Total Voters in GP 'थला': ${totalThala}`);
  console.log(`Total Live Municipal Ward Voters in GP 'थला': ${totalThalaMunicipal}`);
  console.log(`------------------------------------------------------------\n`);

  await mongoose.disconnect();
}

verify().catch(console.error);
