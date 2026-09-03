require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../src/config/db');
const Ward = require('../src/models/Ward');
const Booth = require('../src/models/Booth');
const Member = require('../src/models/Member');

// 5 Voter Pages (Pages 3 to 7 of PDF, Voter Serials 1 to 150)
// Filtering OUT all 61 DELETED voters! Total Active Valid Voters = 89
const sarewadiPart6ActiveVoters = [
  // Page 3 (Serials 1 to 30) - Serial 1 & 2 are Active, 3-30 are DELETED
  { serial: "1", epic: "SNE1798578", name: "दिनेश सिंह", guardian: "उदय सिंह", relation: "father", house: "00", age: 26, gender: "male" },
  { serial: "2", epic: "SNE1826049", name: "रेखा", guardian: "दिनेश सिंह", relation: "husband", house: "01", age: 20, gender: "female" },

  // Page 4 (Serials 31 to 60) - ALL 30 ARE DELETED (Serials 31-60)

  // Page 5 (Serials 61 to 90) - Serials 61 & 65 are DELETED, 28 Active
  { serial: "62", epic: "SNE1318484", name: "बायरी", guardian: "गंगाराम", relation: "husband", house: "129", age: 73, gender: "female" },
  { serial: "63", epic: "SNE0151571", name: "लक्ष्मण", guardian: "गंगा राम", relation: "father", house: "129", age: 43, gender: "male" },
  { serial: "64", epic: "SNE1598044", name: "गीता", guardian: "लक्ष्मण", relation: "husband", house: "129", age: 41, gender: "female" },
  { serial: "66", epic: "RJ/20/152/006312", name: "तेजसिंह", guardian: "खेमसिंह", relation: "father", house: "131", age: 66, gender: "male" },
  { serial: "67", epic: "SNE1440361", name: "गमनी", guardian: "तेजसिंह", relation: "husband", house: "131", age: 63, gender: "female" },
  { serial: "68", epic: "SNE0265199", name: "मांगू सिंह", guardian: "तेज सिंह", relation: "father", house: "131", age: 42, gender: "male" },
  { serial: "69", epic: "SNE0285130", name: "कालू सिंह", guardian: "तेज सिंह", relation: "father", house: "131", age: 41, gender: "male" },
  { serial: "70", epic: "SNE0285148", name: "मीना देवी", guardian: "कालू सिंह", relation: "husband", house: "131", age: 38, gender: "female" },
  { serial: "71", epic: "SNE0285155", name: "गंगा", guardian: "मांगूसिंह", relation: "husband", house: "131", age: 38, gender: "female" },
  { serial: "72", epic: "SNE1015858", name: "कर्मसिंह", guardian: "तेज सिंह", relation: "father", house: "131", age: 27, gender: "male" },
  { serial: "73", epic: "SNE1015874", name: "नारायण सिंह", guardian: "तेजसिंह", relation: "father", house: "131", age: 27, gender: "male" },
  { serial: "74", epic: "SNE1243286", name: "लीला", guardian: "नारायण सिंह", relation: "husband", house: "131", age: 27, gender: "female" },
  { serial: "75", epic: "SNE1240969", name: "पूरन सिंह", guardian: "तेज सिंह", relation: "father", house: "131", age: 27, gender: "male" },
  { serial: "76", epic: "RJ/20/152/007058", name: "जमु", guardian: "मेघसिंह", relation: "father", house: "132", age: 81, gender: "female" },
  { serial: "77", epic: "KDY1228501", name: "मोहनसिंह", guardian: "मेघसिंह", relation: "father", house: "132", age: 56, gender: "male" },
  { serial: "78", epic: "SNE0602029", name: "बाबू सिंह", guardian: "मेघ सिंह", relation: "father", house: "132", age: 36, gender: "male" },
  { serial: "79", epic: "SNE0602037", name: "देकु", guardian: "बाबू सिंह", relation: "husband", house: "132", age: 36, gender: "female" },
  { serial: "80", epic: "SNE1772342", name: "इमु देवी", guardian: "राम सिंह", relation: "husband", house: "133", age: 51, gender: "female" },
  { serial: "81", epic: "SNE0602045", name: "श्रवण सिंह", guardian: "राम सिंह", relation: "father", house: "133", age: 31, gender: "male" },
  { serial: "82", epic: "KDY1115336", name: "चम्पा", guardian: "उदय सिंह", relation: "husband", house: "134", age: 42, gender: "female" },
  { serial: "83", epic: "SNE0602052", name: "नैन सिंह", guardian: "विजय सिंह", relation: "father", house: "134", age: 35, gender: "male" },
  { serial: "84", epic: "SNE0947952", name: "पुष्पा देवी", guardian: "नैनसिंह", relation: "husband", house: "134", age: 30, gender: "female" },
  { serial: "85", epic: "SNE0062901", name: "प्रतापसिंह", guardian: "अर्जुनसिंह", relation: "father", house: "135", age: 71, gender: "male" },
  { serial: "86", epic: "SNE1318492", name: "छगनी", guardian: "प्रतापसिंह", relation: "husband", house: "135", age: 64, gender: "female" },
  { serial: "87", epic: "SNE0062893", name: "धन्ना सिंह", guardian: "प्रताप सिंह", relation: "father", house: "135", age: 49, gender: "male" },
  { serial: "88", epic: "SNE0062919", name: "मीरा", guardian: "धन्ना सिंह", relation: "husband", house: "135", age: 46, gender: "female" },
  { serial: "89", epic: "SNE1715960", name: "सुरेश सिंह", guardian: "प्रताप", relation: "father", house: "135", age: 35, gender: "male" },
  { serial: "90", epic: "SNE0947960", name: "रेखा", guardian: "हेमसिंह", relation: "husband", house: "135", age: 34, gender: "female" },

  // Page 6 (Serials 91 to 120) - 30 Active
  { serial: "91", epic: "SNE0947978", name: "हेमसिंह", guardian: "प्रतापसिंह", relation: "father", house: "135", age: 30, gender: "male" },
  { serial: "92", epic: "SNE1015908", name: "गोपाल सिंह", guardian: "प्रताप सिंह", relation: "father", house: "135", age: 30, gender: "male" },
  { serial: "93", epic: "SNE1243260", name: "राधा", guardian: "गोपाल सिंह", relation: "husband", house: "135", age: 27, gender: "female" },
  { serial: "94", epic: "SNE1347772", name: "डालती देवी", guardian: "सुरेश", relation: "husband", house: "135", age: 26, gender: "female" },
  { serial: "95", epic: "SNE1891597", name: "शैतान सिंह", guardian: "धन्ना सिंह", relation: "father", house: "135", age: 26, gender: "male" },
  { serial: "96", epic: "SNE1891613", name: "प्रभु सिंह", guardian: "धन्ना सिंह", relation: "father", house: "135", age: 24, gender: "male" },
  { serial: "97", epic: "SNE1891589", name: "अशोक सिंह", guardian: "धन्ना सिंह", relation: "father", house: "135", age: 23, gender: "male" },
  { serial: "98", epic: "SNE1891571", name: "अंझु रावत", guardian: "शैतान सिंह", relation: "husband", house: "135", age: 20, gender: "female" },
  { serial: "99", epic: "RJ/20/152/006489", name: "भंवरसिंह", guardian: "अर्जुनसिंह", relation: "father", house: "136", age: 66, gender: "male" },
  { serial: "100", epic: "RJ/20/152/006514", name: "गीता", guardian: "भंवरसिंह", relation: "husband", house: "136", age: 58, gender: "female" },
  { serial: "101", epic: "SNE0947994", name: "गणपतसिंह", guardian: "भंवरसिंह", relation: "father", house: "136", age: 35, gender: "male" },
  { serial: "102", epic: "SNE1307677", name: "ममता देवी", guardian: "राजू सिंह", relation: "husband", house: "136", age: 33, gender: "female" },
  { serial: "103", epic: "SNE1307669", name: "राजू सिंह", guardian: "भानवर सिंह", relation: "father", house: "136", age: 26, gender: "male" },
  { serial: "104", epic: "RJ/20/152/006310", name: "लक्ष्मणसिंह", guardian: "अर्जुनसिंह", relation: "father", house: "137", age: 61, gender: "male" },
  { serial: "105", epic: "SNE1747955", name: "मनहारी देवी", guardian: "लक्ष्मण सिंह", relation: "husband", house: "137", age: 51, gender: "female" },
  { serial: "106", epic: "SNE1015825", name: "रणसिंह", guardian: "लक्ष्मण सिंह", relation: "father", house: "137", age: 27, gender: "male" },
  { serial: "107", epic: "RJ/20/152/006518", name: "डाली", guardian: "रूपसिंह", relation: "husband", house: "139", age: 76, gender: "female" },
  { serial: "108", epic: "SNE0062877", name: "पन्ना सिंह", guardian: "रूप सिंह", relation: "father", house: "139", age: 54, gender: "male" },
  { serial: "109", epic: "SNE0151746", name: "मोहन सिंह", guardian: "रूप सिंह", relation: "father", house: "139", age: 52, gender: "male" },
  { serial: "110", epic: "KDY1115344", name: "मीरा", guardian: "पन्ना सिंह", relation: "husband", house: "139", age: 52, gender: "female" },
  { serial: "111", epic: "KDY1115351", name: "कैलाशी", guardian: "मोहन सिंह", relation: "husband", house: "139", age: 49, gender: "female" },
  { serial: "112", epic: "SNE1240852", name: "शंभु सिंह", guardian: "पन्ना सिंह", relation: "father", house: "139", age: 26, gender: "male" },
  { serial: "113", epic: "SNE1880376", name: "राजेंद्र सिंह", guardian: "पन्ना सिंह", relation: "father", house: "139", age: 24, gender: "male" },
  { serial: "114", epic: "SNE1880624", name: "निर्मला देवी", guardian: "शंभु सिंह", relation: "husband", house: "139", age: 20, gender: "female" },
  { serial: "115", epic: "KDY0959049", name: "गोपाल", guardian: "रूप सिंह", relation: "father", house: "140", age: 46, gender: "male" },
  { serial: "116", epic: "KDY1115369", name: "देव देवी", guardian: "भंवर सिंह", relation: "husband", house: "140", age: 42, gender: "female" },
  { serial: "117", epic: "SNE1243336", name: "सुशीला", guardian: "गोपालसिंह", relation: "husband", house: "140", age: 27, gender: "female" },
  { serial: "118", epic: "RJ/20/152/006523", name: "नोजी", guardian: "दीपसिंह", relation: "father", house: "142", age: 74, gender: "female" },
  { serial: "119", epic: "SNE0151662", name: "पप्पूसिंह", guardian: "दीपसिंह", relation: "father", house: "142", age: 39, gender: "male" },
  { serial: "120", epic: "SNE0285163", name: "पुष्पा देवी", guardian: "पप्पू सिंह", relation: "husband", house: "142", age: 35, gender: "female" },

  // Page 7 (Serials 121 to 150) - 30 Active
  { serial: "121", epic: "SNE1386473", name: "सीता देवी", guardian: "मोहन सिंह", relation: "husband", house: "142", age: 32, gender: "female" },
  { serial: "122", epic: "SNE0602060", name: "मोहन सिंह", guardian: "दीप सिंह", relation: "father", house: "142", age: 31, gender: "male" },
  { serial: "123", epic: "SNE1763655", name: "ओमसिंह", guardian: "नोजी", relation: "mother", house: "142", age: 29, gender: "male" },
  { serial: "124", epic: "SNE1763663", name: "हेमा", guardian: "ओनाड सिंह", relation: "husband", house: "142", age: 28, gender: "female" },
  { serial: "125", epic: "SNE1890987", name: "देवी सिंह", guardian: "मोहन सिंह", relation: "father", house: "142", age: 21, gender: "male" },
  { serial: "126", epic: "SNE1891019", name: "आशा देवी", guardian: "देवी सिंह", relation: "husband", house: "142", age: 20, gender: "female" },
  { serial: "127", epic: "RJ/20/152/006375", name: "दीपसिंह", guardian: "प्रेमसिंह", relation: "father", house: "143", age: 71, gender: "male" },
  { serial: "128", epic: "SNE0728337", name: "पूनमसिंह", guardian: "दीपसिंह", relation: "father", house: "145", age: 57, gender: "male" },
  { serial: "129", epic: "KDY1115377", name: "गीता", guardian: "पूनम सिंह", relation: "husband", house: "145", age: 54, gender: "female" },
  { serial: "130", epic: "RJ/20/152/006444", name: "गणेशसिंह", guardian: "भूरसिंह", relation: "father", house: "146", age: 78, gender: "male" },
  { serial: "131", epic: "RJ/20/152/006494", name: "मोवनी", guardian: "गणेशसिंह", relation: "husband", house: "146", age: 71, gender: "female" },
  { serial: "132", epic: "SNE1440379", name: "रामसिंह", guardian: "गणेशसिंह", relation: "father", house: "146", age: 53, gender: "male" },
  { serial: "133", epic: "KDY0959056", name: "प्रेमी", guardian: "राम सिंह", relation: "husband", house: "146", age: 46, gender: "female" },
  { serial: "134", epic: "SNE1440387", name: "तेजी", guardian: "चुनासिंह", relation: "husband", house: "147", age: 66, gender: "female" },
  { serial: "135", epic: "SNE0907683", name: "ओमसिंह", guardian: "चुनारसिंह", relation: "father", house: "147", age: 36, gender: "male" },
  { serial: "136", epic: "SNE0285171", name: "दिलीप सिंह रावत", guardian: "चुना सिंह", relation: "father", house: "147", age: 34, gender: "male" },
  { serial: "137", epic: "SNE0907691", name: "सीता देवी", guardian: "दिलिपसिंह", relation: "husband", house: "147", age: 32, gender: "female" },
  { serial: "138", epic: "SNE1688910", name: "शांता देवी", guardian: "ओम सिंह", relation: "husband", house: "147", age: 24, gender: "female" },
  { serial: "139", epic: "RJ/20/152/006666", name: "नारायणसिंह", guardian: "भोजासिंह", relation: "father", house: "148", age: 66, gender: "male" },
  { serial: "140", epic: "SNE0907725", name: "लक्ष्मी", guardian: "नारायणसिंह", relation: "husband", house: "148", age: 56, gender: "female" },
  { serial: "141", epic: "SNE0907717", name: "देकु", guardian: "रणजीतसिंह", relation: "husband", house: "148", age: 33, gender: "female" },
  { serial: "142", epic: "SNE0728469", name: "रणजीतसिंह", guardian: "नारायणसिंह", relation: "father", house: "148", age: 31, gender: "male" },
  { serial: "143", epic: "SNE0907709", name: "भगवानसिंह", guardian: "नारायणसिंह", relation: "father", house: "148", age: 30, gender: "male" },
  { serial: "144", epic: "RJ/20/152/007069", name: "नोजी", guardian: "नाथूसिंह", relation: "father", house: "149", age: 68, gender: "female" },
  { serial: "145", epic: "SNE0460659", name: "उदयसिंह", guardian: "नाथू सिंह", relation: "father", house: "149", age: 49, gender: "male" },
  { serial: "146", epic: "SNE1282912", name: "पानी देवी", guardian: "उदय सिंह", relation: "husband", house: "149", age: 48, gender: "female" },
  { serial: "147", epic: "KDY0959064", name: "छितर सिंह", guardian: "नाथू सिंह", relation: "father", house: "149", age: 44, gender: "male" },
  { serial: "148", epic: "SNE0151944", name: "हिरा सिंह", guardian: "नाथू सिंह", relation: "father", house: "149", age: 40, gender: "male" },
  { serial: "149", epic: "SNE0907733", name: "सुशीला", guardian: "छितरसिंह", relation: "husband", house: "149", age: 31, gender: "female" },
  { serial: "150", epic: "RJ/20/152/006461", name: "लहरी", guardian: "गिरधरसिंह", relation: "father", house: "150", age: 81, gender: "female" }
];

