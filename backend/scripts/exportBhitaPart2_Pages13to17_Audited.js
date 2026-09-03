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
console.log(' AI VISION AUDIT & DATA EXTRACTION - PART 2 (BHITA, PAGES 13 TO 17)     ');
console.log(' DOCUMENT: 179-सहाडा (सामान्य), भाग संख्या: 2 - भीटा (SERIALS 281-392)   ');
console.log('========================================================================\n');

// Complete Audited 112 Voter Records for Pages 13 to 17 (Serials 281 to 392)
const audited112Records = [
  // Page 13 (Serials 281 to 310) - Section 4: 4-माताजी मगरी,भीटा
  { serial: "281", epic: "SNE0682781", name: "नोसी", guardian: "भेरूलाल", relation: "husband", house: "116", age: 37, gender: "female", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "282", epic: "KDY2024941", name: "भेरू लाल", guardian: "वेणीराम", relation: "father", house: "116", age: 37, gender: "male", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "283", epic: "KDY0957886", name: "नेनुबाई", guardian: "जेराम", relation: "husband", house: "134", age: 71, gender: "female", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "284", epic: "SNE0544460", name: "कैलाश", guardian: "जयराम", relation: "father", house: "134", age: 36, gender: "male", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "285", epic: "SNE0544478", name: "जमना", guardian: "जयराम", relation: "husband", house: "134", age: 33, gender: "female", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "286", epic: "SNE0601302", name: "नाथूलाल", guardian: "जयराम", relation: "father", house: "134", age: 31, gender: "male", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "287", epic: "SNE0795484", name: "पानी देवी", guardian: "जमना", relation: "husband", house: "134", age: 31, gender: "female", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "288", epic: "SNE0795591", name: "शान्ति देवी", guardian: "कैलाश", relation: "husband", house: "134", age: 31, gender: "female", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "289", epic: "SNE1307149", name: "रेखा देवी", guardian: "नाथू", relation: "husband", house: "134", age: 28, gender: "female", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "290", epic: "KDY0957910", name: "सन्तोष", guardian: "शंकर लाल", relation: "father", house: "135", age: 42, gender: "female", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "291", epic: "SNE0381145", name: "सुनिल कुमार", guardian: "शंकर लाल", relation: "father", house: "135", age: 33, gender: "male", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "292", epic: "SNE1127521", name: "माया देवी", guardian: "सुनिल कुमार", relation: "husband", house: "135", age: 32, gender: "female", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "293", epic: "KDY1113943", name: "जमना", guardian: "रूपलाल", relation: "father", house: "136", age: 66, gender: "male", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "294", epic: "KDY0957928", name: "प्यारीबाई", guardian: "जमनालाल", relation: "husband", house: "136", age: 61, gender: "female", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "295", epic: "SNE0682799", name: "दिनेश", guardian: "जमना", relation: "father", house: "136", age: 33, gender: "male", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "296", epic: "SNE1736479", name: "भेरू लाल", guardian: "जमना लाल", relation: "father", house: "136", age: 33, gender: "male", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "297", epic: "SNE0682807", name: "प्रकाश", guardian: "जमना", relation: "father", house: "136", age: 32, gender: "male", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "298", epic: "SNE1595339", name: "श्रावण कुमार", guardian: "जमना लाल", relation: "father", house: "136", age: 24, gender: "male", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "299", epic: "KDY0957936", name: "चांदी", guardian: "गोकललाल", relation: "father", house: "137", age: 66, gender: "female", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "300", epic: "SNE0795419", name: "मीना", guardian: "गोकल", relation: "father", house: "137", age: 33, gender: "female", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "301", epic: "RJ/20/152/001375", name: "छगुबाई", guardian: "खेमाराम", relation: "husband", house: "138", age: 66, gender: "female", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "302", epic: "KDY0957969", name: "आसुराम", guardian: "माता", relation: "father", house: "139", age: 56, gender: "male", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "303", epic: "KDY0957977", name: "शंकरीबाई", guardian: "आसुराम", relation: "husband", house: "139", age: 54, gender: "female", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "304", epic: "SNE1715259", name: "सीता देवी", guardian: "सुरेश", relation: "husband", house: "139", age: 28, gender: "female", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "305", epic: "SNE1714625", name: "सुरेश लाल", guardian: "आसु राम", relation: "father", house: "139", age: 23, gender: "male", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "306", epic: "KDY0957985", name: "सवाईराम", guardian: "उदेराम", relation: "father", house: "140", age: 70, gender: "male", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "307", epic: "KDY0957993", name: "सुन्दर", guardian: "सवाईराम", relation: "husband", house: "140", age: 66, gender: "female", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "308", epic: "SNE1360395", name: "मांगू", guardian: "डालु", relation: "father", house: "140", age: 35, gender: "male", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "309", epic: "SNE0819482", name: "नारायण", guardian: "डालू", relation: "father", house: "140", age: 34, gender: "male", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "310", epic: "SNE0891887", name: "पारस", guardian: "सवाईराम", relation: "father", house: "140", age: 33, gender: "male", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },

  // Page 14 (Serials 311 to 340)
  { serial: "311", epic: "SNE0819474", name: "पुष्पा", guardian: "नारायण", relation: "husband", house: "140", age: 32, gender: "female", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "312", epic: "SNE0891895", name: "मीरा", guardian: "पारस", relation: "husband", house: "140", age: 32, gender: "female", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "313", epic: "SNE1360445", name: "भगवती देवी", guardian: "मांगू", relation: "husband", house: "140", age: 32, gender: "female", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "314", epic: "SNE0907428", name: "राजमल", guardian: "डालु", relation: "father", house: "140", age: 30, gender: "male", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "315", epic: "SNE0907436", name: "शांति देवी", guardian: "राजमल", relation: "husband", house: "140", age: 29, gender: "female", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "316", epic: "SNE1685460", name: "लादू देवी", guardian: "वीरम", relation: "husband", house: "140", age: 24, gender: "female", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "317", epic: "KDY0958009", name: "शम्भूनाथ", guardian: "कंवरनाथ", relation: "father", house: "141", age: 79, gender: "male", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "318", epic: "KDY0958025", name: "भंवरनाथ", guardian: "हीरानाथ", relation: "father", house: "141", age: 56, gender: "male", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "319", epic: "KDY0958033", name: "प्रेम", guardian: "भंवरनाथ", relation: "husband", house: "141", age: 54, gender: "female", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "320", epic: "KDY1349166", name: "भेरू नाथ", guardian: "शम्भू नाथ", relation: "father", house: "141", age: 42, gender: "male", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "321", epic: "KDY0958041", name: "सागी", guardian: "भेरू नाथ", relation: "husband", house: "141", age: 42, gender: "female", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "322", epic: "SNE1014059", name: "श्रवण", guardian: "भंवर लाल", relation: "father", house: "141", age: 28, gender: "male", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "323", epic: "SNE1306927", name: "माया देवी", guardian: "श्रवण", relation: "husband", house: "141", age: 27, gender: "female", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "324", epic: "SNE1904986", name: "सुरेश नाथ", guardian: "भंवर नाथ", relation: "father", house: "141", age: 19, gender: "male", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "325", epic: "KDY0958066", name: "लेहरू", guardian: "वेणीराम", relation: "father", house: "142", age: 46, gender: "male", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "326", epic: "KDY2024578", name: "जगदीश चन्द्र", guardian: "रूपा", relation: "father", house: "142", age: 44, gender: "male", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "327", epic: "KDY0958074", name: "पुष्पा", guardian: "लेहरू", relation: "husband", house: "142", age: 42, gender: "female", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "328", epic: "KDY2024677", name: "लादी देवी", guardian: "जगदीश चन्द्र", relation: "husband", house: "142", age: 41, gender: "female", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "329", epic: "SNE0381152", name: "डालु राम", guardian: "वेणीराम", relation: "father", house: "142", age: 33, gender: "male", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "330", epic: "SNE1014018", name: "पिंटु", guardian: "लेहरू", relation: "father", house: "142", age: 29, gender: "male", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "331", epic: "SNE1127547", name: "सीमा देवी", guardian: "पिंटु", relation: "husband", house: "142", age: 27, gender: "female", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "332", epic: "SNE1741719", name: "सुगना देवी", guardian: "लादू लाल", relation: "husband", house: "142", age: 27, gender: "female", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "333", epic: "SNE1738996", name: "लादू लाल", guardian: "लेहरू लाल", relation: "father", house: "142", age: 23, gender: "male", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "334", epic: "KDY0958108", name: "तुलछीराम", guardian: "खिमाना", relation: "father", house: "144", age: 69, gender: "male", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "335", epic: "KDY0958116", name: "डालीबाई", guardian: "तुलछीराम", relation: "husband", house: "144", age: 66, gender: "female", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "336", epic: "SNE0381178", name: "रामलाल", guardian: "तुलसीराम", relation: "father", house: "144", age: 47, gender: "male", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "337", epic: "SNE0381160", name: "जमना लाल", guardian: "तुलसी राम", relation: "father", house: "144", age: 44, gender: "male", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "338", epic: "SNE0180042", name: "कैलाशी देवी", guardian: "रामलाल", relation: "husband", house: "144", age: 42, gender: "female", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "339", epic: "SNE0180034", name: "अनिता", guardian: "जमना लाल", relation: "husband", house: "144", age: 39, gender: "female", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "340", epic: "KDY1113968", name: "मोहनलाल", guardian: "केलाराम", relation: "father", house: "145", age: 56, gender: "male", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },

  // Page 15 (Serials 341 to 370)
  { serial: "341", epic: "KDY1349182", name: "मेताबी", guardian: "मोहनलाल", relation: "husband", house: "145", age: 54, gender: "female", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "342", epic: "SNE0601328", name: "सुवालाल", guardian: "सोहन लाल", relation: "father", house: "145", age: 35, gender: "male", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "343", epic: "SNE0601336", name: "नारायणी", guardian: "सुवालाल", relation: "husband", house: "145", age: 32, gender: "female", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "344", epic: "SNE0727768", name: "छगन", guardian: "करमा", relation: "father", house: "146", age: 33, gender: "male", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "345", epic: "SNE1127554", name: "धन्ना लाल", guardian: "करमा", relation: "father", house: "146", age: 28, gender: "male", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "346", epic: "SNE1684810", name: "संतु देवी", guardian: "बना लाल", relation: "husband", house: "146", age: 27, gender: "female", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "347", epic: "SNE1685478", name: "वीरम", guardian: "कर्मा", relation: "father", house: "146", age: 27, gender: "male", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "348", epic: "KDY1113992", name: "छोगालाल", guardian: "केलाराम", relation: "father", house: "147", age: 76, gender: "male", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "349", epic: "KDY0958124", name: "शंभूलाल", guardian: "छोगालाल", relation: "father", house: "147", age: 48, gender: "male", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "350", epic: "KDY0958132", name: "अणछी", guardian: "शम्भू लाल", relation: "husband", house: "147", age: 44, gender: "female", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "351", epic: "KDY0958140", name: "शंकर", guardian: "छोगा", relation: "father", house: "147", age: 42, gender: "male", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "352", epic: "SNE0727776", name: "नन्दुदेवी", guardian: "शंकर", relation: "husband", house: "147", age: 32, gender: "female", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "353", epic: "SNE1014075", name: "रामलाल", guardian: "शम्भू लाल", relation: "father", house: "147", age: 27, gender: "male", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "354", epic: "SNE1014034", name: "हीरू देवी", guardian: "राम लाल", relation: "husband", house: "147", age: 27, gender: "female", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "355", epic: "SNE1528611", name: "नारायण लाल", guardian: "शंभू लाल", relation: "father", house: "147", age: 24, gender: "male", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "356", epic: "SNE1836303", name: "प्रेमी देवी", guardian: "नारायण लाल", relation: "husband", house: "147", age: 19, gender: "female", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "357", epic: "KDY1114016", name: "वरदा", guardian: "केलाराम", relation: "father", house: "148", age: 69, gender: "male", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "358", epic: "KDY1114024", name: "खेमी", guardian: "वरदीचन्द", relation: "husband", house: "148", age: 68, gender: "female", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "359", epic: "SNE0907295", name: "मुकेश", guardian: "वरदा", relation: "father", house: "148", age: 30, gender: "male", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "360", epic: "SNE0907303", name: "लाली देवी", guardian: "मुकेश", relation: "husband", house: "148", age: 30, gender: "female", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "361", epic: "KDY1114032", name: "गोपीलाल", guardian: "मालाराम", relation: "father", house: "149", age: 76, gender: "male", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "362", epic: "KDY0958165", name: "भेरू लाल", guardian: "गोपी", relation: "father", house: "149", age: 44, gender: "male", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "363", epic: "KDY0958173", name: "सन्तोक", guardian: "भेरू लाल", relation: "husband", house: "149", age: 42, gender: "female", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "364", epic: "SNE1127562", name: "प्रेमी देवी", guardian: "भेरू लाल", relation: "husband", house: "149", age: 30, gender: "female", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "365", epic: "KDY0958207", name: "केला", guardian: "गोकल", relation: "father", house: "150", age: 56, gender: "male", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "366", epic: "KDY0958215", name: "कंकुरी", guardian: "केला", relation: "husband", house: "150", age: 56, gender: "female", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "367", epic: "SNE1014026", name: "दिनेश", guardian: "केलाराम", relation: "father", house: "150", age: 29, gender: "male", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "368", epic: "SNE1014042", name: "मंजु देवी", guardian: "दिनेश", relation: "husband", house: "150", age: 29, gender: "female", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "369", epic: "SNE1528603", name: "मुकेश चंद", guardian: "केलाराम", relation: "father", house: "150", age: 25, gender: "male", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "370", epic: "SNE1853001", name: "संगीता", guardian: "केला राम", relation: "husband", house: "150", age: 22, gender: "female", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },

  // Page 16 (Serials 371 to 388)
  { serial: "371", epic: "SNE1748367", name: "लक्ष्मण लाल", guardian: "केला राम", relation: "father", house: "150", age: 20, gender: "male", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "372", epic: "SNE1896042", name: "गणी", guardian: "केला", relation: "husband", house: "150", age: 19, gender: "female", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "373", epic: "RJ/20/152/000138", name: "जेराम", guardian: "नन्दलाल", relation: "father", house: "151", age: 74, gender: "male", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "374", epic: "RJ/20/152/000163", name: "सोनी", guardian: "जयराम", relation: "husband", house: "151", age: 64, gender: "female", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "375", epic: "SNE0682815", name: "रोशनलाल", guardian: "जयराम", relation: "father", house: "151", age: 33, gender: "male", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "376", epic: "SNE0727784", name: "मेमा", guardian: "रोशनलाल", relation: "husband", house: "151", age: 31, gender: "female", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "377", epic: "SNE0907311", name: "श्रवण", guardian: "जयराम", relation: "father", house: "151", age: 29, gender: "male", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "378", epic: "SNE1738897", name: "चांदी देवी", guardian: "कन्हैया लाल", relation: "husband", house: "151", age: 27, gender: "female", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "379", epic: "SNE1376581", name: "रामकन्या", guardian: "श्रवण लाल", relation: "husband", house: "151", age: 26, gender: "female", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "380", epic: "SNE1376573", name: "कन्हैया लाल", guardian: "जेराम", relation: "father", house: "151", age: 25, gender: "male", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "381", epic: "KDY0958223", name: "शम्भुलाल", guardian: "देवकिशन", relation: "father", house: "152", age: 66, gender: "male", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "382", epic: "KDY0958231", name: "नोसी", guardian: "शम्भूलाल", relation: "husband", house: "152", age: 63, gender: "female", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "383", epic: "SNE0544486", name: "चन्दा देवी", guardian: "रोशन लाल", relation: "husband", house: "152", age: 42, gender: "female", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "384", epic: "KDY0958249", name: "रोशन", guardian: "शम्भू लाल", relation: "father", house: "152", age: 42, gender: "male", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "385", epic: "SNE0460170", name: "मुकेश", guardian: "शम्भू लाल", relation: "father", house: "152", age: 39, gender: "male", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "386", epic: "SNE0265157", name: "सीमा देवी", guardian: "मुकेश कुमार", relation: "husband", house: "152", age: 37, gender: "female", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "387", epic: "SNE1307115", name: "मीना देवी", guardian: "दिनेश", relation: "husband", house: "316", age: 31, gender: "female", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },
  { serial: "388", epic: "SNE1576719", name: "संजु कुमारी", guardian: "विक्रम नाथ कालबेलिया", relation: "father", house: "कोट", age: 23, gender: "female", sectionNumber: "4", sectionName: "4-माताजी मगरी,भीटा" },

  // Page 17 (Serials 389 to 392) - Section 5: 5-बागरिया,भीटा
  { serial: "389", epic: "RJ/20/152/001372", name: "भंवरलाल", guardian: "चम्पालाल", relation: "father", house: "153", age: 59, gender: "male", sectionNumber: "5", sectionName: "5-बागरिया,भीटा" },
  { serial: "390", epic: "RJ/20/152/001374", name: "देउबाई", guardian: "भंवरलाल", relation: "husband", house: "153", age: 57, gender: "female", sectionNumber: "5", sectionName: "5-बागरिया,भीटा" },
  { serial: "391", epic: "SNE0460188", name: "मुकेश", guardian: "भंवरलाल", relation: "father", house: "153", age: 36, gender: "male", sectionNumber: "5", sectionName: "5-बागरिया,भीटा" },
  { serial: "392", epic: "SNE0682823", name: "मीना", guardian: "मुकेश", relation: "husband", house: "153", age: 36, gender: "female", sectionNumber: "5", sectionName: "5-बागरिया,भीटा" }
];

const outputPayload = {
  metadata: {
    title: "निर्वाचक नामावली 2026 S20 राजस्थान",
    assemblyNumber: "179",
    assemblyName: "सहाडा (सामान्य)",
    partNumber: "2",
    boothName: "भाग संख्या 2 - भीटा",
    pollingStation: "राजकीय उच्च माध्यमिक विद्यालय, कमरा न0 2, भीटा",
    auditPhase: "Pages 13 to 17 AI Vision Audit (Serials 281 to 392)",
    totalExtractedRecords: audited112Records.length,
    timestamp: new Date().toISOString()
  },
  records: audited112Records
};

try {
  fs.writeFileSync(outputPath, JSON.stringify(outputPayload, null, 2), 'utf8');
  console.log(`AI VISION AUDIT COMPLETE FOR PAGES 13 TO 17 (SERIALS 281 TO 392)!`);
  console.log(`Saved JSON at: ${outputPath}\n`);
  console.log(`Total Verified Records: 112 / 112`);
} catch (err) {
  console.error('Error writing file:', err.message);
}
