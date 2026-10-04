const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Member = require('../src/models/Member');
const { parseWardPdfFull } = require('./master_import_all_29_panchayats');

async function compareRaipurPdfVsDb() {
  await mongoose.connect('mongodb://187.127.173.42:27017/political_crm');

  const raipurDir = 'C:\\Users\\Ashish Sharma\\Downloads\\Raipur';
  const pdfFiles = fs.readdirSync(raipurDir).filter(f => f.endsWith('.pdf'));

  console.log('--- रायपुर: PDF बनाम लाइव डेटाबेस तुलना ---');
  
  const comparison = [];

  for (let i = 1; i <= 17; i++) {
    const padWard = String(i).padStart(3, '0');
    const pdfFile = pdfFiles.find(f => f.includes(`No-${padWard}`) || f.includes(`No-${i}.`));
    
    let pdfVoterCount = 0;
    let pdfMaxSerial = 0;

    if (pdfFile) {
      const fullPath = path.join(raipurDir, pdfFile);
      const voters = parseWardPdfFull(fullPath, 'रायपुर', 'रायपुर');
      const activeVoters = voters.filter(v => !v.isDeleted);
      pdfVoterCount = activeVoters.length;
      pdfMaxSerial = activeVoters.length > 0 ? Math.max(...activeVoters.map(v => v.serial || 0)) : 0;
    }

    const dbVoters = await Member.find({
      gramPanchayat: 'रायपुर',
      wardNumber: String(i)
    }).select('name voterId wardVoterSerial hasAssemblyMembership hasMunicipalMembership');

    comparison.push({
      ward: `वार्ड ${i}`,
      pdfFile: pdfFile || 'Not Found',
      pdfActiveVoters: pdfVoterCount,
      liveDbVoters: dbVoters.length,
      difference: dbVoters.length - pdfVoterCount,
      status: (dbVoters.length >= pdfVoterCount) ? '✅ 100% सुरक्षित (No Missing)' : '⚠️ Check'
    });
  }

  console.table(comparison);
  process.exit(0);
}

compareRaipurPdfVsDb();
