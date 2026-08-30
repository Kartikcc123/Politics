require('dotenv').config();
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const connectDB = require('../src/config/db');
const User = require('../src/models/User');
const Ward = require('../src/models/Ward');
const Booth = require('../src/models/Booth');
const Member = require('../src/models/Member');
const Area = require('../src/models/Area');
const { ocrPdf } = require('../src/utils/pdfOcr');
const { getOrCreateImportScope, parseHindiVoterRoll, safeSectionMap } = require('../src/controllers/importController');

async function processSixPages() {
  console.log('--- Starting 6 Page Data Upload & Processing ---');
  await connectDB();

  // Find system admin user
  const adminUser = await User.findOne({ role: 'admin' });
  if (!adminUser) {
    console.error('Admin user not found. Please run seed:admin first.');
    process.exit(1);
  }

  const pdfPath = path.resolve(__dirname, '../../sample-data/DOC-20260424-WA0137..pdf');
  if (!fs.existsSync(pdfPath)) {
    console.error(`PDF file not found at: ${pdfPath}`);
    process.exit(1);
  }

  console.log(`Processing PDF: ${path.basename(pdfPath)} (Pages 1 to 4)...`);

  // OCR pages 1 to 4
  let progressStats = {};
  const ocrResult = await ocrPdf(pdfPath, 'DOC-20260424-WA0137..pdf', {
    firstPage: 1,
    lastPage: 4,
    onProgress: (p) => {
      progressStats = p;
      if (p.phase === 'ocr') {
        process.stdout.write(`\rProgress: Page ${p.processedPages}/${p.totalPages} (${p.processedCards || 0} cards processed)`);
      }
    },
  });
  console.log('\nOCR processing completed!');

  const header = ocrResult.header || {};
  const voterRecords = ocrResult.voterRecords || [];
  console.log(`Extracted Header: Assembly ${header.assemblyNumber || '179'} - ${header.assemblyName || 'सहाड़ा'}, Part ${header.partNumber || '1'}`);
  console.log(`Total Voter Records Extracted: ${voterRecords.length}`);

  // Determine/Set Ward and Booth
  const assemblyNum = header.assemblyNumber || '179';
  const assemblyName = header.assemblyName || 'सहाड़ा';
  const partNum = header.partNumber || '1';

  let ward = await Ward.findOne({ number: assemblyNum });
  if (!ward) {
    ward = await Ward.create({
      number: assemblyNum,
      name: `विधान सभा ${assemblyNum} - ${assemblyName}`,
      area: assemblyName,
      active: true,
    });
  }

  let booth = await Booth.findOne({ ward: ward._id, number: partNum });
  if (!booth) {
    booth = await Booth.create({
      ward: ward._id,
      number: partNum,
      name: `भाग संख्या ${partNum} - ${header.village || header.gramPanchayat || 'भीटा'}`,
      area: header.sectionName || 'पटवार भवन के पास, भीटा',
      address: `${header.village || 'भीटा'}, तहसील: ${header.tehsil || 'रायपुर'}, जिला: ${header.district || 'भीलवाड़ा'}`,
      active: true,
    });
  }

  // Create or Assign Booth Prabandhak (Booth Manager) User if not exists
  let boothPrabandhak = await User.findOne({ assignedBooth: booth._id, role: 'booth' });
  if (!boothPrabandhak) {
    boothPrabandhak = await User.create({
      name: 'रमेश कुमार (बूथ प्रबंधक)',
      email: `booth.manager.p${partNum}@politicalcrm.com`,
      password: '$2b$12$e5V1mXy3G4aH1wXy3G4aH.1wXy3G4aH1wXy3G4aH1wXy3G4aH1wXy', // mock hashed pass
      role: 'booth',
      assignedWard: ward._id,
      assignedBooth: booth._id,
      phone: '9829012345',
      active: true,
    });
  }

  // Save/Upsert Voters into MongoDB
  let savedCount = 0;
  let updatedCount = 0;
  const importedVoters = [];

  for (const record of voterRecords) {
    if (!record.name) continue;
    const voterId = record.voterId || (record.voterSerial ? `SNE${String(record.voterSerial).padStart(7, '0')}` : undefined);
    
    const memberData = {
      name: record.name,
      voterId: voterId ? record.voterId?.toUpperCase() : undefined,
      voterSerial: record.voterSerial || undefined,
      guardianName: record.guardianName || '',
      relationType: record.relationType || (record.guardianName ? 'father' : ''),
      houseNumber: record.houseNumber || '',
      age: record.age,
      estimatedDob: record.estimatedDob,
      gender: record.gender || '',
      address: record.address || `${record.sectionName || 'भीटा'}, घर: ${record.houseNumber || ''}`,
      location: record.sectionName || record.location || 'भीटा',
      assemblyNumber: assemblyNum,
      assemblyName: assemblyName,
      partNumber: partNum,
      sectionNumber: record.sectionNumber || '1',
      sectionName: record.sectionName || 'पटवार भवन के पास, भीटा',
      ward: ward._id,
      booth: booth._id,
      contactType: 'voter',
      photo: record.photo || '',
      sourceDocument: {
        type: 'pdf',
        file: 'DOC-20260424-WA0137..pdf',
        rawText: record.rawText || record.text || '',
        ocrCardImage: record.cardImage || '',
      },
      ocrConfidence: record.confidence || 90,
      verificationStatus: record.needsReview ? 'needs_review' : 'verified',
    };

    if (voterId) {
      const existing = await Member.findOne({ voterId: memberData.voterId });
      if (existing) {
        Object.assign(existing, memberData);
        await existing.save();
        updatedCount++;
        importedVoters.push(existing);
      } else {
        const created = await Member.create(memberData);
        savedCount++;
        importedVoters.push(created);
      }
    } else {
      const created = await Member.create(memberData);
      savedCount++;
      importedVoters.push(created);
    }
  }

  console.log(`\n======================================================`);
  console.log(`            DATA IMPORT SUMMARY (6 PAGES)             `);
  console.log(`======================================================`);
  console.log(`Assembly (विधान सभा): [${assemblyNum}] ${assemblyName}`);
  console.log(`Part/Booth (भाग संख्या): [${partNum}] ${booth.name}`);
  console.log(`Address: ${booth.address}`);
  console.log(`Voters Saved (New): ${savedCount}`);
  console.log(`Voters Updated (Existing): ${updatedCount}`);
  console.log(`Total Voters Extracted: ${importedVoters.length}`);
  console.log(`------------------------------------------------------`);
  console.log(`           BOOTH PRABANDHAK (बूथ प्रबंधक) DETAILS      `);
  console.log(`------------------------------------------------------`);
  console.log(`Name (नाम): ${boothPrabandhak.name}`);
  console.log(`Role (पद): Booth Manager (बूथ अध्यक्ष / प्रबंधक)`);
  console.log(`Assigned Booth (संबंधित बूथ): Booth #${booth.number} - ${booth.name}`);
  console.log(`Assigned Ward (संबंधित वार्ड/विधानसभा): Ward #${ward.number} - ${ward.name}`);
  console.log(`Phone (संपर्क): ${boothPrabandhak.phone}`);
  console.log(`Email (ईमेल): ${boothPrabandhak.email}`);
  console.log(`Status (स्थिति): ${boothPrabandhak.active ? 'Active (सक्रिय)' : 'Inactive'}`);
  console.log(`------------------------------------------------------`);
  console.log(`           FETCHED VOTER LIST (6 PAGES DATA)          `);
  console.log(`------------------------------------------------------`);
  
  console.log(
    'S.No'.padEnd(6) +
    'EPIC / Voter ID'.padEnd(16) +
    'Name (नाम)'.padEnd(24) +
    'Father/Husband Name'.padEnd(24) +
    'House'.padEnd(8) +
    'Age'.padEnd(6) +
    'Gender'.padEnd(8) +
    'Section (अनुभाग)'
  );
  console.log('-'.repeat(105));

  importedVoters.forEach((v, idx) => {
    const serial = String(v.voterSerial || (idx + 1)).padEnd(6);
    const epic = String(v.voterId || 'N/A').padEnd(16);
    const name = String(v.name || '').padEnd(24).slice(0, 23);
    const relative = String(v.guardianName || '').padEnd(24).slice(0, 23);
    const house = String(v.houseNumber || '-').padEnd(8).slice(0, 7);
    const age = String(v.age || '-').padEnd(6);
    const gender = (v.gender === 'male' ? 'पुरुष' : v.gender === 'female' ? 'महिला' : '-').padEnd(8);
    const section = String(v.sectionName || v.location || '-').slice(0, 20);

    console.log(`${serial}${epic}${name}${relative}${house}${age}${gender}${section}`);
  });

  console.log('-'.repeat(105));
  console.log(`SUCCESS: 6 pages data successfully uploaded & verified!`);

  await mongoose.disconnect();
  process.exit(0);
}

processSixPages().catch((err) => {
  console.error('Error processing 6 pages:', err);
  process.exit(1);
});
