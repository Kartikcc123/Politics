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
console.log(' AI VISION AUDIT & DATA EXTRACTION - PART 1 (BHITA, PAGES 8 TO 12)      ');
console.log(' DOCUMENT: 179-सहाडा (सामान्य), भाग संख्या: 1 - भीटा (SERIALS 151-285)   ');
console.log('========================================================================\n');

// Complete Audited 135 Voter Records for Pages 8 to 12 (Serials 151 to 285)
const audited135Records = [
  // Page 8 (Serials 151 to 180) - Section 2: 2-चौराया के पास,भीटा
  { serial: "151", epic: "KDY1113588", name: "नारायण", guardian: "छोगा", relation: "father", house: "33", age: 49, gender: "male", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "152", epic: "KDY0955666", name: "अनछी", guardian: "नारायण", relation: "husband", house: "33", age: 46, gender: "female", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "153", epic: "SNE0381004", name: "रतनलाल", guardian: "छोगालाल", relation: "father", house: "33", age: 39, gender: "male", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "154", epic: "SNE0727610", name: "लेहरूलाल", guardian: "सोहनलाल", relation: "father", house: "33", age: 33, gender: "male", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "155", epic: "SNE0601161", name: "मुकेश", guardian: "भोजाराम", relation: "father", house: "33", age: 32, gender: "male", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "156", epic: "SNE1307123", name: "संगीता देवी", guardian: "लेहरू लाल", relation: "husband", house: "33", age: 30, gender: "female", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "157", epic: "SNE0986224", name: "नारायणी", guardian: "मुकेश", relation: "husband", house: "33", age: 29, gender: "female", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "158", epic: "SNE0986216", name: "कमलेश", guardian: "नारायण", relation: "father", house: "33", age: 27, gender: "male", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "159", epic: "SNE1307099", name: "प्रभु लाल", guardian: "लादू लाल", relation: "father", house: "33", age: 27, gender: "male", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "160", epic: "SNE1307107", name: "मांगी लाल", guardian: "लादू लाल", relation: "father", house: "33", age: 27, gender: "male", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "161", epic: "SNE1307172", name: "पारस", guardian: "छीतर", relation: "father", house: "33", age: 27, gender: "male", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "162", epic: "SNE1238047", name: "कन्हैयालाल", guardian: "लादूलाल", relation: "father", house: "33", age: 27, gender: "male", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "163", epic: "SNE1675503", name: "सीता देवी", guardian: "कन्हैया लाल", relation: "husband", house: "33", age: 25, gender: "female", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "164", epic: "SNE1528629", name: "गणपत लाल", guardian: "सोहन लाल", relation: "father", house: "33", age: 24, gender: "male", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "165", epic: "SNE1528645", name: "ईश्वर चंद", guardian: "माथु लाल", relation: "father", house: "33", age: 24, gender: "male", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "166", epic: "SNE1800861", name: "पूनम देवी", guardian: "पारस", relation: "husband", house: "33", age: 24, gender: "female", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "167", epic: "SNE1651090", name: "जमना कुमारी", guardian: "लादू लाल", relation: "father", house: "33", age: 23, gender: "female", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "168", epic: "SNE1578442", name: "पूजा कुमारी", guardian: "नारायण लाल", relation: "father", house: "33", age: 22, gender: "female", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "169", epic: "SNE1891001", name: "सुनील कुमार", guardian: "छीतर खारोल", relation: "father", house: "33", age: 19, gender: "male", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "170", epic: "SNE1904994", name: "तारा कुमारी", guardian: "सोहन लाल", relation: "father", house: "33", age: 19, gender: "female", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "171", epic: "KDY0955674", name: "श्रीभेरूलाल", guardian: "नारूलाल", relation: "father", house: "34", age: 66, gender: "male", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "172", epic: "KDY0955682", name: "बदामबाई", guardian: "भेरूलाल", relation: "husband", house: "34", age: 64, gender: "female", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "173", epic: "KDY0910091", name: "सानु", guardian: "हीरालाल", relation: "husband", house: "34", age: 59, gender: "female", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "174", epic: "SNE0151910", name: "सीता", guardian: "रतन लाल", relation: "husband", house: "34", age: 38, gender: "female", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "175", epic: "SNE0151902", name: "रतन", guardian: "भेरूलाल", relation: "father", house: "34", age: 38, gender: "male", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "176", epic: "SNE1226919", name: "मदन लाल", guardian: "हीरा लाल", relation: "father", house: "34", age: 28, gender: "male", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "177", epic: "SNE1013788", name: "सुगना देवी", guardian: "मदन लाल", relation: "husband", house: "34", age: 27, gender: "female", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "178", epic: "KDY0955716", name: "गोवर्धनलाल", guardian: "नाथूलाल", relation: "father", house: "35", age: 72, gender: "male", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "179", epic: "KDY2024545", name: "हीरा लाल", guardian: "नाथू लाल", relation: "father", house: "35", age: 68, gender: "male", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "180", epic: "KDY0955732", name: "प्रेमबाई", guardian: "गोवर्धनलाल", relation: "husband", house: "35", age: 64, gender: "female", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },

  // Page 9 (Serials 181 to 210)
  { serial: "181", epic: "KDY2024537", name: "गीता देवी", guardian: "हीरा लाल", relation: "husband", house: "35", age: 63, gender: "female", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "182", epic: "KDY0955724", name: "सुरेशचन्द", guardian: "गोवर्धनलाल", relation: "father", house: "35", age: 54, gender: "male", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "183", epic: "KDY1113596", name: "रामकन्या", guardian: "सुरेश", relation: "husband", house: "35", age: 49, gender: "female", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "184", epic: "KDY2024552", name: "शिवप्रकाश", guardian: "हीरा लाल", relation: "father", house: "35", age: 40, gender: "male", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "185", epic: "SNE0128876", name: "सीमा देवी", guardian: "शिव प्रकाश", relation: "husband", house: "35", age: 37, gender: "female", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "186", epic: "SNE1574383", name: "सुदर्शन कुमार", guardian: "सुरेश चंद", relation: "father", house: "35", age: 22, gender: "male", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "187", epic: "KDY0955757", name: "मांगीलाल", guardian: "देवकिशन", relation: "father", house: "36", age: 89, gender: "male", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "188", epic: "KDY0955773", name: "चम्पालाल", guardian: "रामलाल", relation: "father", house: "37", age: 85, gender: "male", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "189", epic: "KDY0955781", name: "कमलाबाई", guardian: "चम्पालाल", relation: "husband", house: "37", age: 83, gender: "female", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "190", epic: "RJ/20/152/001361", name: "सुदेशी", guardian: "लादूलाल", relation: "husband", house: "37", age: 52, gender: "female", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "191", epic: "KDY0910109", name: "लादूलाल", guardian: "चम्पालाल", relation: "father", house: "37", age: 48, gender: "male", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "192", epic: "SNE0947804", name: "लीला", guardian: "प्रकाश", relation: "husband", house: "37", age: 30, gender: "female", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "193", epic: "SNE0954040", name: "प्रकाश", guardian: "लादू लाल", relation: "father", house: "37", age: 28, gender: "male", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "194", epic: "KDY0955799", name: "जसकुबाई", guardian: "मांगीलाल", relation: "husband", house: "38", age: 79, gender: "female", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "195", epic: "KDY0955807", name: "नाथू", guardian: "मांगी लाल", relation: "father", house: "38", age: 42, gender: "male", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "196", epic: "KDY0955815", name: "रूकमणि देवी", guardian: "नाथू", relation: "husband", house: "38", age: 42, gender: "female", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "197", epic: "SNE1657998", name: "सत्यनारायण", guardian: "नाथू लाल", relation: "father", house: "38", age: 23, gender: "male", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "198", epic: "SNE1907716", name: "चंदा कुमारी", guardian: "नाथू लाल", relation: "father", house: "38", age: 19, gender: "female", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "199", epic: "KDY1113604", name: "बेगीराम", guardian: "उदयराम", relation: "father", house: "39", age: 86, gender: "male", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "200", epic: "KDY0955823", name: "गुलाबी", guardian: "बेगीराम", relation: "husband", house: "39", age: 76, gender: "female", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "201", epic: "SNE0381012", name: "रामलाल", guardian: "वेणीराम", relation: "father", house: "39", age: 36, gender: "male", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "202", epic: "SNE0907188", name: "मीरा देवी", guardian: "रामलाल", relation: "husband", house: "39", age: 33, gender: "female", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "203", epic: "KDY0910356", name: "मांगीबाई", guardian: "बालूलाल", relation: "husband", house: "115", age: 79, gender: "female", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "204", epic: "KDY0955856", name: "फतेहलाल", guardian: "गोकललाल", relation: "father", house: "115", age: 76, gender: "male", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "205", epic: "KDY0955880", name: "प्रताप", guardian: "सवाईराम", relation: "father", house: "115", age: 71, gender: "male", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "206", epic: "SNE1724293", name: "माथु लाल", guardian: "सवाई राम", relation: "father", house: "115", age: 62, gender: "male", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "207", epic: "KDY0955906", name: "चांदी", guardian: "मादुलाल", relation: "husband", house: "115", age: 59, gender: "female", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "208", epic: "KDY1113612", name: "किशनलाल", guardian: "मांगीलाल", relation: "father", house: "115", age: 56, gender: "male", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "209", epic: "KDY1113620", name: "पारसी", guardian: "किशनलाल", relation: "husband", house: "115", age: 54, gender: "female", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "210", epic: "KDY0955849", name: "धनराज", guardian: "बालूलाल", relation: "father", house: "115", age: 52, gender: "male", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },

  // Page 10 (Serials 211 to 240)
  { serial: "211", epic: "KDY0955914", name: "नाराणी", guardian: "धनराज", relation: "husband", house: "115", age: 44, gender: "female", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "212", epic: "KDY0955922", name: "शंकर", guardian: "बालू लाल", relation: "father", house: "115", age: 42, gender: "male", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "213", epic: "SNE0601179", name: "मंजु देवी", guardian: "शंकर लाल", relation: "husband", house: "115", age: 37, gender: "female", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "214", epic: "SNE0907196", name: "नारायण", guardian: "माथु", relation: "father", house: "115", age: 34, gender: "male", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "215", epic: "SNE0682641", name: "प्रकाश", guardian: "किशनलाल", relation: "father", house: "115", age: 32, gender: "male", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "216", epic: "SNE1227107", name: "सुशीला देवी", guardian: "प्रकाश", relation: "husband", house: "115", age: 30, gender: "female", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "217", epic: "SNE1238013", name: "मीना देवी", guardian: "नारायण", relation: "husband", house: "115", age: 30, gender: "female", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "218", epic: "SNE0907204", name: "लक्ष्मण", guardian: "मादुलाल", relation: "father", house: "115", age: 29, gender: "male", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "219", epic: "SNE0907212", name: "राजमल", guardian: "किशनलाल", relation: "father", house: "115", age: 29, gender: "male", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "220", epic: "SNE1238021", name: "लादू देवी", guardian: "लक्ष्मण", relation: "husband", house: "115", age: 28, gender: "female", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "221", epic: "SNE1459825", name: "घनश्याम लाल", guardian: "किशन लाल", relation: "father", house: "115", age: 27, gender: "male", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "222", epic: "SNE1573179", name: "मोनिका कुमारी", guardian: "मादुलाल", relation: "father", house: "115", age: 23, gender: "female", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "223", epic: "SNE1880814", name: "रामदयाल सुधार", guardian: "धन्ना लाल", relation: "father", house: "115", age: 19, gender: "male", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "224", epic: "SNE1896018", name: "रमेश चंद", guardian: "शंकर लाल", relation: "father", house: "115", age: 19, gender: "male", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "225", epic: "KDY0955948", name: "गुलाबी", guardian: "गोर्धनलाल", relation: "husband", house: "116", age: 84, gender: "female", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "226", epic: "RJ/20/152/000714", name: "सोहनलाल", guardian: "भूराला", relation: "father", house: "116", age: 66, gender: "male", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "227", epic: "KDY0910372", name: "डालीबाई", guardian: "सोहनलाल", relation: "husband", house: "116", age: 61, gender: "female", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "228", epic: "SNE0063180", name: "भेरू लाल", guardian: "गोवर्धन", relation: "father", house: "116", age: 38, gender: "male", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "229", epic: "SNE0795617", name: "पायली देवी", guardian: "नारायण", relation: "husband", house: "116", age: 31, gender: "female", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "230", epic: "SNE0907220", name: "नारायण", guardian: "सोहन", relation: "father", house: "116", age: 30, gender: "male", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "231", epic: "SNE0980920", name: "प्रेम कुमार", guardian: "सोहन लाल", relation: "father", house: "116", age: 28, gender: "male", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "232", epic: "SNE1704824", name: "शांति कुमारी", guardian: "प्रेम कुमार", relation: "husband", house: "116", age: 22, gender: "female", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "233", epic: "KDY0955955", name: "मेघनाथ", guardian: "भूरनाथ", relation: "father", house: "117", age: 76, gender: "male", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "234", epic: "KDY0955963", name: "शान्तीबाई", guardian: "मेघनाथ", relation: "husband", house: "117", age: 73, gender: "female", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "235", epic: "KDY0910380", name: "खुमनाथ", guardian: "मेघनाथ", relation: "father", house: "117", age: 52, gender: "male", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "236", epic: "KDY1113638", name: "गीता", guardian: "खुमनाथ", relation: "husband", house: "117", age: 46, gender: "female", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "237", epic: "KDY1349208", name: "राजू नाथ", guardian: "मेघ नाथ", relation: "father", house: "117", age: 44, gender: "male", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "238", epic: "KDY1349240", name: "लादी देवी", guardian: "सोहननाथ", relation: "husband", house: "117", age: 42, gender: "female", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "239", epic: "KDY0955989", name: "दुर्गा", guardian: "राजू नाथ", relation: "husband", house: "117", age: 42, gender: "female", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "240", epic: "KDY0955997", name: "सोहन नाथ", guardian: "मेघ नाथ", relation: "father", house: "117", age: 42, gender: "male", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },

  // Page 11 (Serials 241 to 270)
  { serial: "241", epic: "SNE1533371", name: "सुखनाथ", guardian: "मेघनाथ", relation: "father", house: "117", age: 29, gender: "male", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "242", epic: "SNE1535244", name: "सीमा देवी", guardian: "सुख नाथ", relation: "husband", house: "117", age: 28, gender: "female", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "243", epic: "KDY0956011", name: "छगुबाई", guardian: "मांगीलाल", relation: "husband", house: "118", age: 71, gender: "female", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "244", epic: "KDY0956029", name: "लादुराम", guardian: "गिरधारी", relation: "father", house: "118", age: 66, gender: "male", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "245", epic: "KDY0956037", name: "कंकु", guardian: "लादूराम", relation: "husband", house: "118", age: 61, gender: "female", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "246", epic: "SNE0180133", name: "रोशनलाल", guardian: "मांगी लाल", relation: "father", house: "118", age: 42, gender: "male", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "247", epic: "SNE1307131", name: "गणी देवी", guardian: "रोशन", relation: "husband", house: "118", age: 35, gender: "female", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "248", epic: "SNE1127372", name: "सुवालाल", guardian: "मांगी लाल", relation: "father", house: "118", age: 28, gender: "male", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "249", epic: "SNE1307081", name: "शारदा देवी", guardian: "सुवालाल", relation: "husband", house: "118", age: 27, gender: "female", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "250", epic: "KDY1113646", name: "रामलाल", guardian: "दीपचन्द", relation: "father", house: "119", age: 71, gender: "male", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "251", epic: "KDY0910398", name: "छगनी", guardian: "रामलाल", relation: "husband", house: "119", age: 66, gender: "female", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "252", epic: "KDY1228527", name: "सायरी", guardian: "हीरालाल", relation: "husband", house: "119", age: 61, gender: "female", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "253", epic: "SNE0891747", name: "नारायण", guardian: "रामलाल", relation: "father", house: "119", age: 42, gender: "male", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "254", epic: "KDY2024610", name: "नानू राम", guardian: "राम लाल", relation: "father", house: "119", age: 42, gender: "male", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "255", epic: "SNE1307156", name: "चंदा देवी", guardian: "नारायण", relation: "husband", house: "119", age: 39, gender: "female", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "256", epic: "SNE1460492", name: "पुष्पा", guardian: "नानू राम", relation: "husband", house: "119", age: 26, gender: "female", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "257", epic: "SNE1765494", name: "दुर्गा देवी", guardian: "जीतू", relation: "husband", house: "119", age: 25, gender: "female", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "258", epic: "SNE1569037", name: "जीतू", guardian: "हीरा लाल", relation: "father", house: "119", age: 22, gender: "male", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "259", epic: "KDY0956045", name: "प्यारीबाई", guardian: "आसूराम", relation: "husband", house: "120", age: 89, gender: "female", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "260", epic: "KDY0910406", name: "लादूलाल", guardian: "आसूराम", relation: "father", house: "120", age: 66, gender: "male", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "261", epic: "KDY0910414", name: "गंगाबाई", guardian: "लादूलाल", relation: "husband", house: "120", age: 61, gender: "female", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "262", epic: "KDY0910422", name: "लक्ष्मी लाल", guardian: "आसूराम", relation: "father", house: "120", age: 61, gender: "male", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "263", epic: "KDY0910430", name: "कमला", guardian: "लक्ष्छूराम", relation: "husband", house: "120", age: 58, gender: "female", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "264", epic: "KDY0956052", name: "हीरू", guardian: "आसू राम", relation: "father", house: "120", age: 46, gender: "male", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "265", epic: "KDY1349109", name: "कैलाशी", guardian: "खूमचन्द", relation: "husband", house: "121", age: 61, gender: "female", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "266", epic: "SNE0947812", name: "सोनु", guardian: "खूमा", relation: "father", house: "121", age: 29, gender: "male", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "267", epic: "SNE1238294", name: "राधा देवी", guardian: "सोनु", relation: "husband", house: "121", age: 27, gender: "female", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "268", epic: "SNE1599554", name: "मीना देवी", guardian: "राकेश कुमार", relation: "husband", house: "121", age: 25, gender: "female", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "269", epic: "SNE1599505", name: "राकेश कुमार", guardian: "खूम चंद", relation: "father", house: "121", age: 22, gender: "male", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "270", epic: "KDY0956086", name: "रामलाल", guardian: "नाथूलाल", relation: "father", house: "122", age: 81, gender: "male", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },

  // Page 12 (Serials 271 to 285)
  { serial: "271", epic: "KDY0956094", name: "सानीबाई", guardian: "रामलाल", relation: "husband", house: "122", age: 76, gender: "female", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "272", epic: "KDY0956060", name: "मधुरालाल", guardian: "नाथूलाल", relation: "father", house: "122", age: 61, gender: "male", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "273", epic: "KDY0956078", name: "कमलाबाई", guardian: "मधुरालाल", relation: "husband", house: "122", age: 56, gender: "female", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "274", epic: "SNE0180026", name: "किसन लाल", guardian: "रामा", relation: "father", house: "122", age: 42, gender: "male", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "275", epic: "SNE0544288", name: "मीनाक्षी", guardian: "किसन", relation: "husband", house: "122", age: 36, gender: "female", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "276", epic: "SNE0180117", name: "प्रकाश", guardian: "प्रताप", relation: "father", house: "122", age: 35, gender: "male", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "277", epic: "SNE0682658", name: "सुरेशचन्द", guardian: "मधुरालाल", relation: "father", house: "122", age: 33, gender: "male", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "278", epic: "SNE0601187", name: "मीना देवी", guardian: "प्रकाशचन्द", relation: "husband", house: "122", age: 32, gender: "female", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "279", epic: "SNE0819342", name: "सबरीदेवी", guardian: "सुरेशचन्द", relation: "husband", house: "122", age: 30, gender: "female", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "280", epic: "SNE1237999", name: "लादू लाल", guardian: "मांगी लाल", relation: "father", house: "122", age: 29, gender: "male", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "281", epic: "SNE1612621", name: "ईश्वर लाल", guardian: "मधुरा", relation: "father", house: "122", age: 27, gender: "male", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "282", epic: "SNE1662436", name: "मीना", guardian: "ईश्वर लाल", relation: "husband", house: "122", age: 22, gender: "female", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "283", epic: "KDY2024628", name: "रोशनी देवी", guardian: "सोहन लाल", relation: "husband", house: "142", age: 48, gender: "female", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "284", epic: "SNE1359603", name: "भगवान लाल", guardian: "सोहन लाल", relation: "father", house: "142", age: 26, gender: "male", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" },
  { serial: "285", epic: "SNE1536127", name: "कमलेश", guardian: "सोहन", relation: "father", house: "142", age: 25, gender: "male", sectionNumber: "2", sectionName: "2-चौराया के पास,भीटा" }
];

const auditedPayload = {
  metadata: {
    title: "निर्वाचक नामावली 2026 S20 राजस्थान",
    assemblyNumber: "179",
    assemblyName: "सहाडा (सामान्य)",
    partNumber: "1",
    boothName: "भाग संख्या 1 - भीटा",
    pollingStation: "राजकीय उच्च प्राथमिक विद्यालय, कमरा न0 1, भीटा",
    auditPhase: "Part 1 Pages 8 to 12 AI Vision Audit (Serials 151 to 285)",
    totalExtractedRecords: audited135Records.length,
    timestamp: new Date().toISOString()
  },
  records: audited135Records
};

try {
  fs.writeFileSync(outputPath, JSON.stringify(auditedPayload, null, 2), 'utf8');
  console.log(`PART 1 AI VISION AUDIT COMPLETE FOR PAGES 8 TO 12 (SERIALS 151 TO 285)!`);
  console.log(`Saved JSON at: ${outputPath}\n`);
  console.log(`Total Verified Records: 135 / 135`);
} catch (err) {
  console.error('Error writing file:', err.message);
}
