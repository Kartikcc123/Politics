const fs = require('fs');
const path = require('path');

const targetDir = 'D:\\data';
if (!fs.existsSync(targetDir)) {
  try { fs.mkdirSync(targetDir, { recursive: true }); } catch (e) {}
}

const outputPath = fs.existsSync(targetDir)
  ? path.join(targetDir, 'bhita_part2_28pages_raw_extracted.json')
  : path.join(__dirname, 'bhita_part2_28pages_raw_extracted.json');

console.log('========================================================================');
console.log(' AI VISION AUDIT & DATA EXTRACTION - PART 2 (BHITA, PAGES 8 TO 12)      ');
console.log(' DOCUMENT: 179-सहाडा (सामान्य), भाग संख्या: 2 - भीटा (SERIALS 136-280)   ');
console.log('========================================================================\n');

// Complete Audited 145 Voter Records for Pages 8 to 12 (Serials 136 to 280)
const audited145Records = [
  // Page 8 (Serials 136 to 165) - Section 3: 3-होली का थान,भीटा
  { serial: "136", epic: "KDY0957373", name: "प्रताप", guardian: "जोधा", relation: "father", house: "90", age: 76, gender: "male", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "137", epic: "KDY1113810", name: "धाटीबाई", guardian: "प्रताप", relation: "husband", house: "90", age: 72, gender: "female", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "138", epic: "KDY0957399", name: "रामुबाई", guardian: "प्रताप", relation: "husband", house: "91", age: 74, gender: "female", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "139", epic: "KDY0957431", name: "मांगीलाल", guardian: "मोदीराम", relation: "father", house: "91", age: 66, gender: "male", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "140", epic: "KDY0957407", name: "धीसाराम", guardian: "मोदीराम", relation: "father", house: "91", age: 61, gender: "male", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "141", epic: "KDY0957415", name: "कमलीबाई", guardian: "धीसाराम", relation: "husband", house: "91", age: 59, gender: "female", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "142", epic: "KDY0957449", name: "चान्दमल", guardian: "दीपा", relation: "father", house: "91", age: 56, gender: "male", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "143", epic: "KDY0957456", name: "कमला", guardian: "चान्दमल", relation: "husband", house: "91", age: 56, gender: "female", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "144", epic: "RJ/20/152/000709", name: "राजेकुंवरी", guardian: "मांगीलाल", relation: "husband", house: "91", age: 54, gender: "female", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "145", epic: "SNE0891846", name: "भेरूलाल", guardian: "दीपा", relation: "father", house: "91", age: 51, gender: "male", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "146", epic: "SNE0891853", name: "गीता", guardian: "भेरूलाल", relation: "husband", house: "91", age: 50, gender: "female", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "147", epic: "KDY0957464", name: "राजू", guardian: "प्रताप", relation: "father", house: "91", age: 43, gender: "male", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "148", epic: "KDY1113828", name: "गहरी", guardian: "राजू", relation: "husband", house: "91", age: 42, gender: "female", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "149", epic: "SNE0727693", name: "केसर", guardian: "लादूलाल", relation: "husband", house: "91", age: 42, gender: "female", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "150", epic: "SNE0727685", name: "लादुलाल", guardian: "श्रीराम", relation: "father", house: "91", age: 33, gender: "male", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "151", epic: "SNE0891861", name: "देवनारायण", guardian: "भेरूलाल", relation: "father", house: "91", age: 32, gender: "male", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "152", epic: "SNE0891879", name: "माया देवी तेली", guardian: "देवनारायण तेली", relation: "husband", house: "91", age: 32, gender: "female", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "153", epic: "SNE0980961", name: "भागवन्ती देवी", guardian: "कमलेश", relation: "husband", house: "91", age: 31, gender: "female", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "154", epic: "SNE0460154", name: "कमलेश कुमार", guardian: "चांद मल", relation: "father", house: "91", age: 31, gender: "male", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "155", epic: "SNE0819433", name: "श्रवण", guardian: "धीसाराम", relation: "father", house: "91", age: 30, gender: "male", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "156", epic: "SNE0907253", name: "गौरव कुमार", guardian: "मांगीलाल", relation: "father", house: "91", age: 29, gender: "male", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "157", epic: "SNE1013986", name: "नीलम देवी", guardian: "गौरवकुमार", relation: "husband", house: "91", age: 27, gender: "female", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "158", epic: "SNE1013994", name: "सुरेश", guardian: "धीसाराम", relation: "father", house: "91", age: 27, gender: "male", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "159", epic: "SNE1238138", name: "चंदादेवी", guardian: "श्रवणलाल", relation: "husband", house: "91", age: 27, gender: "female", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "160", epic: "SNE1651355", name: "शंकर लाल", guardian: "मांगी लाल", relation: "father", house: "91", age: 23, gender: "male", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "161", epic: "SNE1837004", name: "किशन लाल", guardian: "राज मल", relation: "father", house: "92", age: 19, gender: "male", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "162", epic: "KDY0957498", name: "डालुलाल", guardian: "हुकमी चन्द", relation: "father", house: "92", age: 56, gender: "male", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "163", epic: "KDY1348960", name: "लादुलाल", guardian: "हुकमी चन्द", relation: "father", house: "92", age: 52, gender: "male", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "164", epic: "SNE0986257", name: "लहरी", guardian: "डालू लाल", relation: "father", house: "92", age: 47, gender: "female", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "165", epic: "KDY0957506", name: "बाली", guardian: "लादू लाल", relation: "husband", house: "92", age: 46, gender: "female", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },

  // Page 9 (Serials 166 to 195)
  { serial: "166", epic: "KDY0957514", name: "तुलसीराम", guardian: "दीपा", relation: "father", house: "93", age: 74, gender: "male", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "167", epic: "KDY0957522", name: "मांगी", guardian: "तुलसीराम", relation: "husband", house: "93", age: 72, gender: "female", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "168", epic: "SNE0284224", name: "भेरूलाल", guardian: "तुलसीराम", relation: "father", house: "93", age: 36, gender: "male", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "169", epic: "SNE0284216", name: "भंवरी देवी", guardian: "भेरूलाल", relation: "husband", house: "93", age: 35, gender: "female", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "170", epic: "SNE0727719", name: "पूरणमल", guardian: "तुलसीराम", relation: "father", house: "93", age: 31, gender: "male", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "171", epic: "SNE1127471", name: "बाली देवी", guardian: "पूरणमल", relation: "husband", house: "93", age: 28, gender: "female", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "172", epic: "KDY1348986", name: "गिरधारी लाल", guardian: "दीपा", relation: "father", house: "94", age: 70, gender: "male", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "173", epic: "KDY0957530", name: "मगनी", guardian: "गिरधारीलाल", relation: "husband", house: "94", age: 66, gender: "female", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "174", epic: "SNE0682757", name: "उदयलाल", guardian: "गिरधारी", relation: "father", house: "94", age: 31, gender: "male", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "175", epic: "SNE0819466", name: "मीरा", guardian: "उदयलाल", relation: "husband", house: "94", age: 30, gender: "female", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "176", epic: "SNE1573856", name: "देऊ कुमारी", guardian: "गिरधारी लाल", relation: "father", house: "94", age: 22, gender: "female", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "177", epic: "RJ/20/152/000710", name: "मांगु", guardian: "गोकललाल", relation: "father", house: "97", age: 76, gender: "male", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "178", epic: "KDY1113836", name: "सायरी", guardian: "गोपीलाल", relation: "husband", house: "97", age: 74, gender: "female", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "179", epic: "KDY1348911", name: "पारसमल", guardian: "गोकल चन्द", relation: "father", house: "97", age: 64, gender: "male", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "180", epic: "RJ/20/152/001359", name: "मोहनीदेवी", guardian: "पारसमल", relation: "husband", house: "97", age: 54, gender: "female", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "181", epic: "RJ/20/152/001362", name: "रामलाल", guardian: "गोपीलाल", relation: "father", house: "97", age: 52, gender: "male", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "182", epic: "KDY0957589", name: "सोहनी", guardian: "राम लाल", relation: "husband", house: "97", age: 44, gender: "female", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "183", epic: "SNE0152058", name: "भेरू लाल", guardian: "मांगु", relation: "father", house: "97", age: 43, gender: "male", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "184", epic: "SNE0180190", name: "मधुरा देवी", guardian: "भेरूलाल", relation: "husband", house: "97", age: 37, gender: "female", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "185", epic: "SNE0544445", name: "सोहनलाल", guardian: "मांगी लाल", relation: "father", house: "97", age: 33, gender: "male", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "186", epic: "SNE1857655", name: "पूनम", guardian: "कानु राम गुर्जर", relation: "father", house: "97", age: 33, gender: "female", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "187", epic: "SNE1307024", name: "रामु देवी", guardian: "सोहन लाल", relation: "husband", house: "97", age: 31, gender: "female", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "188", epic: "SNE0601294", name: "सुरेश चन्द", guardian: "मांगीलाल", relation: "father", house: "97", age: 31, gender: "male", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "189", epic: "SNE1651934", name: "कानु राम", guardian: "राम लाल", relation: "father", house: "97", age: 22, gender: "male", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "190", epic: "SNE1888650", name: "पूजा देवी", guardian: "देवी लाल", relation: "husband", house: "97", age: 22, gender: "female", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "191", epic: "SNE1765882", name: "तारा देवी", guardian: "सुरेश चंद", relation: "husband", house: "97", age: 21, gender: "female", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "192", epic: "SNE1841469", name: "देवी लाल", guardian: "पारस मल", relation: "father", house: "97", age: 20, gender: "male", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "193", epic: "SNE1908383", name: "पुष्पा कुमारी", guardian: "राम लाल", relation: "father", house: "97", age: 19, gender: "female", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "194", epic: "KDY0957605", name: "रेवत", guardian: "मियाराम", relation: "father", house: "99", age: 66, gender: "male", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "195", epic: "KDY0957613", name: "फेपी", guardian: "रेवत", relation: "husband", house: "99", age: 61, gender: "female", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },

  // Page 10 (Serials 196 to 225)
  { serial: "196", epic: "KDY0957597", name: "लाडूबाई", guardian: "लेहरूलाल", relation: "husband", house: "99", age: 60, gender: "female", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "197", epic: "SNE0819458", name: "राजी", guardian: "नारायण", relation: "father", house: "99", age: 40, gender: "female", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "198", epic: "SNE0544452", name: "नेवाराम", guardian: "रेवता", relation: "father", house: "99", age: 39, gender: "male", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "199", epic: "SNE0727727", name: "रूकमणी", guardian: "नेवाराम", relation: "husband", house: "99", age: 39, gender: "female", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "200", epic: "SNE0381079", name: "नारायण", guardian: "लेहरूलाल", relation: "father", house: "99", age: 37, gender: "male", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "201", epic: "KDY0957621", name: "चुन्नीलाल", guardian: "गंगाराम", relation: "father", house: "100", age: 76, gender: "male", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "202", epic: "KDY0957639", name: "सायरी", guardian: "चुन्नीलाल", relation: "husband", house: "100", age: 71, gender: "female", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "203", epic: "KDY1228360", name: "रोशन", guardian: "चुंजी लाल", relation: "father", house: "100", age: 42, gender: "male", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "204", epic: "SNE0727735", name: "बालीदेवी", guardian: "रोशन", relation: "husband", house: "100", age: 36, gender: "female", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "205", epic: "KDY0957647", name: "रामलाल", guardian: "मोतीराम", relation: "father", house: "101", age: 69, gender: "male", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "206", epic: "KDY1113851", name: "मोवनी", guardian: "रामलाल", relation: "husband", house: "101", age: 66, gender: "female", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "207", epic: "SNE0398651", name: "पारसमल", guardian: "रामलाल", relation: "father", house: "101", age: 33, gender: "male", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "208", epic: "SNE0381087", name: "रतनी देवी", guardian: "पारस मल", relation: "husband", house: "101", age: 33, gender: "female", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "209", epic: "SNE0795476", name: "लक्ष्मण", guardian: "रामलाल", relation: "father", house: "101", age: 31, gender: "male", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "210", epic: "SNE1127489", name: "श्रवणी", guardian: "लक्ष्मण", relation: "husband", house: "101", age: 30, gender: "female", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "211", epic: "SNE1306984", name: "प्रेमी देवी", guardian: "दिनेश", relation: "husband", house: "101", age: 29, gender: "female", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "212", epic: "SNE0986240", name: "दिनेश", guardian: "रामलाल", relation: "father", house: "101", age: 27, gender: "male", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "213", epic: "SNE1801919", name: "लोकेश", guardian: "राम लाल", relation: "father", house: "101", age: 20, gender: "male", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "214", epic: "KDY1113869", name: "शंकर नाथ", guardian: "उदय नाथ", relation: "father", house: "102", age: 59, gender: "male", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "215", epic: "KDY0957654", name: "लक्ष्मी", guardian: "शंकर नाथ", relation: "husband", house: "102", age: 56, gender: "female", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "216", epic: "SNE0307058", name: "सुरेश नाथ", guardian: "शंकर नाथ", relation: "father", house: "102", age: 36, gender: "male", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "217", epic: "SNE0727743", name: "मीना", guardian: "सुरेशनाथ", relation: "husband", house: "102", age: 31, gender: "female", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "218", epic: "SNE1013978", name: "काना", guardian: "शंकर लाल", relation: "father", house: "102", age: 27, gender: "male", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "219", epic: "SNE1403641", name: "ईश्वर", guardian: "शंकर", relation: "father", house: "102", age: 27, gender: "male", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "220", epic: "SNE1403674", name: "तारा देवी", guardian: "ईश्वर", relation: "husband", house: "102", age: 27, gender: "female", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "221", epic: "KDY0957662", name: "हीरालाल", guardian: "मीयाराम", relation: "father", house: "104", age: 72, gender: "male", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "222", epic: "KDY1349216", name: "ईशर", guardian: "हीरा", relation: "father", house: "104", age: 44, gender: "male", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "223", epic: "KDY1349232", name: "बाली", guardian: "ईशर", relation: "husband", house: "104", age: 42, gender: "female", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "224", epic: "SNE1841311", name: "प्रकाश चंद", guardian: "ईस्वर लाल", relation: "father", house: "104", age: 19, gender: "male", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "225", epic: "KDY1228535", name: "रामा", guardian: "प्रताप", relation: "father", house: "105", age: 43, gender: "male", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },

  // Page 11 (Serials 226 to 255)
  { serial: "226", epic: "KDY1223619", name: "अणछी", guardian: "रामा", relation: "husband", house: "105", age: 42, gender: "female", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "227", epic: "SNE1840123", name: "प्रभु कुमारी", guardian: "राम लाल", relation: "father", house: "105", age: 19, gender: "female", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "228", epic: "KDY0957688", name: "सोहनी", guardian: "रंगलाल", relation: "husband", house: "106", age: 79, gender: "female", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "229", epic: "KDY0957696", name: "पारसमल", guardian: "रंगलाल", relation: "father", house: "106", age: 56, gender: "male", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "230", epic: "KDY0957704", name: "मांगीबाई", guardian: "पारसमल", relation: "husband", house: "106", age: 54, gender: "female", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "231", epic: "KDY0957712", name: "रतन लाल", guardian: "रंग लाल", relation: "father", house: "106", age: 43, gender: "male", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "232", epic: "KDY0957720", name: "पारसी", guardian: "रतन लाल", relation: "husband", house: "106", age: 42, gender: "female", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "233", epic: "KDY1228303", name: "भेरू लाल", guardian: "रंग लाल", relation: "father", house: "106", age: 42, gender: "male", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "234", epic: "KDY0957738", name: "बाली", guardian: "भेरू लाल", relation: "husband", house: "106", age: 42, gender: "female", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "235", epic: "SNE0907261", name: "मुकेश", guardian: "पारसमल", relation: "father", house: "106", age: 29, gender: "male", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "236", epic: "SNE1237940", name: "कांता सुधार", guardian: "मुकेश", relation: "husband", house: "106", age: 26, gender: "female", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "237", epic: "SNE1651140", name: "भावना", guardian: "रतन लाल", relation: "father", house: "106", age: 24, gender: "female", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "238", epic: "SNE1618164", name: "पूजा कुमारी", guardian: "पारस मल", relation: "father", house: "106", age: 22, gender: "female", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "239", epic: "SNE1697218", name: "श्रवण लाल", guardian: "भेरू लाल", relation: "father", house: "106", age: 21, gender: "male", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "240", epic: "SNE1744556", name: "पिस्ता कुमारी", guardian: "पारस मल", relation: "father", house: "106", age: 21, gender: "female", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "241", epic: "SNE1752575", name: "निरमा", guardian: "पारस मल", relation: "father", house: "106", age: 20, gender: "female", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "242", epic: "SNE1908391", name: "लक्ष्मी कुमारी", guardian: "भेरू लाल", relation: "father", house: "106", age: 19, gender: "female", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "243", epic: "KDY0910323", name: "केकु", guardian: "वरदीराम", relation: "husband", house: "107", age: 66, gender: "female", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "244", epic: "KDY0957746", name: "प्रेमराज", guardian: "कनिराम", relation: "father", house: "107", age: 64, gender: "male", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "245", epic: "KDY2024909", name: "गीता", guardian: "प्रेम राज", relation: "husband", house: "107", age: 49, gender: "female", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "246", epic: "KDY1223668", name: "भेरू", guardian: "वरदा", relation: "father", house: "107", age: 44, gender: "male", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "247", epic: "KDY1113901", name: "कान्ता", guardian: "भेरू", relation: "husband", house: "107", age: 42, gender: "female", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "248", epic: "SNE0907279", name: "प्रकाश", guardian: "वरदा", relation: "father", house: "107", age: 33, gender: "male", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "249", epic: "SNE0907287", name: "लादी देवी", guardian: "प्रकाश", relation: "husband", house: "107", age: 31, gender: "female", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "250", epic: "SNE1789239", name: "सुनील कुमार", guardian: "भेरू लाल", relation: "father", house: "107", age: 22, gender: "male", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "251", epic: "SNE1750793", name: "लक्ष्मी", guardian: "प्रेम राम", relation: "father", house: "107", age: 20, gender: "female", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "252", epic: "RJ/20/152/001383", name: "भंवरलाल", guardian: "अम्बालाल", relation: "father", house: "108", age: 71, gender: "male", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "253", epic: "SNE0513689", name: "कैलाशचन्द", guardian: "धर्मचन्द", relation: "father", house: "108", age: 32, gender: "male", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "254", epic: "SNE0727750", name: "कंचन", guardian: "कैलाशचन्द", relation: "husband", house: "108", age: 31, gender: "female", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "255", epic: "KDY0957753", name: "मन्दरूप", guardian: "श्रीराम", relation: "father", house: "109", age: 81, gender: "male", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },

  // Page 12 (Serials 256 to 280)
  { serial: "256", epic: "KDY0957761", name: "अणछी", guardian: "मन्दरूप", relation: "husband", house: "109", age: 76, gender: "female", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "257", epic: "KDY0957779", name: "नन्दराम", guardian: "मन्दरूप", relation: "father", house: "109", age: 56, gender: "male", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "258", epic: "KDY0957795", name: "मिट्ठूलाल", guardian: "मन्दरूप", relation: "father", house: "109", age: 52, gender: "male", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "259", epic: "KDY0957803", name: "पारसी", guardian: "मिट्ठू लाल", relation: "husband", house: "109", age: 46, gender: "female", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "260", epic: "KDY0957811", name: "मदन लाल", guardian: "मन्दरूप", relation: "father", house: "109", age: 46, gender: "male", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "261", epic: "KDY0957829", name: "सीमा", guardian: "मदन लाल", relation: "husband", house: "109", age: 44, gender: "female", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "262", epic: "SNE1127505", name: "लादू लाल", guardian: "नन्दराम", relation: "father", house: "109", age: 28, gender: "male", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "263", epic: "SNE1127513", name: "पायल", guardian: "लादू", relation: "husband", house: "109", age: 28, gender: "female", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "264", epic: "SNE1603695", name: "राम लाल", guardian: "मिट्ठू लाल", relation: "father", house: "109", age: 26, gender: "male", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "265", epic: "SNE1603042", name: "टीना कुमारी", guardian: "मिट्ठू लाल", relation: "father", house: "109", age: 25, gender: "female", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "266", epic: "SNE1747088", name: "जगदीश लाल", guardian: "नन्द राम", relation: "father", house: "109", age: 23, gender: "male", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "267", epic: "SNE1651132", name: "धर्म चंदा", guardian: "मीठा लाल", relation: "father", house: "109", age: 22, gender: "male", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "268", epic: "SNE1853167", name: "चंदा", guardian: "लोकेश", relation: "husband", house: "109", age: 21, gender: "female", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "269", epic: "SNE1853134", name: "लोकेश", guardian: "मदन लाल", relation: "father", house: "109", age: 19, gender: "male", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "270", epic: "KDY1113927", name: "चतरभुज", guardian: "उदेलाल", relation: "father", house: "110", age: 71, gender: "male", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "271", epic: "KDY1113935", name: "मांगीबाई", guardian: "चतरभुज", relation: "husband", house: "110", age: 66, gender: "female", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "272", epic: "KDY0957837", name: "धनराज", guardian: "छगनलाल", relation: "father", house: "111", age: 62, gender: "male", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "273", epic: "KDY2024511", name: "कुन्दन", guardian: "धनराज", relation: "father", house: "111", age: 37, gender: "male", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "274", epic: "SNE0209940", name: "सोनु", guardian: "धनराज", relation: "father", house: "111", age: 36, gender: "male", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "275", epic: "SNE0460162", name: "लोकेश कुमार", guardian: "धनराज", relation: "father", house: "111", age: 36, gender: "male", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "276", epic: "SNE1307214", name: "दीपमाला", guardian: "कुंदन", relation: "husband", house: "111", age: 32, gender: "female", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "277", epic: "RJ/20/152/001385", name: "सुखलाल", guardian: "भूराला", relation: "father", house: "112", age: 92, gender: "male", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "278", epic: "KDY0957852", name: "घीसीबाई", guardian: "सुखलाल", relation: "husband", house: "112", age: 90, gender: "female", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "279", epic: "SNE1282664", name: "मन्ता देवी", guardian: "दिनेश", relation: "husband", house: "123", age: 27, gender: "female", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" },
  { serial: "280", epic: "KDY0910471", name: "सुखलाल", guardian: "नाथूलाल", relation: "father", house: "125", age: 69, gender: "male", sectionNumber: "3", sectionName: "3-होली का थान,भीटा" }
];

const outputPayload = {
  metadata: {
    title: "निर्वाचक नामावली 2026 S20 राजस्थान",
    assemblyNumber: "179",
    assemblyName: "सहाडा (सामान्य)",
    partNumber: "2",
    boothName: "भाग संख्या 2 - भीटा",
    pollingStation: "राजकीय उच्च माध्यमिक विद्यालय, कमरा न0 2, भीटा",
    auditPhase: "Pages 8 to 12 AI Vision Audit (Serials 136 to 280)",
    totalExtractedRecords: audited145Records.length,
    timestamp: new Date().toISOString()
  },
  records: audited145Records
};

try {
  fs.writeFileSync(outputPath, JSON.stringify(outputPayload, null, 2), 'utf8');
  console.log(`AI VISION AUDIT COMPLETE FOR PAGES 8 TO 12 (SERIALS 136 TO 280)!`);
  console.log(`Saved JSON at: ${outputPath}\n`);
  console.log(`Total Verified Records: 145 / 145`);
} catch (err) {
  console.error('Error writing file:', err.message);
}
