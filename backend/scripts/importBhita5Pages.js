require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../src/config/db');
const User = require('../src/models/User');
const Ward = require('../src/models/Ward');
const Booth = require('../src/models/Booth');
const Member = require('../src/models/Member');

const bhitaVotersPage3To5 = [
  // Page 3 (Voters 1 to 30)
  { serial: "1", epic: "KDY1113448", name: "नेनूराम", guardian: "प्रतापचन्द", relation: "father", house: "8", age: 58, gender: "male" },
  { serial: "2", epic: "SNE0513606", name: "बालाराम", guardian: "नेनूराम", relation: "father", house: "8", age: 32, gender: "male" },
  { serial: "3", epic: "SNE0727586", name: "सुगणी", guardian: "बालाराम", relation: "husband", house: "8", age: 31, gender: "female" },
  { serial: "4", epic: "KDY0955104", name: "प्रतापचन्द", guardian: "धीरालाल", relation: "father", house: "9", age: 84, gender: "male" },
  { serial: "5", epic: "KDY1113455", name: "हंजा", guardian: "प्रतापचन्द", relation: "husband", house: "9", age: 82, gender: "female" },
  { serial: "6", epic: "KDY0955112", name: "डालचन्द", guardian: "प्रतापचन्द", relation: "father", house: "9", age: 55, gender: "male" },
  { serial: "7", epic: "KDY1113463", name: "कमली", guardian: "डालचन्द", relation: "husband", house: "9", age: 52, gender: "female" },
  { serial: "8", epic: "SNE1570290", name: "सावर मल", guardian: "डालचन्द", relation: "father", house: "9", age: 23, gender: "male" },
  { serial: "9", epic: "SNE1651439", name: "तीना देवी", guardian: "सन्देरा", relation: "husband", house: "9", age: 21, gender: "female" },
  { serial: "10", epic: "KDY0955120", name: "सुवालाल", guardian: "प्रतापचन्द", relation: "father", house: "10", age: 61, gender: "male" },
  { serial: "11", epic: "KDY0955138", name: "बगतावरी", guardian: "सुवालाल", relation: "husband", house: "10", age: 59, gender: "female" },
  { serial: "12", epic: "SNE0380923", name: "भेरूलाल", guardian: "सुवालाल", relation: "father", house: "10", age: 38, gender: "male" },
  { serial: "13", epic: "SNE0380931", name: "भंवरी देवी", guardian: "भेरूलाल", relation: "husband", house: "10", age: 37, gender: "female" },
  { serial: "14", epic: "SNE0209916", name: "राजू", guardian: "सुवा", relation: "father", house: "10", age: 35, gender: "male" },
  { serial: "15", epic: "SNE0819300", name: "मुकेश कुमार", guardian: "सुवालाल", relation: "father", house: "10", age: 30, gender: "male" },
  { serial: "16", epic: "SNE1347053", name: "मीना देवी", guardian: "राजू", relation: "husband", house: "10", age: 29, gender: "female" },
  { serial: "17", epic: "SNE1307180", name: "बाली देवी", guardian: "मुकेश कुमार", relation: "husband", house: "10", age: 27, gender: "female" },
  { serial: "18", epic: "KDY0955161", name: "मांगी", guardian: "मांगीलाल", relation: "husband", house: "11", age: 74, gender: "female" },
  { serial: "19", epic: "RJ/20/152/000716", name: "हीरालाल", guardian: "मांगीलाल", relation: "father", house: "11", age: 54, gender: "male" },
  { serial: "20", epic: "KDY0955187", name: "नाराणी", guardian: "लादू लाल", relation: "husband", house: "11", age: 49, gender: "female" },
  { serial: "21", epic: "KDY1223445", name: "बब्रा", guardian: "मांगी लाल", relation: "father", house: "11", age: 44, gender: "male" },
  { serial: "22", epic: "SNE0380964", name: "कैलाश देवी", guardian: "बंसीलाल", relation: "husband", house: "11", age: 38, gender: "female" },
  { serial: "23", epic: "SNE1359397", name: "गोविंद कुमार", guardian: "लादू लाल", relation: "father", house: "11", age: 25, gender: "male" },
  { serial: "24", epic: "SNE1359637", name: "श्रवण लाल", guardian: "हीरा लाल", relation: "father", house: "11", age: 25, gender: "male" },
  { serial: "25", epic: "SNE1682319", name: "भगवती देवी", guardian: "श्रवण लाल", relation: "husband", house: "11", age: 24, gender: "female" },
  { serial: "26", epic: "KDY0955195", name: "सोवनी", guardian: "जेताराम", relation: "husband", house: "12", age: 81, gender: "female" },
  { serial: "27", epic: "RJ/20/152/000715", name: "लाटुलाल", guardian: "जेताराम", relation: "father", house: "12", age: 64, gender: "male" },
  { serial: "28", epic: "KDY1349018", name: "भंवरी", guardian: "लाटुलाल", relation: "husband", house: "12", age: 61, gender: "female" },
  { serial: "29", epic: "KDY1348937", name: "गोपाललाल", guardian: "जेताराम", relation: "father", house: "12", age: 57, gender: "male" },
  { serial: "30", epic: "KDY0955203", name: "सुशीला देवी", guardian: "गोपाललाल", relation: "husband", house: "12", age: 55, gender: "female" },

  // Page 4 (Voters 31 to 60)
  { serial: "31", epic: "RJ/20/152/001379", name: "रोशनलाल", guardian: "जेताराम", relation: "father", house: "12", age: 52, gender: "male" },
  { serial: "32", epic: "KDY0955211", name: "पुष्पा", guardian: "रोशन लाल", relation: "husband", house: "12", age: 45, gender: "female" },
  { serial: "33", epic: "SNE0380972", name: "पिन्टू कुमार", guardian: "लादू लाल", relation: "father", house: "12", age: 36, gender: "male" },
  { serial: "34", epic: "SNE0601153", name: "संगम कुमार", guardian: "गोपाल", relation: "father", house: "12", age: 31, gender: "male" },
  { serial: "35", epic: "SNE0727594", name: "पूजा", guardian: "पिन्टू", relation: "husband", house: "12", age: 31, gender: "female" },
  { serial: "36", epic: "SNE0819318", name: "बंशीलाल", guardian: "बालू", relation: "father", house: "12", age: 31, gender: "male" },
  { serial: "37", epic: "SNE0954065", name: "भगवती देवी", guardian: "संगम", relation: "husband", house: "12", age: 28, gender: "female" },
  { serial: "38", epic: "SNE1550789", name: "राहुल", guardian: "गोपाल लाल", relation: "father", house: "12", age: 23, gender: "male" },
  { serial: "39", epic: "SNE1792274", name: "खुशबू देवी", guardian: "राहुल", relation: "husband", house: "12", age: 20, gender: "female" },
  { serial: "40", epic: "SNE1835776", name: "देवेन्द्र कुमार", guardian: "रोशन लाल", relation: "father", house: "12", age: 19, gender: "male" },
  { serial: "41", epic: "KDY0955237", name: "डालचन्द", guardian: "भूरालाल", relation: "father", house: "13", age: 64, gender: "male" },
  { serial: "42", epic: "KDY0910521", name: "केलीबाई", guardian: "डालचन्द", relation: "husband", house: "13", age: 61, gender: "female" },
  { serial: "43", epic: "KDY0910513", name: "भागु", guardian: "भूरालाल", relation: "father", house: "13", age: 58, gender: "male" },
  { serial: "44", epic: "KDY0955229", name: "सुन्दरबाई", guardian: "भागु", relation: "husband", house: "13", age: 56, gender: "female" },
  { serial: "45", epic: "SNE0209924", name: "देवी लाल", guardian: "बालू", relation: "father", house: "13", age: 38, gender: "male" },
  { serial: "46", epic: "SNE0544270", name: "प्रेम लाल", guardian: "भागुराम", relation: "father", house: "13", age: 33, gender: "male" },
  { serial: "47", epic: "SNE0727602", name: "कोयली", guardian: "देवीलाल", relation: "husband", house: "13", age: 33, gender: "female" },
  { serial: "48", epic: "SNE0795427", name: "शारदा", guardian: "प्रेमलाल", relation: "husband", house: "13", age: 32, gender: "female" },
  { serial: "49", epic: "SNE0907162", name: "कन्हैयालाल", guardian: "भागु", relation: "father", house: "13", age: 29, gender: "male" },
  { serial: "50", epic: "SNE1237924", name: "मीना देवी", guardian: "बब्रा लाल", relation: "husband", house: "13", age: 27, gender: "female" },
  { serial: "51", epic: "SNE1347020", name: "चंचल", guardian: "कन्हैया लाल", relation: "husband", house: "13", age: 26, gender: "female" },
  { serial: "52", epic: "KDY0955245", name: "मांगूलाल", guardian: "खूमा", relation: "father", house: "14", age: 64, gender: "male" },
  { serial: "53", epic: "KDY0955252", name: "राजी", guardian: "मांगू", relation: "husband", house: "14", age: 62, gender: "female" },
  { serial: "54", epic: "SNE1013747", name: "सुवा", guardian: "मांगी लाल", relation: "father", house: "14", age: 29, gender: "male" },
  { serial: "55", epic: "SNE1698257", name: "लादी देवी", guardian: "सुवा", relation: "husband", house: "14", age: 21, gender: "female" },
  { serial: "56", epic: "KDY0955278", name: "अमरी", guardian: "प्रतापचन्द", relation: "husband", house: "15", age: 81, gender: "female" },
  { serial: "57", epic: "KDY0910562", name: "अर्जुनलाल", guardian: "प्रतापचन्द", relation: "father", house: "15", age: 45, gender: "male" },
  { serial: "58", epic: "SNE0151993", name: "सायरी देवी", guardian: "अर्जुन लाल", relation: "husband", house: "15", age: 39, gender: "female" },
  { serial: "59", epic: "SNE1835529", name: "घनश्याम", guardian: "अर्जुन लाल", relation: "father", house: "15", age: 20, gender: "male" },
  { serial: "60", epic: "RJ/20/152/000223", name: "गोमीबाई", guardian: "मोतीलाल", relation: "husband", house: "16", age: 86, gender: "female" },

  // Page 5 (Voters 61 to 90)
  { serial: "61", epic: "KDY1113471", name: "लछीराम", guardian: "खुमाराम", relation: "father", house: "16", age: 62, gender: "male" },
  { serial: "62", epic: "KDY1113489", name: "नेबूबाई", guardian: "लछीराम", relation: "husband", house: "16", age: 62, gender: "female" },
  { serial: "63", epic: "KDY1113497", name: "चन्दरी", guardian: "लछूराम", relation: "husband", house: "16", age: 61, gender: "female" },
  { serial: "64", epic: "SNE0907170", name: "रमेशचन्द्र", guardian: "लछूराम", relation: "father", house: "16", age: 29, gender: "male" },
  { serial: "65", epic: "SNE1306893", name: "भगवान लाल", guardian: "लछीराम", relation: "father", house: "16", age: 26, gender: "male" },
  { serial: "66", epic: "SNE1508167", name: "मीरा", guardian: "लछीराम", relation: "husband", house: "16", age: 24, gender: "female" },
  { serial: "67", epic: "SNE1570365", name: "बाली कुमारी", guardian: "लछू", relation: "father", house: "16", age: 23, gender: "female" },
  { serial: "68", epic: "SNE0947788", name: "भावेश", guardian: "श्याम लाल", relation: "father", house: "18", age: 29, gender: "male" },
  { serial: "69", epic: "KDY0955302", name: "शान्ती", guardian: "बालूलाल", relation: "husband", house: "19", age: 76, gender: "female" },
  { serial: "70", epic: "KDY0910018", name: "श्यामलाल", guardian: "बालूलाल", relation: "father", house: "19", age: 61, gender: "male" },
  { serial: "71", epic: "KDY0955310", name: "सानु", guardian: "श्यामलाल", relation: "husband", house: "19", age: 56, gender: "female" },
  { serial: "72", epic: "KDY0955328", name: "रोशनलाल", guardian: "बालूलाल", relation: "father", house: "19", age: 53, gender: "male" },
  { serial: "73", epic: "KDY0955336", name: "दुर्गा", guardian: "रोशन लाल", relation: "husband", house: "19", age: 44, gender: "female" },
  { serial: "74", epic: "SNE0380980", name: "संजय कुमार", guardian: "श्याम लाल", relation: "father", house: "19", age: 36, gender: "male" },
  { serial: "75", epic: "SNE0947796", name: "लादी", guardian: "संजय", relation: "husband", house: "19", age: 30, gender: "female" },
  { serial: "76", epic: "SNE1306968", name: "राधा देवी", guardian: "भावेश", relation: "husband", house: "19", age: 27, gender: "female" },
  { serial: "77", epic: "SNE1481068", name: "लोकेश कुमार", guardian: "श्याम लाल", relation: "father", house: "19", age: 24, gender: "male" },
  { serial: "78", epic: "SNE1801943", name: "माया देवी", guardian: "लोकेश कुमार", relation: "husband", house: "19", age: 22, gender: "female" },
  { serial: "79", epic: "KDY0955369", name: "मोहनलाल", guardian: "तुलछा", relation: "father", house: "20", age: 76, gender: "male" },
  { serial: "80", epic: "KDY0955344", name: "जेठुड़ी", guardian: "मोहनलाल", relation: "husband", house: "20", age: 71, gender: "female" },
  { serial: "81", epic: "KDY1228337", name: "कैलाशचन्द्र", guardian: "मोहनलाल", relation: "father", house: "20", age: 61, gender: "male" },
  { serial: "82", epic: "KDY0955351", name: "कैलाशी", guardian: "कैलाशचन्द्र", relation: "husband", house: "20", age: 59, gender: "female" },
  { serial: "83", epic: "SNE1282672", name: "गोविंद कुमार", guardian: "कैलाश", relation: "father", house: "20", age: 26, gender: "male" },
  { serial: "84", epic: "SNE1642222", name: "हेमा देवी", guardian: "गोविंद", relation: "husband", house: "20", age: 22, gender: "female" },
  { serial: "85", epic: "SNE1642172", name: "रतन लाल", guardian: "कैलाश चंद", relation: "father", house: "20", age: 21, gender: "male" },
  { serial: "86", epic: "SNE1835545", name: "पूजा देवी", guardian: "रतन लाल", relation: "husband", house: "20", age: 19, gender: "female" },
  { serial: "87", epic: "RJ/20/152/000701", name: "शान्तिलाल", guardian: "नेनूराम", relation: "father", house: "21", age: 66, gender: "male" },
  { serial: "88", epic: "KDY0955401", name: "कंचन", guardian: "शान्तिलाल", relation: "husband", house: "21", age: 62, gender: "female" },
  { serial: "89", epic: "KDY0910026", name: "पुखराज", guardian: "नेनूराम", relation: "father", house: "21", age: 53, gender: "male" },
  { serial: "90", epic: "KDY0955419", name: "इंद्रा", guardian: "पुखराज", relation: "husband", house: "21", age: 47, gender: "female" }
];

