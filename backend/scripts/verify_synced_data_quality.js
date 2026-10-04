const mongoose = require('mongoose');
const Member = require('../src/models/Member');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://187.127.173.42:27017/political_crm';

async function verify() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB.\n');

  // Check 1: Total Municipal Voters
  const totalMunicipal = await Member.countDocuments({ hasMunicipalMembership: true });
  console.log(`Total Municipal/Ward Voters: ${totalMunicipal}`);

  // Check 2: Voters with mangled font strings in name or guardianName
  const mangledCount = await Member.countDocuments({
    hasMunicipalMembership: true,
    $or: [
      { name: /नरम:|नपतर|पनत|मकरन|सपखजर|दकरल|भकरर|लरल|कचमररत/ },
      { guardianName: /नरम:|नपतर|पनत|मकरन|सपखजर|दकरल|भकरर|लरल|कचमररत/ }
    ]
  });
  console.log(`Voters with mangled font tokens: ${mangledCount}`);

  // Check 3: Missing ward voter serials
  const missingSerials = await Member.countDocuments({
    hasMunicipalMembership: true,
    $or: [
      { wardVoterSerial: { $exists: false } },
      { wardVoterSerial: null },
      { wardVoterSerial: '' }
    ]
  });
  console.log(`Municipal voters with missing ward serial: ${missingSerials}`);

  // Check 4: Sample inspection across 5 different Panchayats
  const sampleGps = ['थला', 'रायपुर', 'पानोतिया', 'भींटा', 'बोराणा'];
  for (const gp of sampleGps) {
    console.log(`\n================== Sample Voters: GP ${gp} ==================`);
    const samples = await Member.find({ gramPanchayat: gp, hasMunicipalMembership: true })
      .sort({ wardNumber: 1, wardVoterSerial: 1 })
      .limit(6)
      .select('name guardianName relationType gramPanchayat village wardNumber wardVoterSerial voterId');
    
    samples.forEach(s => {
      console.log(`   [W${s.wardNumber} #${s.wardVoterSerial}] Name: "${s.name}" | Rel: ${s.relationType} "${s.guardianName}" | Vill: "${s.village}" | EPIC: "${s.voterId || '-'}"`);
    });
  }

  await mongoose.disconnect();
}

verify().catch(console.error);
