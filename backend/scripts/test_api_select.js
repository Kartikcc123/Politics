const mongoose = require('mongoose');
const Member = require('../src/models/Member');

async function testApiSelect() {
  await mongoose.connect('mongodb://187.127.173.42:27017/political_crm');
  
  const docs = await Member.find({ gramPanchayat: 'भींटा', wardNumber: '1' })
    .select('contactType photo ocrCardImage cardImage name surname relativeName mobile altMobile dob estimatedDob anniversary voterId voterSerial wardVoterSerial wardSerialMap wardNumber guardianName houseNumber address location area tehsil gramPanchayat village municipality caste subCaste organizationPost organizationLevel influenceLevel occupation workplaceState workplaceCity workplaceVillage spouseName marriageState marriageCity marriageVillage education extraDetails supportLevel partyPreference isFavorite favoriteRating groups labels ward booth updatedAt age gender sectionNumber sectionName assemblyNumber assemblyName partNumber partName postOffice policeStation district pinCode verificationStatus profileCompletionStatus profileCompletedBy profileCompletedAt ocrConfidence houseNumberConfidence locationMatchConfidence locationResolution ocrReviewReasons ocrValidationPassed ocrFieldConfidence ocrValues sourceDocument hasAssemblyMembership hasMunicipalMembership municipalWardNumbers googleMapUrl')
    .sort({ wardVoterSerial: 1 })
    .collation({ locale: 'en', numericOrdering: true, strength: 1 })
    .limit(10)
    .lean();

  console.log('--- TEST MEMBERS API RETURN FOR BHEETA WARD 1 ---');
  docs.forEach((d, idx) => {
    console.log(`${idx + 1}. [Ward Serial: #${d.wardVoterSerial || '-'}] [Assembly Serial: #${d.voterSerial || '-'}] [EPIC: ${d.voterId}] Name: ${d.name} (${d.guardianName}), Village: ${d.village}, Ward: ${d.wardNumber}`);
  });

  await mongoose.disconnect();
}

testApiSelect().catch(console.error);
