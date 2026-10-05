const mongoose = require('mongoose');
const URI = process.env.MONGO_URI || 'mongodb://187.127.173.42:27017/political_crm';

async function audit() {
  await mongoose.connect(URI);
  const Member = mongoose.model('Member', new mongoose.Schema({}, { strict: false }));
  
  // 1. All voters with a sourceDocument.file that is a Ward PDF
  const wardVoters = await Member.find({ 
    'sourceDocument.file': { $regex: /Ward No/i } 
  }).lean();
  console.log(`Total voters with Ward PDF source: ${wardVoters.length}`);

  // 2. How many of them have an exact EPIC match with a REAL assembly voter in DB?
  // Real assembly voters are those with sourceDocument.type === 'manual' OR have booth / pollingStation / assemblyNumber
  const wardEpics = wardVoters.map(v => v.voterId).filter(Boolean);
  
  // Find real assembly members
  const assemblyMembers = await Member.find({
    voterId: { $in: wardEpics },
    $or: [
      { 'sourceDocument.type': 'manual' },
      { 'sourceDocument.file': { $not: { $regex: /Ward No/i } } }
    ]
  }).select('voterId voterSerial partNumber assemblyNumber assemblyName').lean();
  
  const assemblyEpicMap = new Map();
  assemblyMembers.forEach(m => {
    if (m.voterId) assemblyEpicMap.set(m.voterId.toUpperCase(), m);
  });
  console.log(`Of ${wardVoters.length} Ward voters, ${assemblyEpicMap.size} EPICs also exist as real Assembly records in DB.`);

  // 3. For the Ward voters:
  // How many do NOT have an assembly match, but have hasAssemblyMembership: true?
  let falseAssemblyMembership = 0;
  let falsePartNumber = 0;
  let wrongGpCount = 0;

  const GP_NAME_MAP = {
    'THALA': 'थला',
    'SURAS': 'सुरास',
    'SAGREV': 'सागरेव',
    'RAIPUR': 'रायपुर',
    'PALRA': 'पालरा',
    'PANOTIYA': 'पानोतिया',
    'NATHDIYAAS': 'नाथड़ियास',
    'KHEMANA': 'खेमाणा',
    'KOT': 'कोट',
    'NAHRI': 'नाहरी',
    'MASINGHPURA': 'मासिंगपुरा',
    'MOKHUNDA': 'मोखुन्दा',
    'NANDSHA JAGEER': 'नान्दशा जागीर',
    'NARAYAN KHERA': 'नारायणखेड़ा',
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

  for (const v of wardVoters) {
    const epic = v.voterId ? v.voterId.toUpperCase() : '';
    const hasRealAssembly = assemblyEpicMap.has(epic);

    if (!hasRealAssembly) {
      if (v.hasAssemblyMembership === true) falseAssemblyMembership++;
      if (v.partNumber) falsePartNumber++;
    }

    const filePrefix = (v.sourceDocument.file || '').split('-')[0].trim().toUpperCase();
    const expectedGp = GP_NAME_MAP[filePrefix];
    if (expectedGp && v.gramPanchayat !== expectedGp) {
      wrongGpCount++;
    }
  }

  console.log(`False hasAssemblyMembership on Ward-only voters: ${falseAssemblyMembership}`);
  console.log(`False partNumber on Ward-only voters: ${falsePartNumber}`);
  console.log(`Wrong Gram Panchayat on Ward voters: ${wrongGpCount}`);

  process.exit(0);
}
audit().catch(e => { console.error(e); process.exit(1); });
