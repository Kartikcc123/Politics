const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const { ocrWardPdf } = require('../src/utils/wardPdfOcr');

async function importWard2() {
  await mongoose.connect('mongodb://187.127.173.42:27017/political_crm');
  console.log('Connected to MongoDB');

  const Member = require('../src/models/Member');
  const pdfPath = 'C:\\Users\\Ashish Sharma\\Downloads\\PEETHA KA KHERA-Ward No-002.pdf';

  if (!fs.existsSync(pdfPath)) {
    console.error('File not found:', pdfPath);
    process.exit(1);
  }

  console.log('Running OCR extraction for Ward 2...');
  const result = await ocrWardPdf(pdfPath, path.basename(pdfPath), {
    onProgress: (p) => {
      if (p.phase === 'ocr') console.log(`[OCR Progress] Page ${p.processedPages}/${p.totalPages}`);
    }
  });

  const gpName = 'पीथाकाखेड़ा';
  const wardNumber = '2';
  const villageName = 'लड़की';
  const records = result.records || [];

  console.log(`\nExtracted ${records.length} voter records from PDF.`);

  let matchedCount = 0;
  let createdCount = 0;
  let deletedCount = 0;

  for (let idx = 0; idx < records.length; idx++) {
    const v = records[idx];
    const cleanEpic = (v.voterId || '').trim();
    const cleanName = (v.name || '').trim();
    const isDeleted = Boolean(v.isDeleted);

    if (isDeleted) {
      deletedCount++;
      if (cleanEpic) {
        await Member.updateOne(
          { voterId: cleanEpic },
          {
            $pull: { municipalWardNumbers: wardNumber },
            $set: { isVoterDeleted: true }
          }
        );
      }
      continue;
    }

    if (!cleanName && !cleanEpic) continue;

    let member = null;
    if (cleanEpic && cleanEpic !== 'N/A') {
      member = await Member.findOne({ voterId: cleanEpic });
    }

    if (!member && cleanName) {
      const escaped = cleanName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      member = await Member.findOne({
        name: new RegExp(`^${escaped}$`, 'i'),
        $or: [
          { village: /लड़की/i },
          { gramPanchayat: /पीथा/i }
        ]
      });
    }

    const normGender = v.gender === 'female' || v.gender === 'F' ? 'female' : 'male';
    const ageNum = Number(v.age) || undefined;

    if (member) {
      matchedCount++;
      await Member.updateOne(
        { _id: member._id },
        {
          $set: {
            wardNumber: wardNumber,
            gramPanchayat: gpName,
            village: villageName,
            hasMunicipalMembership: true,
            partNumber: member.partNumber || '75',
            age: ageNum || member.age,
            gender: normGender || member.gender,
            guardianName: member.guardianName || v.guardianName,
            relationType: member.relationType || v.relationType || 'father',
            houseNumber: v.houseNumber || member.houseNumber,
            sectionName: v.sectionName || member.sectionName
          },
          $addToSet: {
            municipalWardNumbers: wardNumber
          }
        }
      );
    } else {
      createdCount++;
      const uniqueId = cleanEpic && cleanEpic !== 'N/A' ? cleanEpic : `WARD2_PEETHA_${Date.now()}_${idx + 1}`;
      await Member.create({
        voterId: uniqueId,
        name: cleanName || 'अज्ञात मतदाता',
        guardianName: v.guardianName || '',
        relationType: v.relationType || 'father',
        houseNumber: v.houseNumber || '',
        age: ageNum,
        gender: normGender,
        gramPanchayat: gpName,
        village: villageName,
        tehsil: 'रायपुर',
        wardNumber: wardNumber,
        hasAssemblyMembership: true,
        hasMunicipalMembership: true,
        municipalWardNumbers: [wardNumber],
        contactType: 'voter',
        verificationStatus: 'verified',
        partNumber: '75',
        sectionName: v.sectionName || ''
      });
    }
  }

  console.log('\n========================================================================');
  console.log('📊 WARD 2 IMPORT SUMMARY:');
  console.log(`• Total Processed Records:     ${records.length}`);
  console.log(`• Matched with Existing Voters: ${matchedCount}`);
  console.log(`• Newly Created in Database:    ${createdCount}`);
  console.log(`• Deleted / Excluded from Ward: ${deletedCount}`);
  console.log('========================================================================\n');

  const totalWard2InDb = await Member.countDocuments({
    gramPanchayat: /पीथा/i,
    municipalWardNumbers: '2'
  });
  console.log(`👥 Total Live Voters in MongoDB for GP "${gpName}" Ward 2: ${totalWard2InDb}`);

  process.exit(0);
}

importWard2().catch(console.error);
