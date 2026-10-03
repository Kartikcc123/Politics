const mongoose = require('mongoose');
const Member = require('../src/models/Member');
const official29 = require('../src/config/raipurOfficial29Panchayats.json');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://187.127.173.42:27017/political_crm';

const aliases = {
  'पालरां': 'पालरा',
  'पनोतिया': 'पानोतिया',
  'सगरेव': 'सागरेव',
  'पीथाकाखेड़ा': 'पीथाकाखेड़ा'
};

async function checkStatus() {
  await mongoose.connect(MONGO_URI);
  console.log('MongoDB Connected successfully!\n');

  const results = [];
  
  for (let i = 0; i < official29.length; i++) {
    const gp = official29[i];
    const gpName = gp.name;
    const aliasName = aliases[gpName] || gpName;

    // Search with both names if alias exists
    const filterQuery = {
      $or: [
        { gramPanchayat: new RegExp(`^${gpName}$`, 'i') },
        { gramPanchayat: new RegExp(`^${aliasName}$`, 'i') },
        { gramPanchayat: new RegExp(gpName, 'i') }
      ]
    };

    const totalWardVoters = await Member.countDocuments({
      ...filterQuery,
      hasMunicipalMembership: true
    });

    const matchedAssembly = await Member.countDocuments({
      ...filterQuery,
      hasMunicipalMembership: true,
      hasAssemblyMembership: true
    });

    const wardOnly = await Member.countDocuments({
      ...filterQuery,
      hasMunicipalMembership: true,
      hasAssemblyMembership: { $ne: true }
    });

    const totalAssembly = await Member.countDocuments({
      ...filterQuery,
      hasAssemblyMembership: true
    });

    const distinctWards = await Member.distinct('municipalWardNumbers', {
      ...filterQuery,
      hasMunicipalMembership: true
    });
    const validWards = distinctWards.filter(w => w && w !== 'null' && w !== '');

    const isUploaded = totalWardVoters > 0;

    results.push({
      sno: i + 1,
      name: gpName,
      officialWards: gp.wards,
      uploadedWardsCount: validWards.length,
      uploadedWardList: validWards.sort((a,b) => Number(a)-Number(b)).join(','),
      totalWardVoters,
      matchedAssembly,
      wardOnly,
      totalAssembly,
      status: isUploaded ? 'UPLOADED' : 'PENDING'
    });
  }

  const uploaded = results.filter(r => r.status === 'UPLOADED');
  const pending = results.filter(r => r.status === 'PENDING');

  console.log('======================================================================================================');
  console.log(`       रायपुर पंचायत समिति (कुल 29 ग्राम पंचायतें): ${uploaded.length} अपलोड | ${pending.length} बाकी`);
  console.log('======================================================================================================');

  console.log(`\n✅ 1. लाइव सर्वर पर अपलोड हो चुकी ग्राम पंचायतें (${uploaded.length} / 29):`);
  uploaded.forEach((u, idx) => {
    console.log(`   ${idx + 1}. [GP: ${u.name}] - ${u.totalWardVoters} वार्ड मतदाता (वार्ड: ${u.uploadedWardList || 'N/A'}) [मैच: ${u.matchedAssembly} | नए: ${u.wardOnly}]`);
  });

  console.log(`\n⏳ 2. अभी बाकी (PENDING) ग्राम पंचायतें (${pending.length} / 29):`);
  pending.forEach((p, idx) => {
    console.log(`   ${idx + 1}. [GP: ${p.name}] - निर्धारित वार्ड: ${p.officialWards} वार्ड (विधानसभा मतदाता: ${p.totalAssembly})`);
  });

  console.log('\n======================================================================================================\n');
  await mongoose.disconnect();
}

checkStatus().catch(console.error);