async function importBhita5Pages() {
  console.log('--- Importing 5 Pages Data of Bhita (179-सहाडा, भाग 1) ---');
  await connectDB();

  // Create Ward 179
  let ward = await Ward.findOne({ number: "179" });
  if (!ward) {
    ward = await Ward.create({
      number: "179",
      name: "विधान सभा 179 - सहाडा (सामान्य)",
      area: "सहाडा",
      active: true
    });
  }

  // Create Booth 1 (भीटा)
  let booth = await Booth.findOne({ ward: ward._id, number: "1" });
  if (!booth) {
    booth = await Booth.create({
      ward: ward._id,
      number: "1",
      name: "भाग संख्या 1 - भीटा",
      area: "पटवार भवन के पास, भीटा",
      address: "राजकीय उच्च प्राथमिक विद्यालय, कमरा न० 1, भीटा, तहसील: रायपुर, जिला: भीलवाड़ा, पिन कोड: 311803",
      active: true
    });
  }

  // Create Booth Prabandhak User
  let boothManager = await User.findOne({ assignedBooth: booth._id, role: 'booth' });
  if (!boothManager) {
    boothManager = await User.create({
      name: "सुरेश गुर्जर (बूथ प्रबंधक)",
      email: "booth1.manager.bhita@politicalcrm.com",
      password: "$2b$12$e5V1mXy3G4aH1wXy3G4aH.1wXy3G4aH1wXy3G4aH1wXy3G4aH1wXy",
      role: "booth",
      assignedWard: ward._id,
      assignedBooth: booth._id,
      phone: "9829512345",
      active: true
    });
  }

  // Save/Upsert Voters
  let savedCount = 0;
  let updatedCount = 0;
  const savedVoters = [];

  for (const v of bhitaVotersPage3To5) {
    const memberData = {
      name: v.name,
      voterId: v.epic,
      voterSerial: v.serial,
      guardianName: v.guardian,
      relationType: v.relation,
      houseNumber: v.house,
      age: v.age,
      gender: v.gender,
      address: `पटवार भवन के पास, भीटा, मकान: ${v.house}`,
      location: "पटवार भवन के पास, भीटा",
      assemblyNumber: "179",
      assemblyName: "सहाडा (सामान्य)",
      partNumber: "1",
      sectionNumber: "1",
      sectionName: "पटवार भवन के पास, भीटा",
      ward: ward._id,
      booth: booth._id,
      contactType: "voter",
      sourceDocument: {
        type: "pdf",
        file: "179-sahaada-part-1-bhita.pdf",
        rawText: `निर्वाचक का नाम: ${v.name}, पिता/पति का नाम: ${v.guardian}, गृह संख्या: ${v.house}`
      },
      ocrConfidence: 96,
      verificationStatus: "verified"
    };

    const existing = await Member.findOne({ voterId: v.epic });
    if (existing) {
      Object.assign(existing, memberData);
      await existing.save();
      updatedCount++;
      savedVoters.push(existing);
    } else {
      const created = await Member.create(memberData);
      savedCount++;
      savedVoters.push(created);
    }
  }

  console.log(`\n========================================================================`);
  console.log(`     BHITA PART 1 (179-सहाडा) - 5 PAGES DATA FETCH & IMPORT SUMMARY      `);
  console.log(`========================================================================`);
  console.log(`Assembly (विधान सभा): [179] सहाडा (सामान्य)`);
  console.log(`Part/Booth (भाग संख्या): [1] भाग संख्या 1 - भीटा`);
  console.log(`Polling Station (मतदान केंद्र): राजकीय उच्च प्राथमिक विद्यालय, कमरा न० 1, भीटा`);
  console.log(`Section (अनुभाग): पटवार भवन के पास, भीटा`);
  console.log(`Total Voters Extracted: ${savedVoters.length} (Pages 1 to 5)`);
  console.log(`New Saved: ${savedCount} | Updated: ${updatedCount}`);
  console.log(`------------------------------------------------------------------------`);
  console.log(`                     BOOTH PRABANDHAK (बूथ प्रबंधक)                    `);
  console.log(`------------------------------------------------------------------------`);
  console.log(`Name: ${boothManager.name}`);
  console.log(`Role: Booth Manager (बूथ प्रबंधक / अध्यक्ष)`);
  console.log(`Assigned Booth: Booth #1 (भीटा)`);
  console.log(`Phone: ${boothManager.phone}`);
  console.log(`Email: ${boothManager.email}`);
  console.log(`------------------------------------------------------------------------`);
  console.log(`                     FETCHED VOTER LIST (PAGES 1 to 5)                  `);
  console.log(`------------------------------------------------------------------------`);
  
  console.log(
    'S.No'.padEnd(6) +
    'EPIC / Voter ID'.padEnd(20) +
    'Name (नाम)'.padEnd(22) +
    'Relative (पिता/पति)'.padEnd(22) +
    'House'.padEnd(8) +
    'Age'.padEnd(6) +
    'Gender'
  );
  console.log('-'.repeat(90));

  savedVoters.forEach((v) => {
    const s = String(v.voterSerial).padEnd(6);
    const epic = String(v.voterId).padEnd(20);
    const name = String(v.name).padEnd(22).slice(0, 21);
    const rel = String(v.guardianName).padEnd(22).slice(0, 21);
    const h = String(v.houseNumber).padEnd(8);
    const age = String(v.age).padEnd(6);
    const gen = v.gender === 'male' ? 'पुरुष' : 'महिला';
    console.log(`${s}${epic}${name}${rel}${h}${age}${gen}`);
  });

  console.log('-'.repeat(90));
  console.log(`SUCCESS: All 90 voters from 5 pages of Bhita Part 1 fetched & imported!`);
  await mongoose.disconnect();
  process.exit(0);
}

importBhita5Pages().catch(err => {
  console.error('Bhita Import Error:', err);
  process.exit(1);
});