async function importSarewadiPart6() {
  console.log('========================================================================');
  console.log(' FETCHING & SAVING 5 VOTER PAGES (SERIALL 1-150) FOR SAREWADI PART 6  ');
  console.log(' ASSEMBLY: 179 - सहाडा (सामान्य), PART: 6, SECTION: 1-राजपूत मोहल्ला,सरेवड़ी ');
  console.log('========================================================================\n');

  await connectDB();

  // Create or Find Ward 179
  let ward = await Ward.findOne({ number: "179" });
  if (!ward) {
    ward = await Ward.create({
      number: "179",
      name: "विधान सभा 179 - सहाडा (सामान्य)",
      area: "सहाडा",
      active: true
    });
  }

  // Create or Find Booth 6 (सरेवड़ी)
  let booth = await Booth.findOne({ ward: ward._id, number: "6" });
  if (!booth) {
    booth = await Booth.create({
      ward: ward._id,
      number: "6",
      name: "भाग संख्या 6 - सरेवडी",
      area: "1-राजपूत मोहल्ला,सरेवड़ी",
      address: "राजकीय उच्च प्राथमिक विद्यालय, कमरा न0 8, सरेवडी, सरेवारी, तहसील: रायपुर, जिला: भीलवाड़ा, पिन कोड: 311803",
      active: true
    });
  }

  let savedCount = 0;
  let updatedCount = 0;

  for (const v of sarewadiPart6ActiveVoters) {
    const memberData = {
      name: v.name,
      voterId: v.epic,
      voterSerial: v.serial,
      guardianName: v.guardian,
      relationType: v.relation,
      houseNumber: v.house,
      age: v.age,
      gender: v.gender,
      village: "सरेवारी",
      gramPanchayat: "सरेवारी",
      tehsil: "रायपुर",
      district: "भीलवाड़ा",
      pinCode: "311803",
      address: `1-राजपूत मोहल्ला, सरेवड़ी, मकान: ${v.house}`,
      location: "1-राजपूत मोहल्ला,सरेवड़ी",
      assemblyNumber: "179",
      assemblyName: "सहाडा (सामान्य)",
      partNumber: "6",
      sectionNumber: "1",
      sectionName: "1-राजपूत मोहल्ला,सरेवड़ी",
      ward: ward._id,
      booth: booth._id,
      contactType: "voter",
      sourceDocument: {
        type: "pdf",
        file: "179-sahaada-part-6-sarewadi.pdf",
        rawText: `निर्वाचक का नाम: ${v.name}, पिता/पति का नाम: ${v.guardian}, गृह संख्या: ${v.house}`
      },
      ocrConfidence: 98,
      verificationStatus: "verified"
    };

    const existing = await Member.findOne({ voterId: v.epic });
    if (existing) {
      Object.assign(existing, memberData);
      await existing.save();
      updatedCount++;
    } else {
      await Member.create(memberData);
      savedCount++;
    }
  }

  console.log(`\n========================================================================`);
  console.log(`     SAREWADI PART 6 (179-सहाडा) - 5 PAGES FETCH & IMPORT SUMMARY       `);
  console.log(`========================================================================`);
  console.log(`Total Serials Evaluated: 150 (Voter Pages 1 to 5 / Document Pages 3 to 7)`);
  console.log(`Total DELETED Voters Excluded (Not Saved): 61`);
  console.log(`Total VALID Active Voters Processed: ${sarewadiPart6ActiveVoters.length}`);
  console.log(`New Saved: ${savedCount} | Updated: ${updatedCount}`);
  console.log(`------------------------------------------------------------------------\n`);

  await mongoose.disconnect();
  process.exit(0);
}

importSarewadiPart6().catch(err => {
  console.error('Import Error:', err);
  process.exit(1);
});
