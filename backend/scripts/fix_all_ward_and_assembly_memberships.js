const mongoose = require('mongoose');
const URI = process.env.MONGO_URI || 'mongodb://187.127.173.42:27017/political_crm';

const GP_NAME_MAP = {
  'THALA': 'थला',
  'SURAS': 'सुरास',
  'SAGREV': 'सागरेव',
  'RAIPUR': 'रायपुर',
  'PALRA': 'पालरा',
  'PANOTIYA': 'पानोतिया',
  'NATHDIYAAS': 'नाथड़ियास',
  'NATHDIYAS': 'नाथड़ियास',
  'KHEMANA': 'खेमाणा',
  'KOT': 'कोट',
  'NAHRI': 'नाहरी',
  'MASINGHPURA': 'मासिंगपुरा',
  'MASINGHPUR': 'मासिंगपुरा',
  'MOKHUNDA': 'मोखुन्दा',
  'NANDSHA JAGEER': 'नान्दशा जागीर',
  'NANDSA': 'नान्दशा जागीर',
  'NANDASHA': 'नान्दशा जागीर',
  'NARAYAN KHERA': 'नारायणखेड़ा',
  'NARAYANKHERA': 'नारायणखेड़ा',
  'JHADOL': 'झाड़ोल',
  'BHEETA': 'भींटा',
  'AASHAHOLI': 'आशाहोली',
  'BORANA': 'बोराणा',
  'BORIYAPURA': 'बोरियापुरा',
  'DEVRIYA': 'देवरिया',
  'CHAROT': 'चारोट',
  'GALWA': 'गलवा',
  'GALYAWADI': 'गल्यावड़ी',
  'KALALKHEDI': 'कलालखेड़ी',
  'KHAKHAR MALA': 'खाखरमाला',
  'BAGAR': 'बागड़',
  'BAGOLIYA': 'बागोलिया',
  'BAKAN': 'बकाण',
  'PEETHA KA KHERA': 'पीथा का खेड़ा'
};

