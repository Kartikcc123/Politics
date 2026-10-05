const mongoose = require('mongoose');

const URI = process.env.MONGO_URI || 'mongodb://187.127.173.42:27017/political_crm';

async function auditAndClean() {
  console.log('Connecting to MongoDB at', URI);
  await mongoose.connect(URI);
  const Member = mongoose.model('Member', new mongoose.Schema({}, { strict: false }));

  console.log('\n--- 1. Fixing Cross-Contaminated Ward PDFs (e.g. Nathdiyas in Raipur) ---');
  // Check members with NATHDIYAAS PDF but gramPanchayat: 'रायपुर'
  const nathInRaipur = await Member.find({
    'sourceDocument.file': /NATHDIYA/i,
    $or: [{ gramPanchayat: 'रायपुर' }, { village: 'रायपुर' }]
  }).lean();
  console.log(`Found ${nathInRaipur.length} Nathdiyas voters wrongly marked as Raipur!`);

  if (nathInRaipur.length > 0) {
    const res1 = await Member.updateMany(
      {
        'sourceDocument.file': /NATHDIYA/i,
        $or: [{ gramPanchayat: 'रायपुर' }, { village: 'रायपुर' }]
      },
      {
        $set: {
          gramPanchayat: 'नाथड़ियास',
          village: 'नाथड़ियास',
        }
      }
    );
    console.log(`Updated ${res1.modifiedCount} Nathdiyas voters back to gramPanchayat: 'नाथड़ियास' and village: 'नाथड़ियास'`);
  }

  console.log('\n--- 2. Auditing all PDF source files and correcting gramPanchayat / village ---');
  const gpRules = [
    { regex: /AASHAHOLI/i, gp: 'आशाहोली', village: 'आशाहोली' },
    { regex: /BAGAR/i, gp: 'बागड़', village: 'बागड़' },
    { regex: /BAGOLIYA/i, gp: 'बागोलिया', village: 'बागोलिया' },
    { regex: /BAKAN/i, gp: 'बकाण', village: 'बकाण' },
    { regex: /BHEETA|BHITA/i, gp: 'भींटा', village: 'भीटा' },
    { regex: /BORANA/i, gp: 'बोराणा', village: 'बोराणा' },
    { regex: /BORIYAPUR/i, gp: 'बोरियापुरा', village: 'बोरियापुरा' },
    { regex: /CHAROT/i, gp: 'चारोट', village: 'चारोट' },
    { regex: /DEVRIYA/i, gp: 'देवरिया', village: 'देवरिया' },
    { regex: /GALWA/i, gp: 'गलवा', village: 'गलवा' },
    { regex: /GALYAWADI/i, gp: 'गल्यावड़ी', village: 'गल्यावड़ी' },
    { regex: /JHADOL/i, gp: 'झाड़ोल', village: 'झाड़ोल' },
    { regex: /KALALKHEDI/i, gp: 'कलालखेड़ी', village: 'कलालखेड़ी' },
    { regex: /KHAKHAR/i, gp: 'खाखरमाला', village: 'खाखरमाला' },
    { regex: /KHEMANA/i, gp: 'खेमाणा', village: 'खेमाणा' },
    { regex: /KOT/i, gp: 'कोट', village: 'कोट' },
    { regex: /MASINGH/i, gp: 'मांसिंहपुरा', village: 'मांसिंहपुरा' },
    { regex: /MOKHUNDA/i, gp: 'मोखुन्दा', village: 'मोखुन्दा' },
    { regex: /NAHRI/i, gp: 'नाहरी', village: 'नाहरी' },
    { regex: /NANDSA|NANDASHA/i, gp: 'नान्दशा', village: 'नान्दशा' },
    { regex: /NARAYAN/i, gp: 'नारायण खेड़ा', village: 'नारायण खेड़ा' },
    { regex: /NATHDIYA/i, gp: 'नाथड़ियास', village: 'नाथड़ियास' },
    { regex: /PALRA/i, gp: 'पालरा', village: 'पालरा' },
    { regex: /PANOTIYA/i, gp: 'पनोतिया', village: 'पनोतिया' },
    { regex: /RAIPUR/i, gp: 'रायपुर', village: 'रायपुर' },
    { regex: /SAGREV/i, gp: 'सगरेव', village: 'सगरेव' },
    { regex: /SURAS/i, gp: 'सुरास', village: 'सुरास' },
    { regex: /THALA/i, gp: 'थला', village: 'थला' },
  ];

  for (const rule of gpRules) {
    const wrongGP = await Member.updateMany(
      {
        'sourceDocument.file': rule.regex,
        gramPanchayat: { $ne: rule.gp }
      },
      {
        $set: {
          gramPanchayat: rule.gp,
          village: rule.village
        }
      }
    );
    if (wrongGP.modifiedCount > 0) {
      console.log(`Corrected ${wrongGP.modifiedCount} voters for GP ${rule.gp} based on PDF source file!`);
    }
  }

  console.log('\n--- 3. Fixing Ward-Only Voters who were falsely given Assembly Membership or Assembly Serials ---');
  // Voters whose sourceDocument is a Ward PDF (e.g. RAIPUR-Ward No-xxx.pdf) AND who do NOT have a real Vidhansabha Assembly record:
  // Check if they were falsely marked hasAssemblyMembership: true or had their voterSerial set to wardVoterSerial
  
  // Find all voters originating strictly from Ward PDFs
  const wardOnlyCandidates = await Member.find({
    'sourceDocument.type': 'pdf',
    'sourceDocument.file': /Ward\s*No/i
  }).select('_id name voterId voterSerial wardVoterSerial wardNumber partNumber hasAssemblyMembership hasMunicipalMembership sourceDocument').lean();

  console.log(`Total Ward PDF originating voters: ${wardOnlyCandidates.length}`);

  // For these voters, check if they exist in the Assembly roll.
  // Real Assembly voters in this DB have sourceDocument.type === 'manual' or came from 2026-EROLL-xxx.pdf
  // or exist in assembly with a genuine partNumber and voterSerial.
  // Let's check which ones are truly ward-only!
  
  let fixedWardOnlyCount = 0;
  const bulkOps = [];

  for (const doc of wardOnlyCandidates) {
    // If doc was created from Ward PDF, but has hasAssemblyMembership: true without being verified against Assembly roll
    // Or doc has voterSerial === wardVoterSerial and no valid assembly source
    const isWardPdfSource = doc.sourceDocument && /Ward\s*No/i.test(doc.sourceDocument.file || '');
    
    if (isWardPdfSource) {
      // Clean up false assembly flags if this was a ward-only import
      // If it's pure ward list entry (like Parsi Devi, Sita, Narayan, Manisha in Ward PDF):
      bulkOps.push({
        updateOne: {
          filter: { _id: doc._id },
          update: {
            $set: {
              hasMunicipalMembership: true,
              hasAssemblyMembership: false,
              partNumber: '', // Clear phantom partNumber
              voterSerial: '', // Clear assembly serial so it doesn't show fake वि.स. क्र.
            }
          }
        }
      });
      fixedWardOnlyCount++;
    }

    if (bulkOps.length >= 1000) {
      await Member.bulkWrite(bulkOps);
      bulkOps.length = 0;
    }
  }

  if (bulkOps.length > 0) {
    await Member.bulkWrite(bulkOps);
    bulkOps.length = 0;
  }

  console.log(`Cleaned up ${fixedWardOnlyCount} Ward-only voters (set hasAssemblyMembership: false, cleared phantom partNumber/voterSerial)!`);

  console.log('\n--- 4. Verify Manisha, Parsi Devi, Narayan, Sita & Raipur Ward 6 ---');
  const checkEpics = ['SNE1533090', 'SNE0404822', 'SNE0404830', 'SNE0404814', 'SNE0404848', 'SNE0313379'];
  const verified = await Member.find({ voterId: { $in: checkEpics } }).lean();
  for (const m of verified) {
    console.log({
      name: m.name,
      voterId: m.voterId,
      gramPanchayat: m.gramPanchayat,
      village: m.village,
      wardNumber: m.wardNumber,
      wardVoterSerial: m.wardVoterSerial,
      partNumber: m.partNumber,
      voterSerial: m.voterSerial,
      hasAssemblyMembership: m.hasAssemblyMembership,
      hasMunicipalMembership: m.hasMunicipalMembership,
      sourceFile: m.sourceDocument?.file
    });
  }

  const raipurW6Count = await Member.countDocuments({
    gramPanchayat: 'रायपुर',
    wardNumber: '6'
  });
  console.log(`\nRemaining true Raipur Ward 6 voters: ${raipurW6Count}`);

  process.exit(0);
}

auditAndClean().catch(err => {
  console.error('Audit and Clean Error:', err);
  process.exit(1);
});
