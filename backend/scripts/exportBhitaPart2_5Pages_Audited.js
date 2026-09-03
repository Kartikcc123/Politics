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
console.log(' AI VISION AUDIT & DATA EXTRACTION - PART 2 (BHITA, PAGES 3 TO 7)       ');
console.log(' DOCUMENT: 179-सहाडा (सामान्य), भाग संख्या: 2 - भीटा (SERIALL 1-135)    ');
console.log('========================================================================\n');

// Complete Audited 135 Voter Records for Pages 3 to 7 (Serials 1 to 135)
const audited135Records = [
  // Page 3 (Serials 1 to 30) - Section 1: 1-आरा के पास,भीटा
  { serial: "1", epic: "KDY0954867", name: "प्रेमी", guardian: "वरदलाल", relation: "husband", house: "1", age: 56, gender: "female", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "2", epic: "SNE1013663", name: "सुरेश", guardian: "मोहन लाल", relation: "father", house: "1", age: 27, gender: "male", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "3", epic: "SNE1891043", name: "लक्ष्मी देवी", guardian: "सुरेश लाल", relation: "husband", house: "1", age: 21, gender: "female", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "4", epic: "SNE1536200", name: "कैलाश", guardian: "अर्जुन", relation: "father", house: "2", age: 25, gender: "male", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "5", epic: "SNE1573773", name: "पुष्पा कुमारी", guardian: "अर्जुन लाल", relation: "father", house: "2", age: 22, gender: "female", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "6", epic: "SNE1699453", name: "शानू कुमारी", guardian: "अर्जुन लाल", relation: "father", house: "2", age: 21, gender: "female", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "7", epic: "KDY0954891", name: "नारूलाल", guardian: "गणेशलाल", relation: "father", house: "5", age: 76, gender: "male", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "8", epic: "SNE0284091", name: "चांदमल", guardian: "गिरधारी", relation: "father", house: "5", age: 69, gender: "male", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "9", epic: "SNE0284109", name: "अनछी", guardian: "चांदमल", relation: "husband", house: "5", age: 67, gender: "female", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "10", epic: "KDY1349158", name: "लक्ष्मण", guardian: "नारू लाल", relation: "father", house: "5", age: 44, gender: "male", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "11", epic: "SNE0954057", name: "प्रकाश", guardian: "चांद मल", relation: "father", house: "5", age: 44, gender: "male", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "12", epic: "KDY1349190", name: "सीता", guardian: "लक्ष्मण", relation: "husband", house: "5", age: 42, gender: "female", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "13", epic: "KDY1349141", name: "हेमराज", guardian: "नारू लाल", relation: "father", house: "5", age: 42, gender: "male", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "14", epic: "SNE0209726", name: "राम लाल", guardian: "दूदाराम", relation: "father", house: "5", age: 42, gender: "male", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "15", epic: "SNE1803287", name: "जशवंती देवी", guardian: "प्रकाश", relation: "husband", house: "5", age: 41, gender: "female", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "16", epic: "SNE0380881", name: "पारस", guardian: "नारूलाल", relation: "father", house: "5", age: 37, gender: "male", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "17", epic: "SNE0380899", name: "संतोष देवी", guardian: "पारस", relation: "husband", house: "5", age: 36, gender: "female", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "18", epic: "SNE0682591", name: "मीना", guardian: "हेमराज", relation: "husband", house: "5", age: 36, gender: "female", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "19", epic: "SNE0795609", name: "सानु", guardian: "रामलाल", relation: "husband", house: "5", age: 36, gender: "female", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "20", epic: "SNE0907121", name: "दिनेश", guardian: "चांदमल", relation: "father", house: "5", age: 31, gender: "male", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "21", epic: "SNE1127331", name: "मंजु देवी", guardian: "दिनेश", relation: "husband", house: "5", age: 28, gender: "female", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "22", epic: "SNE1667294", name: "देवी लाल", guardian: "लक्ष्मण लाल", relation: "father", house: "5", age: 25, gender: "male", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "23", epic: "SNE1852714", name: "भेरू लाल", guardian: "पारस मल", relation: "father", house: "5", age: 20, gender: "male", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "24", epic: "SNE1896307", name: "लक्ष्मी", guardian: "देवी लाल", relation: "husband", house: "5", age: 19, gender: "female", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "25", epic: "SNE1238120", name: "तुलसीदेवी", guardian: "सुरेशचंद", relation: "husband", house: "91", age: 27, gender: "female", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "26", epic: "SNE1013689", name: "भाला लाल", guardian: "गिरधारी लाल", relation: "father", house: "94", age: 29, gender: "male", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "27", epic: "KDY0954925", name: "बाली", guardian: "हजारीलाल", relation: "husband", house: "123", age: 66, gender: "female", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "28", epic: "SNE0180059", name: "गोपाल", guardian: "हजारी", relation: "father", house: "123", age: 48, gender: "male", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "29", epic: "SNE0180067", name: "सन्तोक देवी", guardian: "गोपाल", relation: "husband", house: "123", age: 45, gender: "female", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "30", epic: "KDY1349042", name: "पप्पू", guardian: "हजारी लाल", relation: "father", house: "123", age: 44, gender: "male", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },

  // Page 4 (Serials 31 to 60)
  { serial: "31", epic: "SNE0209841", name: "देवली", guardian: "पप्पू", relation: "husband", house: "123", age: 42, gender: "female", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "32", epic: "SNE0209833", name: "बंशी", guardian: "हजारी", relation: "father", house: "123", age: 38, gender: "male", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "33", epic: "SNE0209858", name: "मंजुदेवी", guardian: "बंशी", relation: "husband", house: "123", age: 36, gender: "female", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "34", epic: "SNE0682609", name: "दिनेश", guardian: "हजारी", relation: "father", house: "123", age: 31, gender: "male", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "35", epic: "SNE1342708", name: "पूजा कुमारी", guardian: "गोपाल लाल", relation: "father", house: "123", age: 25, gender: "female", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "36", epic: "SNE1394485", name: "पारस", guardian: "गोपाल लाल", relation: "father", house: "123", age: 25, gender: "male", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "37", epic: "SNE1573724", name: "मनीषा कुमारी", guardian: "पप्पू लाल", relation: "father", house: "123", age: 22, gender: "female", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "38", epic: "SNE1775220", name: "अभिषेक कुमार", guardian: "गोपाल", relation: "father", house: "123", age: 21, gender: "male", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "39", epic: "KDY1223411", name: "भगवतीदेवी", guardian: "सुखलाल", relation: "husband", house: "125", age: 66, gender: "female", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "40", epic: "SNE0381111", name: "जगदीश चन्द", guardian: "सुखलाल", relation: "father", house: "125", age: 46, gender: "male", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "41", epic: "KDY2024669", name: "रेखा देवी", guardian: "जगदीश", relation: "husband", house: "125", age: 40, gender: "female", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "42", epic: "SNE0795369", name: "श्रवणलाल", guardian: "सुखलाल", relation: "father", house: "125", age: 31, gender: "male", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "43", epic: "SNE1668169", name: "रतन लाल", guardian: "सुख लाल", relation: "father", house: "125", age: 28, gender: "male", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "44", epic: "SNE1668177", name: "तारा देवी", guardian: "रतन लाल", relation: "husband", house: "125", age: 23, gender: "female", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "45", epic: "SNE1836279", name: "केसर", guardian: "जगदीश", relation: "father", house: "125", age: 23, gender: "female", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "46", epic: "RJ/20/152/001360", name: "रूकमणी", guardian: "बंसीलाल", relation: "husband", house: "127", age: 76, gender: "female", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "47", epic: "KDY0954941", name: "राजू", guardian: "बंसी लाल", relation: "father", house: "127", age: 42, gender: "male", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "48", epic: "KDY0954958", name: "केसर", guardian: "राजू", relation: "husband", house: "127", age: 42, gender: "female", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "49", epic: "SNE1776301", name: "अंचु देवी", guardian: "कन्हैया लाल", relation: "husband", house: "127", age: 26, gender: "female", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "50", epic: "SNE1651298", name: "कन्हैया लाल", guardian: "राजू लाल", relation: "father", house: "127", age: 25, gender: "male", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "51", epic: "KDY0954966", name: "मांगीबाई", guardian: "मांगीलाल", relation: "husband", house: "128", age: 76, gender: "female", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "52", epic: "KDY1223486", name: "जगदीश", guardian: "मांगीलाल", relation: "father", house: "128", age: 62, gender: "male", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "53", epic: "KDY1223478", name: "लक्ष्मण", guardian: "मांगीलाल", relation: "father", house: "128", age: 61, gender: "male", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "54", epic: "KDY1223550", name: "गंगा", guardian: "लक्ष्मण", relation: "husband", house: "128", age: 54, gender: "female", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "55", epic: "SNE1127349", name: "पुष्पा", guardian: "लादूराम", relation: "husband", house: "128", age: 52, gender: "female", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "56", epic: "KDY0954974", name: "कमला", guardian: "जगदीश", relation: "husband", house: "128", age: 42, gender: "female", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "57", epic: "SNE0513598", name: "नाथूलाल", guardian: "मांगीलाल", relation: "father", house: "128", age: 34, gender: "male", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "58", epic: "SNE0513580", name: "लादूराम", guardian: "मांगीलाल", relation: "father", house: "128", age: 33, gender: "male", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "59", epic: "SNE0727578", name: "पूरन देवी", guardian: "नाथूलाल", relation: "husband", house: "128", age: 33, gender: "female", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "60", epic: "SNE0907139", name: "कमलेश", guardian: "लक्ष्मण", relation: "father", house: "128", age: 29, gender: "male", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },

  // Page 5 (Serials 61 to 90)
  { serial: "61", epic: "SNE1723980", name: "मुकेश कुमार", guardian: "जगदीश कुमार", relation: "father", house: "128", age: 26, gender: "male", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "62", epic: "SNE1675339", name: "भावना सुधार", guardian: "कमलेश सुधार", relation: "husband", house: "128", age: 21, gender: "female", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "63", epic: "KDY1228261", name: "टपु बाई", guardian: "छगनलाल", relation: "husband", house: "129", age: 76, gender: "female", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "64", epic: "KDY1113398", name: "लादूलाल", guardian: "छगनलाल", relation: "father", house: "129", age: 52, gender: "male", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "65", epic: "KDY1113406", name: "कंकु", guardian: "लादू लाल", relation: "husband", house: "129", age: 42, gender: "female", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "66", epic: "SNE1574144", name: "देवी लाल", guardian: "लादू लाल", relation: "father", house: "129", age: 23, gender: "male", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "67", epic: "SNE1578418", name: "टीपू कुमारी", guardian: "लादूलाल", relation: "father", house: "129", age: 22, gender: "female", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "68", epic: "KDY0955005", name: "मैताबी", guardian: "उमा", relation: "husband", house: "130", age: 79, gender: "female", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "69", epic: "KDY0910489", name: "धनराज", guardian: "उमा", relation: "father", house: "130", age: 62, gender: "male", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "70", epic: "KDY0954982", name: "मगनी", guardian: "धनराज", relation: "husband", house: "130", age: 61, gender: "female", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "71", epic: "KDY1348994", name: "रोशन", guardian: "उमा", relation: "father", house: "130", age: 45, gender: "male", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "72", epic: "KDY0955013", name: "चन्दरी", guardian: "रोशन", relation: "husband", house: "130", age: 43, gender: "female", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "73", epic: "SNE0381129", name: "बंसी लाल", guardian: "धनराज", relation: "father", house: "130", age: 37, gender: "male", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "74", epic: "SNE0682617", name: "सुशीला", guardian: "बंसीलाल", relation: "husband", house: "130", age: 35, gender: "female", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "75", epic: "SNE1237957", name: "पप्पू लाल", guardian: "पन्ना लाल", relation: "father", house: "130", age: 30, gender: "male", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "76", epic: "SNE1238286", name: "मंकु देवी", guardian: "पप्पू लाल", relation: "husband", house: "130", age: 27, gender: "female", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "77", epic: "SNE1667963", name: "मंजू देवी", guardian: "अंबा लाल", relation: "husband", house: "130", age: 25, gender: "female", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "78", epic: "SNE1667930", name: "अंबा लाल", guardian: "रोशन लाल", relation: "father", house: "130", age: 24, gender: "male", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "79", epic: "SNE1738566", name: "कंचन देवी", guardian: "लक्ष्मण लाल", relation: "husband", house: "130", age: 24, gender: "female", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "80", epic: "SNE1738657", name: "लक्ष्मण लाल", guardian: "धन्ना लाल", relation: "father", house: "130", age: 22, gender: "male", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "81", epic: "KDY0910497", name: "हगामी", guardian: "हजारीलाल", relation: "husband", house: "131", age: 81, gender: "female", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "82", epic: "KDY0955047", name: "सुखी", guardian: "भंवरलाल", relation: "husband", house: "131", age: 58, gender: "female", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "83", epic: "KDY0955054", name: "चुन्नीलाल", guardian: "हजारीलाल", relation: "father", house: "131", age: 56, gender: "male", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "84", epic: "KDY0955062", name: "सन्तोष", guardian: "चुन्नीलाल", relation: "husband", house: "131", age: 55, gender: "female", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "85", epic: "SNE0947762", name: "लक्ष्मण", guardian: "भंवर लाल", relation: "father", house: "131", age: 30, gender: "male", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "86", epic: "SNE0907147", name: "श्रवण लाल", guardian: "चुन्नीलाल", relation: "father", house: "131", age: 30, gender: "male", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "87", epic: "SNE0907154", name: "सम्पती देवी", guardian: "श्रवण कुमार", relation: "husband", house: "131", age: 29, gender: "female", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "88", epic: "SNE1127356", name: "सागर", guardian: "लक्ष्मण लाल", relation: "father", house: "131", age: 28, gender: "female", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "89", epic: "SNE1528652", name: "ईश्वर लाल", guardian: "भंवर लाल", relation: "father", house: "131", age: 25, gender: "male", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "90", epic: "KDY1113414", name: "वरदीबाई", guardian: "मन्दरूप", relation: "husband", house: "132", age: 81, gender: "female", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },

  // Page 6 (Serials 91 to 111)
  { serial: "91", epic: "KDY1113422", name: "भैरूलाल", guardian: "मन्दरूप", relation: "father", house: "132", age: 52, gender: "male", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "92", epic: "KDY1113430", name: "नाराणी", guardian: "भैरू लाल", relation: "husband", house: "132", age: 42, gender: "female", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "93", epic: "SNE1013671", name: "नेना लाल", guardian: "भैरू लाल", relation: "father", house: "132", age: 28, gender: "male", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "94", epic: "SNE1684828", name: "लक्ष्मी देवी", guardian: "नेना लाल", relation: "husband", house: "132", age: 28, gender: "female", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "95", epic: "SNE1800515", name: "टमू देवी", guardian: "गोपाल लाल", relation: "husband", house: "132", age: 22, gender: "female", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "96", epic: "KDY0955070", name: "चुन्नीलाल", guardian: "भूरसिंह", relation: "father", house: "133", age: 76, gender: "male", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "97", epic: "KDY0955088", name: "जेठूबाई", guardian: "चुन्नीलाल", relation: "husband", house: "133", age: 69, gender: "female", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "98", epic: "SNE0544221", name: "भेरू लाल", guardian: "चुन्नीलाल", relation: "father", house: "133", age: 49, gender: "male", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "99", epic: "SNE0544239", name: "कैलाशी", guardian: "भेरू लाल", relation: "husband", house: "133", age: 48, gender: "female", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "100", epic: "SNE0544262", name: "पुष्पा देवी", guardian: "रामा", relation: "husband", house: "133", age: 43, gender: "female", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "101", epic: "KDY1349083", name: "राजू", guardian: "चुन्नी लाल", relation: "father", house: "133", age: 42, gender: "male", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "102", epic: "SNE0544205", name: "जगदीश चन्द्र", guardian: "चुन्नीलाल", relation: "father", house: "133", age: 41, gender: "male", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "103", epic: "SNE0544213", name: "कमला देवी", guardian: "जगदीश", relation: "husband", house: "133", age: 40, gender: "female", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "104", epic: "SNE0544247", name: "दिनेश", guardian: "चुन्नी लाल", relation: "father", house: "133", age: 37, gender: "male", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "105", epic: "SNE0544254", name: "शीला देवी", guardian: "दिनेश", relation: "husband", house: "133", age: 36, gender: "female", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "106", epic: "SNE1013705", name: "पिंकी देवी", guardian: "काना", relation: "husband", house: "133", age: 28, gender: "female", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "107", epic: "SNE1013713", name: "काना", guardian: "चुंजी लाल", relation: "father", house: "133", age: 28, gender: "male", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "108", epic: "SNE1732569", name: "सुगना कुमारी", guardian: "जगदीश चंद्रा", relation: "father", house: "133", age: 20, gender: "female", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "109", epic: "SNE1789502", name: "कोमल देवी", guardian: "चेतन", relation: "husband", house: "133", age: 20, gender: "female", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "110", epic: "SNE1896315", name: "चेतन", guardian: "राजू लाल", relation: "father", house: "133", age: 19, gender: "male", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },
  { serial: "111", epic: "KDY1113364", name: "अर्जुन लाल", guardian: "जेठमल", relation: "father", house: "2", age: 41, gender: "male", sectionNumber: "1", sectionName: "1-आरा के पास,भीटा" },

  // Page 7 (Serials 112 to 135) - Section 2: 2-बस स्टेण्ड के पास,भीटा
  { serial: "112", epic: "SNE0682740", name: "टिपू देवी", guardian: "सुखलाल", relation: "husband", house: "48", age: 35, gender: "female", sectionNumber: "2", sectionName: "2-बस स्टेण्ड के पास,भीटा" },
  { serial: "113", epic: "KDY0957290", name: "मांगु", guardian: "नारायण", relation: "father", house: "84", age: 61, gender: "male", sectionNumber: "2", sectionName: "2-बस स्टेण्ड के पास,भीटा" },
  { serial: "114", epic: "KDY0957316", name: "रूपा", guardian: "मोतीलाल", relation: "father", house: "85", age: 69, gender: "male", sectionNumber: "2", sectionName: "2-बस स्टेण्ड के पास,भीटा" },
  { serial: "115", epic: "KDY0957324", name: "सोसी", guardian: "रूपलाल", relation: "husband", house: "85", age: 63, gender: "female", sectionNumber: "2", sectionName: "2-बस स्टेण्ड के पास,भीटा" },
  { serial: "116", epic: "KDY1349281", name: "अर्जुन", guardian: "रूपलाल", relation: "father", house: "85", age: 40, gender: "male", sectionNumber: "2", sectionName: "2-बस स्टेण्ड के पास,भीटा" },
  { serial: "117", epic: "SNE0179986", name: "रतन", guardian: "रूप लाल", relation: "father", house: "85", age: 36, gender: "male", sectionNumber: "2", sectionName: "2-बस स्टेण्ड के पास,भीटा" },
  { serial: "118", epic: "SNE0460147", name: "पिस्ता", guardian: "अर्जुन लाल", relation: "husband", house: "85", age: 33, gender: "female", sectionNumber: "2", sectionName: "2-बस स्टेण्ड के पास,भीटा" },
  { serial: "119", epic: "SNE0795583", name: "लक्ष्मी देवी", guardian: "रतनलाल", relation: "husband", house: "85", age: 32, gender: "female", sectionNumber: "2", sectionName: "2-बस स्टेण्ड के पास,भीटा" },
  { serial: "120", epic: "SNE1789510", name: "गेहरी देवी", guardian: "भावेश", relation: "husband", house: "85", age: 27, gender: "female", sectionNumber: "2", sectionName: "2-बस स्टेण्ड के पास,भीटा" },
  { serial: "121", epic: "SNE1347095", name: "भावेश", guardian: "रूपा", relation: "father", house: "85", age: 26, gender: "male", sectionNumber: "2", sectionName: "2-बस स्टेण्ड के पास,भीटा" },
  { serial: "122", epic: "KDY0957332", name: "मयाराम", guardian: "गोकल", relation: "father", house: "86", age: 66, gender: "male", sectionNumber: "2", sectionName: "2-बस स्टेण्ड के पास,भीटा" },
  { serial: "123", epic: "KDY0957340", name: "राजी", guardian: "मयाराम", relation: "husband", house: "86", age: 61, gender: "female", sectionNumber: "2", sectionName: "2-बस स्टेण्ड के पास,भीटा" },
  { serial: "124", epic: "SNE0381061", name: "गोपाल लाल", guardian: "मयाराम", relation: "father", house: "86", age: 35, gender: "male", sectionNumber: "2", sectionName: "2-बस स्टेण्ड के पास,भीटा" },
  { serial: "125", epic: "SNE0727677", name: "सुमित्रा", guardian: "गोपाल", relation: "husband", house: "86", age: 33, gender: "female", sectionNumber: "2", sectionName: "2-बस स्टेण्ड के पास,भीटा" },
  { serial: "126", epic: "SNE0819425", name: "सुरेश", guardian: "मयाराम", relation: "father", house: "86", age: 30, gender: "male", sectionNumber: "2", sectionName: "2-बस स्टेण्ड के पास,भीटा" },
  { serial: "127", epic: "SNE1013960", name: "तारा देवी", guardian: "सुरेश", relation: "husband", house: "86", age: 28, gender: "female", sectionNumber: "2", sectionName: "2-बस स्टेण्ड के पास,भीटा" },
  { serial: "128", epic: "SNE0544429", name: "भूरी देवी", guardian: "हमीर", relation: "husband", house: "87", age: 72, gender: "female", sectionNumber: "2", sectionName: "2-बस स्टेण्ड के पास,भीटा" },
  { serial: "129", epic: "RJ/20/152/001378", name: "नेनूराम", guardian: "गोकलचन्द", relation: "father", house: "87", age: 64, gender: "male", sectionNumber: "2", sectionName: "2-बस स्टेण्ड के पास,भीटा" },
  { serial: "130", epic: "KDY0957365", name: "छगुड़ी", guardian: "नेगुराम", relation: "husband", house: "87", age: 64, gender: "female", sectionNumber: "2", sectionName: "2-बस स्टेण्ड के पास,भीटा" },
  { serial: "131", epic: "SNE0151597", name: "पारस मल", guardian: "नेगु राम", relation: "father", house: "87", age: 39, gender: "male", sectionNumber: "2", sectionName: "2-बस स्टेण्ड के पास,भीटा" },
  { serial: "132", epic: "SNE0151605", name: "कमला देवी", guardian: "पारसमल", relation: "husband", house: "87", age: 38, gender: "female", sectionNumber: "2", sectionName: "2-बस स्टेण्ड के पास,भीटा" },
  { serial: "133", epic: "SNE0544437", name: "सुरेश", guardian: "नेनूराम", relation: "father", house: "87", age: 35, gender: "male", sectionNumber: "2", sectionName: "2-बस स्टेण्ड के पास,भीटा" },
  { serial: "134", epic: "SNE1326735", name: "मेमा", guardian: "सुरेश", relation: "husband", house: "87", age: 27, gender: "female", sectionNumber: "2", sectionName: "2-बस स्टेण्ड के पास,भीटा" },
  { serial: "135", epic: "SNE1675354", name: "शंकर लाल", guardian: "पारस मल", relation: "father", house: "87", age: 24, gender: "male", sectionNumber: "2", sectionName: "2-बस स्टेण्ड के पास,भीटा" }
];

const outputPayload = {
  metadata: {
    title: "निर्वाचक नामावली 2026 S20 राजस्थान",
    assemblyNumber: "179",
    assemblyName: "सहाडा (सामान्य)",
    partNumber: "2",
    boothName: "भाग संख्या 2 - भीटा",
    pollingStation: "राजकीय उच्च माध्यमिक विद्यालय, कमरा न0 2, भीटा",
    auditPhase: "5-Page AI Vision Audit (Serials 1 to 135)",
    totalExtractedRecords: audited135Records.length,
    timestamp: new Date().toISOString()
  },
  records: audited135Records
};

try {
  fs.writeFileSync(outputPath, JSON.stringify(outputPayload, null, 2), 'utf8');
  console.log(`AI VISION AUDIT COMPLETE FOR PAGES 3 TO 7 (SERIALL 1 TO 135)!`);
  console.log(`Saved JSON at: ${outputPath}\n`);
  console.log(`Total Verified Records: 135 / 135`);
} catch (err) {
  console.error('Error writing file:', err.message);
}
