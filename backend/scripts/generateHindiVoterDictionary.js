const fs = require('fs');
const path = require('path');

// Extensive Devanagari Hindi Name Roots & Elements
const maleFirstNames = [
  "राम", "श्याम", "मोहन", "सोहन", "रोशन", "सुरेश", "दिनेश", "लक्ष्मण", "गणेश", "रमेश",
  "महेश", "मांगी", "लादू", "भेरू", "गौतम", "गोपाल", "कैलाश", "ओम", "प्रकाश", "रतन",
  "प्रेम", "कन्हैया", "भगवान", "उदय", "जमना", "जगदीश", "सुभाष", "कमलेश", "राजेंद्र", "सुरेंद्र",
  "नरेंद्र", "गजेंद्र", "वीरेंद्र", "जितेंद्र", "धर्मेंद्र", "हरेंद्र", "जितू", "सोनु", "राजू", "पिंटू",
  "पप्पू", "चेतन", "मुकेश", "किशन", "पारस", "नेना", "शंकर", "तुलसी", "छीतर", "तेज",
  "सुवा", "आसू", "खेम", "देवी", "किस्तूर", "डाल", "चतर", "रेवत", "पेमा", "भोज",
  "हरि", "गोकुल", "हजारी", "बाबू", "अम्बा", "मुरली", "बंसी", "दया", "चुन्नी", "छोगा",
  "खेमा", "कालू", "नंद", "अमरा", "कछोड", "नारू", "धन्ना", "चन्ना", "पन्ना", "दूदा",
  "मान", "रघु", "बलदेव", "अचल", "सज्जन", "कल्याण", "भंवर", "प्रताप", "भीम", "नाथू",
  "बालू", "मन्दरूप", "मिट्ठू", "नानु", "खुम", "सोनु", "राकेश", "विक्रम", "माथु", "वीरम",
  "सांवर", "संपत", "गवेर", "केशू", "भगवती", "चुना", "बगतावर", "दिनेश", "लादूराम", "उदयराम",
  "मिश्री", "प्रहलाद", "अमर", "गौरी", "भूर", "गणपत", "मुरलीधर", "तुलछी", "गंगाराम", "दयाराम",
  "मिश्रीलाल", "दौलत", "छोटू", "छोगाराम", "गोपी", "सवाई", "बाबूलाल", "नाथूलाल", "मांगीलाल", "दूदाराम"
];

const femaleFirstNames = [
  "सुगणी", "सुगना", "कैलाशी", "सन्तोक", "संतोष", "राधा", "मीना", "सुशीला", "कमला", "शांति",
  "शान्ति", "पारसी", "लीला", "संतु", "जमना", "गीता", "केसर", "अनिता", "मंजू", "मंजु",
  "पुष्पा", "रेखा", "भावना", "पूजा", "ममता", "इंद्रा", "इन्द्रा", "सुमित्रा", "तारा", "किरण",
  "मंजरी", "उर्मिला", "मंगनी", "कंकु", "लेहरी", "धाटी", "रामु", "कमली", "हंजा", "सोवनी",
  "बगतावरी", "बाली", "नाही", "साती", "रूपी", "प्यारी", "मचरा", "नेगुड़ी", "छगुबाई", "सुडी",
  "मोहनी", "राष्ट्र", "दाखु", "अमरी", "घणी", "रूकमणी", "रामीबाई", "नारायणी", "भंवरी", "कंचन",
  "टीना", "पिंकी", "संगीता", "संजू", "संजु", "सीमा", "अनिता", "दीपमाला", "घीसीबाई", "टिपू",
  "सुखी", "मचरा", "गंगादेवी", "गणि", "फेपी", "हीरी", "शारदा", "छगुबाई", "नाथी", "शानु",
  "सीता", "डाली", "सोहनबाई", "मीरा", "हरजुबाई", "उदी", "देवीबाई", "लेहरीबाई", "चांदी", "मीठू"
];

const middleSuffixes = [
  "", " लाल", " राम", " चंद", " चन्द", " सिंह", " प्रसाद", " कुमार", " नाथ", " दास", " राज", " देव", " भान", " प्रकाश"
];

const surnames = [
  "", " सुधार", " गुर्जर", " सालवी", " मेवाडा", " राजपूत", " सोनी", " दर्जी", " तेली", " चौधरी",
  " खारोल", " कालबेलिया", " जैन", " शर्मा", " वर्मा", " पारीक", " वैष्णव", " प्रजापत", " कुमावत", " माली",
  " जोगी", " भील", " बलाई", " खटीक", " बैरवा", " मीणा", " राठौड़", " चौहान", " गहलोत", " सोलंकी", " पंवार"
];

const femaleSuffixes = [
  "", " देवी", " बाई", " कुमारी", " कंवर"
];

console.log('========================================================================');
console.log(' METHOD 3: PHONETIC COMBINATION GENERATOR (50,000+ DEVANAGARI NAMES)    ');
console.log('========================================================================\n');

const generatedNamesSet = new Set();

// Generate Male Name Combinations (3-tier generation)
for (const first of maleFirstNames) {
  generatedNamesSet.add(first);
  for (const mid of middleSuffixes) {
    const maleMidName = (first + mid).trim();
    generatedNamesSet.add(maleMidName);
    for (const surname of surnames) {
      if (surname) {
        generatedNamesSet.add(`${maleMidName} ${surname}`.trim());
      }
    }
  }
}

// Generate Female Name Combinations
for (const first of femaleFirstNames) {
  generatedNamesSet.add(first);
  for (const suf of femaleSuffixes) {
    const femName = (first + suf).trim();
    generatedNamesSet.add(femName);
    for (const surname of surnames) {
      if (surname) {
        generatedNamesSet.add(`${femName} ${surname}`.trim());
      }
    }
  }
}

const namesArray = Array.from(generatedNamesSet);

console.log(`Generated Total Unique Devanagari Hindi Names: ${namesArray.length}`);

// Save to JSON for Python OCR Worker and Node backend
const pythonDictPath = path.join(__dirname, '../python/hindi_voter_names_dict.json');
const jsDictPath = path.join(__dirname, '../src/utils/hindiNamesDict.json');

const payload = {
  metadata: {
    title: "Master Devanagari Hindi Voter Name Dictionary v3.0 (50,000+ Combinations)",
    totalEntries: namesArray.length,
    generatedAt: new Date().toISOString()
  },
  names: namesArray
};

try {
  fs.writeFileSync(pythonDictPath, JSON.stringify(payload, null, 2), 'utf8');
  fs.writeFileSync(jsDictPath, JSON.stringify(payload, null, 2), 'utf8');
  console.log(`\nSUCCESS: Master Hindi Voter Name Dictionary created!`);
  console.log(`Saved Python Dictionary: ${pythonDictPath}`);
  console.log(`Saved JS Dictionary: ${jsDictPath}`);
} catch (err) {
  console.error('Error saving dictionary:', err.message);
}
