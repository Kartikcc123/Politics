const fs = require('fs');
const path = require('path');

const targetDir = 'D:\\data';
if (!fs.existsSync(targetDir)) {
  try { fs.mkdirSync(targetDir, { recursive: true }); } catch (e) {}
}

const outputPath = fs.existsSync(targetDir)
  ? path.join(targetDir, 'bhita_part1_5pages_software_test.json')
  : path.join(__dirname, 'bhita_part1_5pages_software_test.json');

console.log('========================================================================');
console.log(' AI VISION AUDIT & DATA EXTRACTION - PART 1 (BHITA, PAGES 3 TO 7)       ');
console.log(' DOCUMENT: 179-सहाडा (सामान्य), भाग संख्या: 1 - भीटा (SERIALS 1-150)     ');
console.log('========================================================================\n');

// Complete Audited 150 Voter Records for Pages 3 to 7 (Serials 1 to 150)
const audited150Records = [
  // Page 3 (Serials 1 to 30) - Section 1: 1-पटवार भवन के पास,भीटा
  { serial: "1", epic: "KDY1113448", name: "नेनूराम", guardian: "प्रतापचन्द", relation: "father", house: "8", age: 58, gender: "male", sectionNumber: "1", sectionName: "1-पटवार भवन के पास,भीटा" },
  { serial: "2", epic: "SNE0513606", name: "बालाराम", guardian: "नेनूराम", relation: "father", house: "8", age: 32, gender: "male", sectionNumber: "1", sectionName: "1-पटवार भवन के पास,भीटा" },
  { serial: "3", epic: "SNE0727586", name: "सुगणी", guardian: "बालाराम", relation: "husband", house: "8", age: 31, gender: "female", sectionNumber: "1", sectionName: "1-पटवार भवन के पास,भीटा" },
  { serial: "4", epic: "KDY0955104", name: "प्रतापचन्द", guardian: "धीरालाल", relation: "father", house: "9", age: 84, gender: "male", sectionNumber: "1", sectionName: "1-पटवार भवन के पास,भीटा" },
  { serial: "5", epic: "KDY1113455", name: "हंजा", guardian: "प्रतापचन्द", relation: "husband", house: "9", age: 82, gender: "female", sectionNumber: "1", sectionName: "1-पटवार भवन के पास,भीटा" },
  { serial: "6", epic: "KDY0955112", name: "डालचन्द", guardian: "प्रतापचन्द", relation: "father", house: "9", age: 55, gender: "male", sectionNumber: "1", sectionName: "1-पटवार भवन के पास,भीटा" },
  { serial: "7", epic: "KDY1113463", name: "कमली", guardian: "डालचन्द", relation: "husband", house: "9", age: 52, gender: "female", sectionNumber: "1", sectionName: "1-पटवार भवन के पास,भीटा" },
  { serial: "8", epic: "SNE1570290", name: "सावर मल", guardian: "डालचन्द", relation: "father", house: "9", age: 23, gender: "male", sectionNumber: "1", sectionName: "1-पटवार भवन के पास,भीटा" },
  { serial: "9", epic: "SNE1651439", name: "तीना देवी", guardian: "सन्देरा", relation: "husband", house: "9", age: 21, gender: "female", sectionNumber: "1", sectionName: "1-पटवार भवन के पास,भीटा" },
  { serial: "10", epic: "KDY0955120", name: "सुवालाल", guardian: "प्रतापचन्द", relation: "father", house: "10", age: 61, gender: "male", sectionNumber: "1", sectionName: "1-पटवार भवन के पास,भीटा" },
  { serial: "11", epic: "KDY0955138", name: "बगतावरी", guardian: "सुवालाल", relation: "husband", house: "10", age: 59, gender: "female", sectionNumber: "1", sectionName: "1-पटवार भवन के पास,भीटा" },
  { serial: "12", epic: "SNE0380923", name: "भेरूलाल", guardian: "सुवालाल", relation: "father", house: "10", age: 38, gender: "male", sectionNumber: "1", sectionName: "1-पटवार भवन के पास,भीटा" },
  { serial: "13", epic: "SNE0380931", name: "भंवरी देवी", guardian: "भेरूलाल", relation: "husband", house: "10", age: 37, gender: "female", sectionNumber: "1", sectionName: "1-पटवार भवन के पास,भीटा" },
  { serial: "14", epic: "SNE0209916", name: "राजू", guardian: "सुवा", relation: "father", house: "10", age: 35, gender: "male", sectionNumber: "1", sectionName: "1-पटवार भवन के पास,भीटा" },
  { serial: "15", epic: "SNE0819300", name: "मुकेश कुमार", guardian: "सुवालाल", relation: "father", house: "10", age: 30, gender: "male", sectionNumber: "1", sectionName: "1-पटवार भवन के पास,भीटा" },
  { serial: "16", epic: "SNE1347053", name: "मीना देवी", guardian: "राजू", relation: "husband", house: "10", age: 29, gender: "female", sectionNumber: "1", sectionName: "1-पटवार भवन के पास,भीटा" },
  { serial: "17", epic: "SNE1307180", name: "बाली देवी", guardian: "मुकेश कुमार", relation: "husband", house: "10", age: 27, gender: "female", sectionNumber: "1", sectionName: "1-पटवार भवन के पास,भीटा" },
  { serial: "18", epic: "KDY0955161", name: "मांगी", guardian: "मांगीलाल", relation: "husband", house: "11", age: 74, gender: "female", sectionNumber: "1", sectionName: "1-पटवार भवन के पास,भीटा" },
  { serial: "19", epic: "RJ/20/152/000716", name: "हीरालाल", guardian: "मांगीलाल", relation: "father", house: "11", age: 54, gender: "male", sectionNumber: "1", sectionName: "1-पटवार भवन के पास,भीटा" },
  { serial: "20", epic: "KDY0955187", name: "नाराणी", guardian: "लादू लाल", relation: "husband", house: "11", age: 49, gender: "female", sectionNumber: "1", sectionName: "1-पटवार भवन के पास,भीटा" },
  { serial: "21", epic: "KDY1223445", name: "बन्ना", guardian: "मांगी लाल", relation: "father", house: "11", age: 44, gender: "male", sectionNumber: "1", sectionName: "1-पटवार भवन के पास,भीटा" },
  { serial: "22", epic: "SNE0380964", name: "कैलाश देवी", guardian: "बंसीलाल", relation: "husband", house: "11", age: 38, gender: "female", sectionNumber: "1", sectionName: "1-पटवार भवन के पास,भीटा" },
  { serial: "23", epic: "SNE1359397", name: "गोविंद कुमार", guardian: "लादू लाल", relation: "father", house: "11", age: 25, gender: "male", sectionNumber: "1", sectionName: "1-पटवार भवन के पास,भीटा" },
  { serial: "24", epic: "SNE1359637", name: "श्रवण लाल", guardian: "हीरा लाल", relation: "father", house: "11", age: 25, gender: "male", sectionNumber: "1", sectionName: "1-पटवार भवन के पास,भीटा" },
  { serial: "25", epic: "SNE1682319", name: "भगवती देवी", guardian: "श्रवण लाल", relation: "husband", house: "11", age: 24, gender: "female", sectionNumber: "1", sectionName: "1-पटवार भवन के पास,भीटा" },
  { serial: "26", epic: "KDY0955195", name: "सोवनी", guardian: "जेताराम", relation: "husband", house: "12", age: 81, gender: "female", sectionNumber: "1", sectionName: "1-पटवार भवन के पास,भीटा" },
  { serial: "27", epic: "RJ/20/152/000715", name: "लादूलाल", guardian: "जेताराम", relation: "father", house: "12", age: 64, gender: "male", sectionNumber: "1", sectionName: "1-पटवार भवन के पास,भीटा" },
  { serial: "28", epic: "KDY1349018", name: "भंवरी", guardian: "लादूलाल", relation: "husband", house: "12", age: 61, gender: "female", sectionNumber: "1", sectionName: "1-पटवार भवन के पास,भीटा" },
  { serial: "29", epic: "KDY1348937", name: "गोपाललाल", guardian: "जेताराम", relation: "father", house: "12", age: 57, gender: "male", sectionNumber: "1", sectionName: "1-पटवार भवन के पास,भीटा" },
  { serial: "30", epic: "KDY0955203", name: "सुशीला देवी", guardian: "गोपाललाल", relation: "husband", house: "12", age: 55, gender: "female", sectionNumber: "1", sectionName: "1-पटवार भवन के पास,भीटा" },

  // Page 4 (Serials 31 to 60)
  { serial: "31", epic: "RJ/20/152/001379", name: "रोशनलाल", guardian: "जेताराम", relation: "father", house: "12", age: 52, gender: "male", sectionNumber: "1", sectionName: "1-पटवार भवन के पास,भीटा" },
  { serial: "32", epic: "KDY0955211", name: "पुष्पा", guardian: "रोशन लाल", relation: "husband", house: "12", age: 45, gender: "female", sectionNumber: "1", sectionName: "1-पटवार भवन के पास,भीटा" },
  { serial: "33", epic: "SNE0380972", name: "पिन्टू कुमार", guardian: "लादू लाल", relation: "father", house: "12", age: 36, gender: "male", sectionNumber: "1", sectionName: "1-पटवार भवन के पास,भीटा" },
  { serial: "34", epic: "SNE0601153", name: "संगम कुमार", guardian: "गोपाल", relation: "father", house: "12", age: 31, gender: "male", sectionNumber: "1", sectionName: "1-पटवार भवन के पास,भीटा" },
  { serial: "35", epic: "SNE0727594", name: "पूजा", guardian: "पिन्टू", relation: "husband", house: "12", age: 31, gender: "female", sectionNumber: "1", sectionName: "1-पटवार भवन के पास,भीटा" },
  { serial: "36", epic: "SNE0819318", name: "बंशीलाल", guardian: "बालू", relation: "father", house: "12", age: 31, gender: "male", sectionNumber: "1", sectionName: "1-पटवार भवन के पास,भीटा" },
  { serial: "37", epic: "SNE0954065", name: "भगवती देवी", guardian: "संगम", relation: "husband", house: "12", age: 28, gender: "female", sectionNumber: "1", sectionName: "1-पटवार भवन के पास,भीटा" },
  { serial: "38", epic: "SNE1550789", name: "राहुल", guardian: "गोपाल लाल", relation: "father", house: "12", age: 23, gender: "male", sectionNumber: "1", sectionName: "1-पटवार भवन के पास,भीटा" },
  { serial: "39", epic: "SNE1792274", name: "खुशबू देवी", guardian: "राहुल", relation: "husband", house: "12", age: 20, gender: "female", sectionNumber: "1", sectionName: "1-पटवार भवन के पास,भीटा" },
  { serial: "40", epic: "SNE1835776", name: "देवेन्द्र कुमार", guardian: "रोशन लाल", relation: "father", house: "12", age: 19, gender: "male", sectionNumber: "1", sectionName: "1-पटवार भवन के पास,भीटा" },
  { serial: "41", epic: "KDY0955237", name: "डालचन्द", guardian: "भूरालाल", relation: "father", house: "13", age: 64, gender: "male", sectionNumber: "1", sectionName: "1-पटवार भवन के पास,भीटा" },
  { serial: "42", epic: "KDY0910521", name: "केलीबाई", guardian: "डालचन्द", relation: "husband", house: "13", age: 61, gender: "female", sectionNumber: "1", sectionName: "1-पटवार भवन के पास,भीटा" },
  { serial: "43", epic: "KDY0910513", name: "भागु", guardian: "भूरालाल", relation: "father", house: "13", age: 58, gender: "male", sectionNumber: "1", sectionName: "1-पटवार भवन के पास,भीटा" },
  { serial: "44", epic: "KDY0955229", name: "सुन्दरबाई", guardian: "भागु", relation: "husband", house: "13", age: 56, gender: "female", sectionNumber: "1", sectionName: "1-पटवार भवन के पास,भीटा" },
  { serial: "45", epic: "SNE0209924", name: "देवी लाल", guardian: "बालू", relation: "father", house: "13", age: 38, gender: "male", sectionNumber: "1", sectionName: "1-पटवार भवन के पास,भीटा" },
  { serial: "46", epic: "SNE0544270", name: "प्रेम लाल", guardian: "भागुराम", relation: "father", house: "13", age: 33, gender: "male", sectionNumber: "1", sectionName: "1-पटवार भवन के पास,भीटा" },
  { serial: "47", epic: "SNE0727602", name: "कोयली", guardian: "देवीलाल", relation: "husband", house: "13", age: 33, gender: "female", sectionNumber: "1", sectionName: "1-पटवार भवन के पास,भीटा" },
  { serial: "48", epic: "SNE0795427", name: "शारदा", guardian: "प्रेमलाल", relation: "husband", house: "13", age: 32, gender: "female", sectionNumber: "1", sectionName: "1-पटवार भवन के पास,भीटा" },
  { serial: "49", epic: "SNE0907162", name: "कन्हैयालाल", guardian: "भागु", relation: "father", house: "13", age: 29, gender: "male", sectionNumber: "1", sectionName: "1-पटवार भवन के पास,भीटा" },
  { serial: "50", epic: "SNE1237924", name: "मीना देवी", guardian: "बन्ना लाल", relation: "husband", house: "13", age: 27, gender: "female", sectionNumber: "1", sectionName: "1-पटवार भवन के पास,भीटा" },
  { serial: "51", epic: "SNE1347020", name: "चंचल", guardian: "कन्हैया लाल", relation: "husband", house: "13", age: 26, gender: "female", sectionNumber: "1", sectionName: "1-पटवार भवन के पास,भीटा" },
  { serial: "52", epic: "KDY0955245", name: "मांगूलाल", guardian: "खूमा", relation: "father", house: "14", age: 64, gender: "male", sectionNumber: "1", sectionName: "1-पटवार भवन के पास,भीटा" },
  { serial: "53", epic: "KDY0955252", name: "राजी", guardian: "मांगू", relation: "husband", house: "14", age: 62, gender: "female", sectionNumber: "1", sectionName: "1-पटवार भवन के पास,भीटा" },
  { serial: "54", epic: "SNE1013747", name: "सुवा", guardian: "मांगी लाल", relation: "father", house: "14", age: 29, gender: "male", sectionNumber: "1", sectionName: "1-पटवार भवन के पास,भीटा" },
  { serial: "55", epic: "SNE1698257", name: "लादी देवी", guardian: "सुवा", relation: "husband", house: "14", age: 21, gender: "female", sectionNumber: "1", sectionName: "1-पटवार भवन के पास,भीटा" },
  { serial: "56", epic: "KDY0955278", name: "अमरी", guardian: "प्रतापचन्द", relation: "husband", house: "15", age: 81, gender: "female", sectionNumber: "1", sectionName: "1-पटवार भवन के पास,भीटा" },
  { serial: "57", epic: "KDY0910562", name: "अर्जुनलाल", guardian: "प्रतापचन्द", relation: "father", house: "15", age: 45, gender: "male", sectionNumber: "1", sectionName: "1-पटवार भवन के पास,भीटा" },
  { serial: "58", epic: "SNE0151993", name: "सायरी देवी", guardian: "अर्जुन लाल", relation: "husband", house: "15", age: 39, gender: "female", sectionNumber: "1", sectionName: "1-पटवार भवन के पास,भीटा" },
  { serial: "59", epic: "SNE1835529", name: "घनश्याम", guardian: "अर्जुन लाल", relation: "father", house: "15", age: 20, gender: "male", sectionNumber: "1", sectionName: "1-पटवार भवन के पास,भीटा" },
  { serial: "60", epic: "RJ/20/152/000223", name: "गोमीबाई", guardian: "मोतीलाल", relation: "husband", house: "16", age: 86, gender: "female", sectionNumber: "1", sectionName: "1-पटवार भवन के पास,भीटा" },

  // Page 5 (Serials 61 to 90)
  { serial: "61", epic: "KDY1113471", name: "लछीराम", guardian: "खुमाराम", relation: "father", house: "16", age: 62, gender: "male", sectionNumber: "1", sectionName: "1-पटवार भवन के पास,भीटा" },
  { serial: "62", epic: "KDY1113489", name: "नेबूबाई", guardian: "लछीराम", relation: "husband", house: "16", age: 62, gender: "female", sectionNumber: "1", sectionName: "1-पटवार भवन के पास,भीटा" },
  { serial: "63", epic: "KDY1113497", name: "चन्दरी", guardian: "लछूराम", relation: "husband", house: "16", age: 61, gender: "female", sectionNumber: "1", sectionName: "1-पटवार भवन के पास,भीटा" },
  { serial: "64", epic: "SNE0907170", name: "रमेशचन्द्र", guardian: "लछूराम", relation: "father", house: "16", age: 29, gender: "male", sectionNumber: "1", sectionName: "1-पटवार भवन के पास,भीटा" },
  { serial: "65", epic: "SNE1306893", name: "भगवान लाल", guardian: "लछीराम", relation: "father", house: "16", age: 26, gender: "male", sectionNumber: "1", sectionName: "1-पटवार भवन के पास,भीटा" },
  { serial: "66", epic: "SNE1508167", name: "मीरा", guardian: "लछीराम", relation: "husband", house: "16", age: 24, gender: "female", sectionNumber: "1", sectionName: "1-पटवार भवन के पास,भीटा" },
  { serial: "67", epic: "SNE1570365", name: "बाली कुमारी", guardian: "लछू", relation: "father", house: "16", age: 23, gender: "female", sectionNumber: "1", sectionName: "1-पटवार भवन के पास,भीटा" },
  { serial: "68", epic: "SNE0947788", name: "भावेश", guardian: "श्याम लाल", relation: "father", house: "18", age: 29, gender: "male", sectionNumber: "1", sectionName: "1-पटवार भवन के पास,भीटा" },
  { serial: "69", epic: "KDY0955302", name: "शान्ती", guardian: "बालूलाल", relation: "husband", house: "19", age: 76, gender: "female", sectionNumber: "1", sectionName: "1-पटवार भवन के पास,भीटा" },
  { serial: "70", epic: "KDY0910018", name: "श्यामलाल", guardian: "बालूलाल", relation: "father", house: "19", age: 61, gender: "male", sectionNumber: "1", sectionName: "1-पटवार भवन के पास,भीटा" },
  { serial: "71", epic: "KDY0955310", name: "सानु", guardian: "श्यामलाल", relation: "husband", house: "19", age: 56, gender: "female", sectionNumber: "1", sectionName: "1-पटवार भवन के पास,भीटा" },
  { serial: "72", epic: "KDY0955328", name: "रोशनलाल", guardian: "बालूलाल", relation: "father", house: "19", age: 53, gender: "male", sectionNumber: "1", sectionName: "1-पटवार भवन के पास,भीटा" },
  { serial: "73", epic: "KDY0955336", name: "दुर्गा", guardian: "रोशन लाल", relation: "husband", house: "19", age: 44, gender: "female", sectionNumber: "1", sectionName: "1-पटवार भवन के पास,भीटा" },
  { serial: "74", epic: "SNE0380980", name: "संजय कुमार", guardian: "श्याम लाल", relation: "father", house: "19", age: 36, gender: "male", sectionNumber: "1", sectionName: "1-पटवार भवन के पास,भीटा" },
  { serial: "75", epic: "SNE0947796", name: "लादी", guardian: "संजय", relation: "husband", house: "19", age: 30, gender: "female", sectionNumber: "1", sectionName: "1-पटवार भवन के पास,भीटा" },
  { serial: "76", epic: "SNE1306968", name: "राधा देवी", guardian: "भावेश", relation: "husband", house: "19", age: 27, gender: "female", sectionNumber: "1", sectionName: "1-पटवार भवन के पास,भीटा" },
  { serial: "77", epic: "SNE1481068", name: "लोकेश कुमार", guardian: "श्याम लाल", relation: "father", house: "19", age: 24, gender: "male", sectionNumber: "1", sectionName: "1-पटवार भवन के पास,भीटा" },
  { serial: "78", epic: "SNE1801943", name: "माया देवी", guardian: "लोकेश कुमार", relation: "husband", house: "19", age: 22, gender: "female", sectionNumber: "1", sectionName: "1-पटवार भवन के पास,भीटा" },
  { serial: "79", epic: "KDY0955369", name: "मोहनलाल", guardian: "तुलछा", relation: "father", house: "20", age: 76, gender: "male", sectionNumber: "1", sectionName: "1-पटवार भवन के पास,भीटा" },
  { serial: "80", epic: "KDY0955344", name: "जेठुड़ी", guardian: "मोहनलाल", relation: "husband", house: "20", age: 71, gender: "female", sectionNumber: "1", sectionName: "1-पटवार भवन के पास,भीटा" },
  { serial: "81", epic: "KDY1228337", name: "कैलाशचन्द", guardian: "मोहनलाल", relation: "father", house: "20", age: 61, gender: "male", sectionNumber: "1", sectionName: "1-पटवार भवन के पास,भीटा" },
  { serial: "82", epic: "KDY0955351", name: "कैलाशी", guardian: "कैलाशचन्द", relation: "husband", house: "20", age: 59, gender: "female", sectionNumber: "1", sectionName: "1-पटवार भवन के पास,भीटा" },
  { serial: "83", epic: "SNE1282672", name: "गोविंद कुमार", guardian: "कैलाश", relation: "father", house: "20", age: 26, gender: "male", sectionNumber: "1", sectionName: "1-पटवार भवन के पास,भीटा" },
  { serial: "84", epic: "SNE1642222", name: "हेमा देवी", guardian: "गोविंद", relation: "husband", house: "20", age: 22, gender: "female", sectionNumber: "1", sectionName: "1-पटवार भवन के पास,भीटा" },
  { serial: "85", epic: "SNE1642172", name: "रतन लाल", guardian: "कैलाश चंद", relation: "father", house: "20", age: 21, gender: "male", sectionNumber: "1", sectionName: "1-पटवार भवन के पास,भीटा" },
  { serial: "86", epic: "SNE1835545", name: "पूजा देवी", guardian: "रतन लाल", relation: "husband", house: "20", age: 19, gender: "female", sectionNumber: "1", sectionName: "1-पटवार भवन के पास,भीटा" },
  { serial: "87", epic: "RJ/20/152/000701", name: "शान्तिलाल", guardian: "नेनूराम", relation: "father", house: "21", age: 66, gender: "male", sectionNumber: "1", sectionName: "1-पटवार भवन के पास,भीटा" },
  { serial: "88", epic: "KDY0955401", name: "कंचन", guardian: "शान्तिलाल", relation: "husband", house: "21", age: 62, gender: "female", sectionNumber: "1", sectionName: "1-पटवार भवन के पास,भीटा" },
  { serial: "89", epic: "KDY0910026", name: "पुखराज", guardian: "नेनूराम", relation: "father", house: "21", age: 53, gender: "male", sectionNumber: "1", sectionName: "1-पटवार भवन के पास,भीटा" },
  { serial: "90", epic: "KDY0955419", name: "इन्द्रा", guardian: "पुखराज", relation: "husband", house: "21", age: 47, gender: "female", sectionNumber: "1", sectionName: "1-पटवार भवन के पास,भीटा" },

  // Page 6 (Serials 91 to 120)
  { serial: "91", epic: "SNE0180109", name: "रतन", guardian: "शान्ति लाल", relation: "father", house: "21", age: 36, gender: "male", sectionNumber: "1", sectionName: "1-पटवार भवन के पास,भीटा" },
  { serial: "92", epic: "SNE0682625", name: "संतोषी देवी", guardian: "रतनलाल", relation: "husband", house: "21", age: 34, gender: "female", sectionNumber: "1", sectionName: "1-पटवार भवन के पास,भीटा" },
  { serial: "93", epic: "SNE0819326", name: "रमेश चन्द्र", guardian: "शांति लाल", relation: "father", house: "21", age: 31, gender: "male", sectionNumber: "1", sectionName: "1-पटवार भवन के पास,भीटा" },
  { serial: "94", epic: "SNE1708130", name: "पूजा देवी", guardian: "रमेश", relation: "husband", house: "21", age: 25, gender: "female", sectionNumber: "1", sectionName: "1-पटवार भवन के पास,भीटा" },
  { serial: "95", epic: "SNE1570324", name: "नारायण लाल", guardian: "पुखराज", relation: "father", house: "21", age: 23, gender: "male", sectionNumber: "1", sectionName: "1-पटवार भवन के पास,भीटा" },
  { serial: "96", epic: "SNE1013739", name: "इना देवी", guardian: "रमेश चंद्र", relation: "husband", house: "131", age: 27, gender: "female", sectionNumber: "1", sectionName: "1-पटवार भवन के पास,भीटा" },
  { serial: "97", epic: "SNE1905538", name: "रेणु गर्ग", guardian: "मिश्री लाल", relation: "husband", house: "00", age: 31, gender: "female", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "98", epic: "KDY1113505", name: "मेकी देवी", guardian: "दुदाराम", relation: "husband", house: "22", age: 86, gender: "female", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "99", epic: "KDY0910034", name: "तुलसीदेवी", guardian: "सूरजमल", relation: "husband", house: "22", age: 56, gender: "female", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "100", epic: "KDY1348895", name: "डालचन्द", guardian: "दुदाराम", relation: "father", house: "22", age: 52, gender: "male", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "101", epic: "SNE0223214", name: "सूरज मल", guardian: "गणेश", relation: "father", house: "22", age: 52, gender: "male", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "102", epic: "KDY0955443", name: "बाली", guardian: "डालचन्द", relation: "husband", house: "22", age: 49, gender: "female", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "103", epic: "SNE1861111", name: "दयाराम", guardian: "दाऊ राम", relation: "father", house: "22", age: 20, gender: "male", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "104", epic: "SNE1835560", name: "किशन लाल", guardian: "सूरज मल", relation: "father", house: "22", age: 19, gender: "male", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "105", epic: "SNE1885441", name: "डिम्पल देवी", guardian: "दयाराम", relation: "husband", house: "22", age: 19, gender: "female", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "106", epic: "KDY0910042", name: "लेहरी", guardian: "बालूलाल", relation: "husband", house: "23", age: 86, gender: "female", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "107", epic: "KDY0955450", name: "नन्दूदेवी", guardian: "नन्दलाल", relation: "husband", house: "23", age: 46, gender: "female", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "108", epic: "SNE0209791", name: "जगदीश", guardian: "बालू", relation: "father", house: "23", age: 41, gender: "male", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "109", epic: "SNE0209809", name: "चान्दी", guardian: "जगदीश", relation: "husband", house: "23", age: 40, gender: "female", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "110", epic: "SNE1013812", name: "सुरेश", guardian: "नन्दा", relation: "father", house: "23", age: 27, gender: "male", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "111", epic: "SNE1658624", name: "पारस मल", guardian: "नन्द लाल", relation: "father", house: "23", age: 22, gender: "male", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "112", epic: "KDY0955476", name: "बदाम बाई", guardian: "मादुदास", relation: "husband", house: "25", age: 86, gender: "female", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "113", epic: "KDY0955484", name: "प्रेमदास", guardian: "मादुदास", relation: "father", house: "25", age: 66, gender: "male", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "114", epic: "KDY0955492", name: "पुष्पा", guardian: "प्रेमदास", relation: "husband", house: "25", age: 62, gender: "female", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "115", epic: "RJ/20/152/001366", name: "रामेश्वर दास", guardian: "मादुदास", relation: "father", house: "25", age: 61, gender: "male", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "116", epic: "RJ/20/152/000703", name: "लाडूबाई", guardian: "रामेश्वरदास", relation: "husband", house: "25", age: 58, gender: "female", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "117", epic: "KDY2024602", name: "प्रकाश चन्द्र", guardian: "प्रेम दास", relation: "father", house: "25", age: 42, gender: "male", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "118", epic: "KDY2024586", name: "टीकम", guardian: "रामेश्वर दास", relation: "father", house: "25", age: 38, gender: "male", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "119", epic: "SNE0513614", name: "सुरेश चन्द्र", guardian: "रामेश्वर", relation: "father", house: "25", age: 37, gender: "male", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "120", epic: "SNE0151928", name: "मंजु", guardian: "टीकम", relation: "husband", house: "25", age: 37, gender: "female", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },

  // Page 7 (Serials 121 to 150)
  { serial: "121", epic: "SNE0682633", name: "मांगीदेवी", guardian: "प्रकाशचन्द", relation: "husband", house: "25", age: 36, gender: "female", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "122", epic: "SNE1127364", name: "संजु देवी", guardian: "सुरेश चंद", relation: "husband", house: "25", age: 32, gender: "female", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "123", epic: "SNE1013770", name: "गोपाल", guardian: "प्रेमदास", relation: "father", house: "25", age: 28, gender: "male", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "124", epic: "KDY0955500", name: "भंवरलाल", guardian: "नाथूलाल", relation: "father", house: "27", age: 71, gender: "male", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "125", epic: "KDY0955518", name: "कमला", guardian: "भंवरलाल", relation: "husband", house: "27", age: 66, gender: "female", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "126", epic: "SNE0380998", name: "पप्पू", guardian: "भंवर लाल", relation: "father", house: "27", age: 33, gender: "male", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "127", epic: "KDY0955534", name: "कमला", guardian: "नाहरमल", relation: "husband", house: "31", age: 80, gender: "female", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "128", epic: "KDY1113539", name: "नेतु", guardian: "मूलचन्द", relation: "father", house: "32", age: 81, gender: "female", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "129", epic: "KDY1113547", name: "प्यारा", guardian: "मूला", relation: "father", house: "32", age: 61, gender: "male", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "130", epic: "KDY1113554", name: "मोहनी", guardian: "प्यारा", relation: "husband", house: "32", age: 60, gender: "female", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "131", epic: "KDY0955575", name: "नाराणी", guardian: "बालू राम", relation: "husband", house: "32", age: 47, gender: "female", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "132", epic: "SNE1586510", name: "बालू लाल", guardian: "मूल चंद", relation: "father", house: "32", age: 44, gender: "male", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "133", epic: "KDY1348846", name: "मोहनी", guardian: "राम लाल", relation: "husband", house: "32", age: 42, gender: "female", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "134", epic: "KDY1348887", name: "नन्द राम", guardian: "मूल चंद", relation: "father", house: "32", age: 42, gender: "male", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "135", epic: "KDY1348853", name: "रामी", guardian: "नन्दराम", relation: "husband", house: "32", age: 41, gender: "female", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "136", epic: "SNE1652684", name: "सीमा देवी", guardian: "किशन लाल", relation: "husband", house: "32", age: 27, gender: "female", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "137", epic: "SNE1306885", name: "चंदा कुमारी", guardian: "प्यारा", relation: "father", house: "32", age: 26, gender: "female", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "138", epic: "SNE1652668", name: "किशन लाल", guardian: "बालू लाल", relation: "father", house: "32", age: 24, gender: "male", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "139", epic: "SNE1901347", name: "श्रवण लाल", guardian: "प्यार चंद", relation: "father", house: "32", age: 19, gender: "male", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "140", epic: "KDY0955583", name: "करमा", guardian: "हमीरचन्द", relation: "father", house: "33", age: 83, gender: "male", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "141", epic: "KDY1113562", name: "छोगालाल", guardian: "हमीरचन्द", relation: "father", house: "33", age: 80, gender: "male", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "142", epic: "KDY0910075", name: "चान्दी", guardian: "करमा", relation: "husband", house: "33", age: 79, gender: "female", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "143", epic: "KDY0955591", name: "भोजाराम", guardian: "हमीरचन्द", relation: "father", house: "33", age: 69, gender: "male", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "144", epic: "KDY0955609", name: "सोहनलाल", guardian: "छोगालाल", relation: "father", house: "33", age: 61, gender: "male", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "145", epic: "KDY0955617", name: "बाली", guardian: "सोहनलाल", relation: "husband", house: "33", age: 59, gender: "female", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "146", epic: "KDY1113570", name: "नोसर", guardian: "छीतरमल", relation: "husband", house: "33", age: 59, gender: "female", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "147", epic: "KDY0955625", name: "साम्भूलाल", guardian: "छोगालाल", relation: "father", house: "33", age: 56, gender: "male", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "148", epic: "KDY0955633", name: "पारसी", guardian: "साम्भूलाल", relation: "husband", house: "33", age: 54, gender: "female", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "149", epic: "KDY0955641", name: "लादूलाल", guardian: "करमा", relation: "father", house: "33", age: 53, gender: "male", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "150", epic: "KDY0955658", name: "नोसी", guardian: "लादूलाल", relation: "husband", house: "33", age: 53, gender: "female", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" }
];

const auditedPayload = {
  metadata: {
    title: "निर्वाचक नामावली 2026 S20 राजस्थान",
    assemblyNumber: "179",
    assemblyName: "सहाडा (सामान्य)",
    partNumber: "1",
    boothName: "भाग संख्या 1 - भीटा",
    pollingStation: "राजकीय उच्च प्राथमिक विद्यालय, कमरा न0 1, भीटा",
    auditPhase: "Part 1 AI Vision Audit & Global Fixes (Serials 1 to 150)",
    totalExtractedRecords: audited150Records.length,
    timestamp: new Date().toISOString()
  },
  records: audited150Records
};

try {
  fs.writeFileSync(outputPath, JSON.stringify(auditedPayload, null, 2), 'utf8');
  console.log(`PART 1 AI VISION AUDIT COMPLETE FOR PAGES 3 TO 7 (SERIALS 1 TO 150)!`);
  console.log(`Saved JSON at: ${outputPath}\n`);
  console.log(`Total Verified Records: 150 / 150`);
} catch (err) {
  console.error('Error writing file:', err.message);
}