async function fixAllMemberships() {
  console.log('Connecting to DB...');
  await mongoose.connect(URI);
  console.log('Connected!');

  const Member = mongoose.model('Member', new mongoose.Schema({}, { strict: false }));

  console.log('Finding all voters originating from Ward PDFs...');
  const wardVoters = await Member.find({
    'sourceDocument.file': { $regex: /Ward No/i }
  }).lean();

  console.log(`Found ${wardVoters.length} Ward PDF voters.`);

  const bulkOps = [];
  let fixedAssemblyFlags = 0;
  let fixedGps = 0;

  for (const v of wardVoters) {
    const file = v.sourceDocument?.file || '';
    const filePrefix = file.split('-')[0].trim().toUpperCase();
    const targetGp = GP_NAME_MAP[filePrefix] || v.gramPanchayat;

    const updates = {};
    const unsets = {};

    // 1. Ward-only voters must not have Assembly membership or phantom Part/Serial
    if (v.hasAssemblyMembership !== false) {
      updates.hasAssemblyMembership = false;
      fixedAssemblyFlags++;
    }
    if (v.hasMunicipalMembership !== true) {
      updates.hasMunicipalMembership = true;
    }
    if (v.partNumber) {
      unsets.partNumber = 1;
    }
    if (v.voterSerial) {
      unsets.voterSerial = 1;
    }
    if (v.assemblyNumber) {
      unsets.assemblyNumber = 1;
    }
    if (v.assemblyName) {
      unsets.assemblyName = 1;
    }

    // Ensure wardVoterSerial is populated from serial in rawText or voterSerial if missing
    if (!v.wardVoterSerial && v.voterSerial) {
      updates.wardVoterSerial = v.voterSerial;
    }

    // 2. Fix Gram Panchayat and Village if corrupted
    if (targetGp && v.gramPanchayat !== targetGp) {
      updates.gramPanchayat = targetGp;
      fixedGps++;

      // If village was corrupted to Raipur or wrong GP, reset to default village of this GP
      if (v.village === 'रायपुर' && targetGp !== 'रायपुर') {
        let defaultV = targetGp;
        if (targetGp === 'नाथड़ियास') {
          if ((v.searchText || '').includes('आसपुर') || (v.searchExact || []).includes('आसपुर')) {
            defaultV = 'आसपुरा';
          }
        }
        updates.village = defaultV;
      }
    }

    // If Nathdiyas voter specifically has village Raipur, fix to Aaspura/Nathdiyas
    if (targetGp === 'नाथड़ियास' && v.village === 'रायपुर') {
      let defaultV = 'नाथड़ियास';
      if ((v.searchText || '').includes('आसपुर') || (v.searchExact || []).includes('आसपुर')) {
        defaultV = 'आसपुरा';
      }
      updates.village = defaultV;
    }

    // Build update object
    const opUpdate = {};
    if (Object.keys(updates).length > 0) {
      opUpdate.$set = updates;
    }
    if (Object.keys(unsets).length > 0) {
      opUpdate.$unset = unsets;
    }

    if (Object.keys(opUpdate).length > 0) {
      bulkOps.push({
        updateOne: {
          filter: { _id: v._id },
          update: opUpdate
        }
      });
    }
  }

  console.log(`Executing ${bulkOps.length} updates (False Assembly flags: ${fixedAssemblyFlags}, Wrong GPs: ${fixedGps})...`);

  const CHUNK_SIZE = 1000;
  for (let i = 0; i < bulkOps.length; i += CHUNK_SIZE) {
    const chunk = bulkOps.slice(i, i + CHUNK_SIZE);
    await Member.bulkWrite(chunk, { ordered: false });
    console.log(`Updated ${Math.min(i + CHUNK_SIZE, bulkOps.length)} / ${bulkOps.length}`);
  }

  console.log('\n--- VERIFICATION OF SPECIFIC TEST CASES ---');

  // Verify Manisha
  const manisha = await Member.findOne({ voterId: 'SNE1533090' }).lean();
  console.log('Manisha (SNE1533090):', {
    name: manisha.name,
    gramPanchayat: manisha.gramPanchayat,
    village: manisha.village,
    wardNumber: manisha.wardNumber,
    wardVoterSerial: manisha.wardVoterSerial,
    voterSerial: manisha.voterSerial,
    partNumber: manisha.partNumber,
    hasAssemblyMembership: manisha.hasAssemblyMembership,
    hasMunicipalMembership: manisha.hasMunicipalMembership
  });

  // Verify Parsi Devi
  const parsi = await Member.findOne({ voterId: 'SNE0404822' }).lean();
  console.log('Parsi Devi (SNE0404822):', {
    name: parsi.name,
    gramPanchayat: parsi.gramPanchayat,
    village: parsi.village,
    wardNumber: parsi.wardNumber,
    wardVoterSerial: parsi.wardVoterSerial,
    voterSerial: parsi.voterSerial,
    partNumber: parsi.partNumber,
    hasAssemblyMembership: parsi.hasAssemblyMembership,
    hasMunicipalMembership: parsi.hasMunicipalMembership
  });

  // Verify Narayan
  const narayan = await Member.findOne({ voterId: 'SNE0404830' }).lean();
  console.log('Narayan (SNE0404830):', {
    name: narayan.name,
    gramPanchayat: narayan.gramPanchayat,
    village: narayan.village,
    wardNumber: narayan.wardNumber,
    wardVoterSerial: narayan.wardVoterSerial,
    voterSerial: narayan.voterSerial,
    partNumber: narayan.partNumber,
    hasAssemblyMembership: narayan.hasAssemblyMembership,
    hasMunicipalMembership: narayan.hasMunicipalMembership
  });

  // Verify Nandubai (Assembly Part 67 Serial 19)
  const nandubai = await Member.findOne({ voterId: 'SNE0313379' }).lean();
  console.log('Nandubai (SNE0313379):', {
    name: nandubai.name,
    gramPanchayat: nandubai.gramPanchayat,
    partNumber: nandubai.partNumber,
    voterSerial: nandubai.voterSerial,
    wardNumber: nandubai.wardNumber,
    wardVoterSerial: nandubai.wardVoterSerial,
    hasAssemblyMembership: nandubai.hasAssemblyMembership,
    hasMunicipalMembership: nandubai.hasMunicipalMembership
  });

  // Verify Gopal (Assembly Part 54 Serial 29)
  const gopal = await Member.findOne({ voterId: 'SNE1317676' }).lean();
  console.log('Gopal (SNE1317676):', {
    name: gopal.name,
    partNumber: gopal.partNumber,
    voterSerial: gopal.voterSerial,
    hasAssemblyMembership: gopal.hasAssemblyMembership,
    hasMunicipalMembership: gopal.hasMunicipalMembership
  });

  // Raipur Ward 6 member count check
  const raipurW6Count = await Member.countDocuments({
    gramPanchayat: 'रायपुर',
    wardNumber: '6'
  });
  console.log(`\nRaipur Ward 6 total voters now: ${raipurW6Count}`);

  // Nathdiyas Ward 6 member count check
  const nathW6Count = await Member.countDocuments({
    gramPanchayat: 'नाथड़ियास',
    wardNumber: '6'
  });
  console.log(`Nathdiyas Ward 6 total voters now: ${nathW6Count}`);

  process.exit(0);
}

fixAllMemberships().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
