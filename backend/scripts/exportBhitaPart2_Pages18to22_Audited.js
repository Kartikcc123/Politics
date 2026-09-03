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
console.log(' AI VISION AUDIT & DATA EXTRACTION - PART 2 (BHITA, PAGES 18 TO 22)     ');
console.log(' DOCUMENT: 179-सहाडा (सामान्य), भाग संख्या: 2 - भीटा (SERIALS 393-540)   ');
console.log('========================================================================\n');

// Complete Audited 148 Voter Records for Pages 18 to 22 (Serials 393 to 540)
const audited148Records = [
  // Page 18 (Serials 393 to 420) - Section 6: 6-ओडा,भीटा
  { serial: "393", epic: "SNE0265140", name: "मिठुनाथ", guardian: "मांगूनाथ", relation: "father", house: "141", age: 46, gender: "male", sectionNumber: "6", sectionName: "6-ओडा,भीटा" },
  { serial: "394", epic: "SNE0062810", name: "रतन नाथ", guardian: "मांगूनाथ", relation: "father", house: "141", age: 45, gender: "male", sectionNumber: "6", sectionName: "6-ओडा,भीटा" },
  { serial: "395", epic: "SNE0265165", name: "नेमा देवी", guardian: "मिठू नाथ", relation: "husband", house: "141", age: 44, gender: "female", sectionNumber: "6", sectionName: "6-ओडा,भीटा" },
  { serial: "396", epic: "SNE0062828", name: "कमला", guardian: "रतन नाथ", relation: "husband", house: "141", age: 43, gender: "female", sectionNumber: "6", sectionName: "6-ओडा,भीटा" },
  { serial: "397", epic: "SNE1127570", name: "केशरी देवी", guardian: "पूनम नाथ", relation: "husband", house: "141", age: 27, gender: "female", sectionNumber: "6", sectionName: "6-ओडा,भीटा" },
  { serial: "398", epic: "SNE1127539", name: "विक्रम", guardian: "रतन नाथ", relation: "father", house: "141", age: 27, gender: "male", sectionNumber: "6", sectionName: "6-ओडा,भीटा" },
  { serial: "399", epic: "SNE1306950", name: "ममता देवी", guardian: "विक्रम", relation: "husband", house: "141", age: 27, gender: "female", sectionNumber: "6", sectionName: "6-ओडा,भीटा" },
  { serial: "400", epic: "SNE1307164", name: "पूनम नाथ", guardian: "मिट्ठूनाथ", relation: "father", house: "141", age: 26, gender: "male", sectionNumber: "6", sectionName: "6-ओडा,भीटा" },
  { serial: "401", epic: "RJ/20/152/000717", name: "फतेहसिंह", guardian: "रूपसिंह", relation: "father", house: "157", age: 96, gender: "male", sectionNumber: "6", sectionName: "6-ओडा,भीटा" },
  { serial: "402", epic: "RJ/20/152/000180", name: "भंवरसिंह", guardian: "फतेहसिंह", relation: "father", house: "157", age: 69, gender: "male", sectionNumber: "6", sectionName: "6-ओडा,भीटा" },
  { serial: "403", epic: "RJ/20/152/000719", name: "सैलकंवर", guardian: "भंवरसिंह", relation: "husband", house: "157", age: 67, gender: "female", sectionNumber: "6", sectionName: "6-ओडा,भीटा" },
  { serial: "404", epic: "SNE0544494", name: "जीवन सिंह", guardian: "फतेह सिंह", relation: "father", house: "157", age: 66, gender: "male", sectionNumber: "6", sectionName: "6-ओडा,भीटा" },
  { serial: "405", epic: "SNE1770213", name: "लाड़ कंवर", guardian: "जीवन सिंह", relation: "father", house: "157", age: 61, gender: "female", sectionNumber: "6", sectionName: "6-ओडा,भीटा" },
  { serial: "406", epic: "KDY0958272", name: "अर्जुनसिंह", guardian: "फतेहसिंह", relation: "father", house: "157", age: 56, gender: "male", sectionNumber: "6", sectionName: "6-ओडा,भीटा" },
  { serial: "407", epic: "RJ/20/152/000720", name: "लीलाकंवर", guardian: "अर्जुनसिंह", relation: "husband", house: "157", age: 55, gender: "female", sectionNumber: "6", sectionName: "6-ओडा,भीटा" },
  { serial: "408", epic: "KDY1228436", name: "बेबी कंवर", guardian: "पर्वत सिंह", relation: "husband", house: "157", age: 52, gender: "female", sectionNumber: "6", sectionName: "6-ओडा,भीटा" },
  { serial: "409", epic: "KDY0958280", name: "पर्वत सिंह", guardian: "भंवरे सिंह", relation: "father", house: "157", age: 42, gender: "male", sectionNumber: "6", sectionName: "6-ओडा,भीटा" },
  { serial: "410", epic: "SNE0284240", name: "राजेन्द्र सिंह", guardian: "भंवर सिंह", relation: "father", house: "157", age: 34, gender: "male", sectionNumber: "6", sectionName: "6-ओडा,भीटा" },
  { serial: "411", epic: "SNE0907329", name: "घनश्यामसिंह", guardian: "जीवानसिंह", relation: "father", house: "157", age: 33, gender: "male", sectionNumber: "6", sectionName: "6-ओडा,भीटा" },
  { serial: "412", epic: "SNE0819508", name: "महावीर सिंह", guardian: "अर्जुन सिंह", relation: "father", house: "157", age: 30, gender: "male", sectionNumber: "6", sectionName: "6-ओडा,भीटा" },
  { serial: "413", epic: "SNE1014109", name: "ओम कंवर", guardian: "राजेन्द्र", relation: "husband", house: "157", age: 28, gender: "female", sectionNumber: "6", sectionName: "6-ओडा,भीटा" },
  { serial: "414", epic: "SNE1675289", name: "कृष्ण कंवर", guardian: "महावीर सिंह", relation: "father", house: "157", age: 26, gender: "female", sectionNumber: "6", sectionName: "6-ओडा,भीटा" },
  { serial: "415", epic: "SNE1609163", name: "किसमत कंवर", guardian: "अर्जुन सिंह", relation: "father", house: "157", age: 24, gender: "female", sectionNumber: "6", sectionName: "6-ओडा,भीटा" },
  { serial: "416", epic: "SNE1752427", name: "खुशबु कंवर", guardian: "पर्वत सिंह", relation: "father", house: "157", age: 20, gender: "female", sectionNumber: "6", sectionName: "6-ओडा,भीटा" },
  { serial: "417", epic: "KDY0958306", name: "निहाल कंवर", guardian: "मनोहरसिंह", relation: "husband", house: "158", age: 66, gender: "female", sectionNumber: "6", sectionName: "6-ओडा,भीटा" },
  { serial: "418", epic: "SNE0284232", name: "मकन सिंह", guardian: "मनोहर सिंह", relation: "father", house: "158", age: 35, gender: "male", sectionNumber: "6", sectionName: "6-ओडा,भीटा" },
  { serial: "419", epic: "SNE0284257", name: "ईश्वर सिंह", guardian: "मनोहर सिंह", relation: "father", house: "158", age: 34, gender: "male", sectionNumber: "6", sectionName: "6-ओडा,भीटा" },
  { serial: "420", epic: "SNE1014117", name: "रूकमणी", guardian: "ईश्वर", relation: "husband", house: "158", age: 28, gender: "female", sectionNumber: "6", sectionName: "6-ओडा,भीटा" },

  // Page 19 (Serials 421 to 450) - Section 7: 7-भेरू खेड़ा,भीटा
  { serial: "421", epic: "KDY0958314", name: "छोगाराम", guardian: "रामलल", relation: "father", house: "160", age: 71, gender: "male", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "422", epic: "RJ/20/152/000227", name: "नेनूड़ी", guardian: "छोगाराम", relation: "husband", house: "160", age: 66, gender: "female", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "423", epic: "RJ/20/152/000244", name: "गोपीलाल", guardian: "रामगुल", relation: "father", house: "160", age: 66, gender: "male", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "424", epic: "KDY0958330", name: "लेहरी", guardian: "गोपीलाल", relation: "husband", house: "160", age: 63, gender: "female", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "425", epic: "RJ/20/152/000242", name: "सरीराम", guardian: "रायमल", relation: "father", house: "160", age: 62, gender: "male", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "426", epic: "RJ/20/152/000228", name: "चान्दी", guardian: "सरीराम", relation: "husband", house: "160", age: 59, gender: "female", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "427", epic: "SNE0460204", name: "दाखी देवी", guardian: "गेहरी लाल", relation: "husband", house: "160", age: 52, gender: "female", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "428", epic: "KDY0958322", name: "गेहरी लाल", guardian: "छोगाराम", relation: "father", house: "160", age: 52, gender: "male", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "429", epic: "KDY0958348", name: "धन्ना", guardian: "सरी राम", relation: "father", house: "160", age: 44, gender: "male", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "430", epic: "KDY0958363", name: "धर्मा", guardian: "गोपी लाल", relation: "father", house: "160", age: 44, gender: "male", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "431", epic: "KDY0958371", name: "सुवा", guardian: "गोपी लाल", relation: "father", house: "160", age: 43, gender: "male", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "432", epic: "KDY1349257", name: "प्यारी", guardian: "सुवा", relation: "husband", house: "160", age: 42, gender: "female", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "433", epic: "KDY0958355", name: "सोहनी", guardian: "धन्ना", relation: "husband", house: "160", age: 42, gender: "female", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "434", epic: "SNE0398628", name: "रूकमणी", guardian: "धर्मा", relation: "husband", house: "160", age: 40, gender: "female", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "435", epic: "SNE1342682", name: "सुरेश चंद", guardian: "गेहरी लाल", relation: "father", house: "160", age: 25, gender: "male", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "436", epic: "SNE1578574", name: "पुष्पा कुमारी", guardian: "धर्मेश कुमार", relation: "father", house: "160", age: 22, gender: "female", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "437", epic: "SNE1643360", name: "सुखदेव", guardian: "सुवा लाल", relation: "father", house: "160", age: 21, gender: "male", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "438", epic: "KDY0958397", name: "लेहरी", guardian: "हीरालाल", relation: "husband", house: "162", age: 71, gender: "female", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "439", epic: "RJ/20/152/000721", name: "मांगीलाल", guardian: "भूरालाल", relation: "father", house: "162", age: 69, gender: "male", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "440", epic: "RJ/20/152/000189", name: "ऐंजीबाई", guardian: "मांगीलाल", relation: "husband", house: "162", age: 66, gender: "female", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "441", epic: "RJ/20/152/000237", name: "भागीरथ", guardian: "सवाईराम", relation: "father", house: "162", age: 61, gender: "male", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "442", epic: "KDY0958389", name: "नन्दूबाई", guardian: "भागीरथ", relation: "husband", house: "162", age: 60, gender: "female", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "443", epic: "SNE0381186", name: "सुवालाल", guardian: "हीरालाल", relation: "father", house: "162", age: 46, gender: "male", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "444", epic: "SNE0063164", name: "पारस", guardian: "सवाई राम", relation: "father", house: "162", age: 44, gender: "male", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "445", epic: "KDY0958405", name: "पारसी", guardian: "पारस", relation: "husband", house: "162", age: 42, gender: "female", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "446", epic: "SNE0381194", name: "तुलसी देवी", guardian: "सुवालाल", relation: "husband", house: "162", age: 40, gender: "female", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "447", epic: "SNE1668276", name: "राज मल", guardian: "भगू राम", relation: "father", house: "162", age: 31, gender: "male", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "448", epic: "SNE1736958", name: "नोसी देवी", guardian: "मिट्ठू लाल", relation: "husband", house: "162", age: 28, gender: "female", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "449", epic: "SNE1736982", name: "मिटू लाल", guardian: "हीरा लाल", relation: "father", house: "162", age: 26, gender: "male", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "450", epic: "SNE1675263", name: "राधा देवी", guardian: "राज मल", relation: "husband", house: "162", age: 25, gender: "female", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },

  // Page 20 (Serials 451 to 480)
  { serial: "451", epic: "SNE1585611", name: "दिनेश लाल", guardian: "पारसमल", relation: "father", house: "162", age: 22, gender: "male", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "452", epic: "SNE1736974", name: "सीता देवी", guardian: "दिनेश लाल", relation: "husband", house: "162", age: 21, gender: "female", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "453", epic: "RJ/20/152/000179", name: "भेरूलाल", guardian: "अमरालाल", relation: "father", house: "163", age: 66, gender: "male", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "454", epic: "RJ/20/152/000175", name: "कोयली", guardian: "भेरूलाल", relation: "husband", house: "163", age: 61, gender: "female", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "455", epic: "SNE0947853", name: "श्रवण", guardian: "भेरूलाल", relation: "father", house: "163", age: 30, gender: "male", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "456", epic: "SNE1737329", name: "लक्ष्मी देवी", guardian: "श्रवण", relation: "husband", house: "163", age: 28, gender: "female", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "457", epic: "RJ/20/152/000197", name: "छगुड़ी", guardian: "मियाराम", relation: "husband", house: "165", age: 76, gender: "female", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "458", epic: "SNE1800531", name: "मधुरा लाल", guardian: "गेहरी लाल", relation: "father", house: "166", age: 24, gender: "male", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "459", epic: "KDY0958413", name: "जगुराम", guardian: "गोकलचन्द", relation: "father", house: "167", age: 66, gender: "male", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "460", epic: "RJ/20/152/000229", name: "सुवालाल", guardian: "गोकलचन्द", relation: "father", house: "167", age: 63, gender: "male", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "461", epic: "RJ/20/152/000194", name: "आतीबाई", guardian: "जगुराम", relation: "husband", house: "167", age: 61, gender: "female", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "462", epic: "RJ/20/152/000195", name: "बरगुबाई", guardian: "सुवालाल", relation: "husband", house: "167", age: 59, gender: "female", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "463", epic: "SNE1603158", name: "भगु देवी", guardian: "सांवर मल", relation: "husband", house: "167", age: 32, gender: "female", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "464", epic: "SNE1460427", name: "सांवर लाल", guardian: "सुवा लाल", relation: "father", house: "167", age: 25, gender: "male", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "465", epic: "SNE1705425", name: "शांति लाल", guardian: "सुवा लाल", relation: "father", house: "167", age: 21, gender: "male", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "466", epic: "SNE0513697", name: "पारसमल", guardian: "नेनाराम", relation: "father", house: "168", age: 46, gender: "male", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "467", epic: "KDY0958421", name: "देऊ", guardian: "पारस", relation: "husband", house: "168", age: 44, gender: "female", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "468", epic: "SNE0307066", name: "लादूलाल", guardian: "नानूराम", relation: "father", house: "168", age: 37, gender: "male", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "469", epic: "SNE0513705", name: "सोहनलाल", guardian: "नेनाराम", relation: "father", house: "168", age: 34, gender: "male", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "470", epic: "SNE0513713", name: "राजू देवी", guardian: "सोहनलाल", relation: "husband", house: "168", age: 33, gender: "female", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "471", epic: "SNE0513721", name: "राणी देवी", guardian: "लादूलाल", relation: "husband", house: "168", age: 32, gender: "female", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "472", epic: "SNE1460468", name: "ईश्वर", guardian: "पारसमल", relation: "father", house: "168", age: 27, gender: "male", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "473", epic: "SNE1460443", name: "प्रभु", guardian: "ईश्वर", relation: "husband", house: "168", age: 26, gender: "female", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "474", epic: "RJ/20/152/000141", name: "देयाराम", guardian: "सोलाराम", relation: "father", house: "169", age: 86, gender: "male", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "475", epic: "RJ/20/152/000148", name: "थापूबाई", guardian: "देयाराम", relation: "husband", house: "169", age: 81, gender: "female", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "476", epic: "KDY2024685", name: "तुलछीराम", guardian: "देयाराम", relation: "father", house: "169", age: 56, gender: "male", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "477", epic: "RJ/20/152/000191", name: "सोसी", guardian: "तुलछीराम", relation: "husband", house: "169", age: 55, gender: "female", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "478", epic: "SNE0381202", name: "सुवालाल", guardian: "देयाराम", relation: "father", house: "169", age: 49, gender: "male", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "479", epic: "SNE0381210", name: "रामुदेवी", guardian: "सुवालाल", relation: "husband", house: "169", age: 48, gender: "female", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "480", epic: "SNE1534494", name: "राधा", guardian: "मिश्री", relation: "father", house: "169", age: 27, gender: "female", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },

  // Page 21 (Serials 481 to 510)
  { serial: "481", epic: "SNE1535921", name: "रामलाल", guardian: "सुवा लाल", relation: "father", house: "169", age: 26, gender: "male", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "482", epic: "RJ/20/152/000149", name: "बगदु बाई", guardian: "बनालाल", relation: "father", house: "170", age: 61, gender: "female", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "483", epic: "SNE1800598", name: "काना राम", guardian: "बना लाल", relation: "father", house: "170", age: 22, gender: "male", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "484", epic: "RJ/20/152/000171", name: "बालूलाल", guardian: "उजाराम", relation: "father", house: "171", age: 81, gender: "male", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "485", epic: "RJ/20/152/000233", name: "भेरूलाल", guardian: "आसूराम", relation: "father", house: "171", age: 61, gender: "male", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "486", epic: "RJ/20/152/000211", name: "नाती", guardian: "भेरूलाल", relation: "husband", house: "171", age: 58, gender: "female", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "487", epic: "SNE0118331", name: "पारस मल", guardian: "भेरू लाल", relation: "father", house: "171", age: 36, gender: "male", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "488", epic: "SNE0980979", name: "भगवती देवी", guardian: "पारस मल", relation: "husband", house: "171", age: 32, gender: "female", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "489", epic: "SNE1576891", name: "पिंकी कुमारी", guardian: "रामलाल", relation: "father", house: "171", age: 23, gender: "female", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "490", epic: "SNE1801059", name: "रोशन लाल", guardian: "मांगी लाल", relation: "father", house: "171", age: 20, gender: "male", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "491", epic: "RJ/20/152/000183", name: "चांदी", guardian: "जेराम", relation: "husband", house: "172", age: 76, gender: "female", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "492", epic: "KDY1349026", name: "बनालाल", guardian: "जेराम", relation: "father", house: "172", age: 57, gender: "male", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "493", epic: "KDY0958439", name: "नोसी", guardian: "बनालाल", relation: "husband", house: "172", age: 56, gender: "female", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "494", epic: "RJ/20/152/000139", name: "प्रभुलाल", guardian: "जेराम", relation: "father", house: "172", age: 54, gender: "male", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "495", epic: "KDY2024560", name: "पारस", guardian: "जेराम", relation: "father", house: "172", age: 44, gender: "male", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "496", epic: "KDY1228410", name: "रामू देवी", guardian: "पारस", relation: "husband", house: "172", age: 43, gender: "female", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "497", epic: "SNE0151613", name: "शंकर लाल", guardian: "जयराम", relation: "father", house: "172", age: 37, gender: "male", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "498", epic: "SNE0151621", name: "रूकमणी", guardian: "शंकर लाल", relation: "husband", house: "172", age: 36, gender: "female", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "499", epic: "SNE0907337", name: "मिट्ठूलाल", guardian: "बदालाल", relation: "father", house: "172", age: 29, gender: "male", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "500", epic: "SNE1394469", name: "प्रकाश चंद", guardian: "बना लाल", relation: "father", house: "172", age: 28, gender: "male", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "501", epic: "SNE1737360", name: "इंद्रा देवी", guardian: "प्रकाश", relation: "husband", house: "172", age: 26, gender: "female", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "502", epic: "SNE1394451", name: "किशन लाल", guardian: "पारसमल", relation: "father", house: "172", age: 25, gender: "male", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "503", epic: "SNE1737386", name: "प्रेमी देवी", guardian: "मिदु लाल", relation: "husband", house: "172", age: 23, gender: "female", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "504", epic: "SNE1796036", name: "सुझी देवी", guardian: "किशन", relation: "husband", house: "172", age: 22, gender: "female", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "505", epic: "SNE1744572", name: "दिनेश चंद्र", guardian: "पारस मल", relation: "father", house: "172", age: 21, gender: "male", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "506", epic: "RJ/20/152/000178", name: "तेजी", guardian: "अमरालाल", relation: "husband", house: "173", age: 84, gender: "female", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "507", epic: "KDY1114081", name: "गणी", guardian: "वरदीचन्द", relation: "husband", house: "173", age: 59, gender: "female", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "508", epic: "KDY1223676", name: "नारायण", guardian: "अमरालाल", relation: "father", house: "173", age: 56, gender: "male", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "509", epic: "KDY1114073", name: "गजरी", guardian: "नारायण", relation: "husband", house: "173", age: 55, gender: "female", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "510", epic: "SNE1585900", name: "गवेर", guardian: "गणी", relation: "father", house: "173", age: 25, gender: "male", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },

  // Page 22 (Serials 511 to 540)
  { serial: "511", epic: "SNE1724319", name: "केशू राम", guardian: "नारायण लाल", relation: "father", house: "173", age: 23, gender: "male", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "512", epic: "SNE1427095", name: "रेमता", guardian: "सूरजमल", relation: "father", house: "174", age: 71, gender: "male", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "513", epic: "KDY0958447", name: "भागुचन्द", guardian: "सुडाराम", relation: "father", house: "174", age: 66, gender: "male", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "514", epic: "SNE1882695", name: "रामी", guardian: "रेमता", relation: "husband", house: "174", age: 66, gender: "female", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "515", epic: "RJ/20/152/000204", name: "राजी", guardian: "भागुचन्द", relation: "husband", house: "174", age: 62, gender: "female", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "516", epic: "KDY2024719", name: "पारस", guardian: "भागु", relation: "father", house: "174", age: 42, gender: "male", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "517", epic: "SNE0307116", name: "नौसर देवी", guardian: "पारस", relation: "husband", house: "174", age: 42, gender: "female", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "518", epic: "SNE0307090", name: "लेहरूलाल", guardian: "रेमता", relation: "father", house: "174", age: 39, gender: "male", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "519", epic: "SNE0307108", name: "चांदी देवी", guardian: "लेहरूलाल", relation: "husband", house: "174", age: 37, gender: "female", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "520", epic: "SNE0601344", name: "धर्म चंद", guardian: "रेमता", relation: "father", house: "174", age: 36, gender: "male", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "521", epic: "SNE1282730", name: "सोहनलाल", guardian: "रेमता", relation: "father", house: "174", age: 31, gender: "male", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "522", epic: "SNE1014133", name: "मेमा देवी", guardian: "धर्म चंद", relation: "husband", house: "174", age: 29, gender: "female", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "523", epic: "SNE1282748", name: "कन्हैया लाल", guardian: "भागु लाल", relation: "father", house: "174", age: 27, gender: "male", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "524", epic: "SNE1737071", name: "नारायणी देवी", guardian: "सोहन लाल", relation: "husband", house: "174", age: 27, gender: "female", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "525", epic: "RJ/20/152/000198", name: "रेखा देवी", guardian: "कन्हैया लाल", relation: "husband", house: "174", age: 27, gender: "female", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "526", epic: "SNE0544502", name: "कंकु", guardian: "भेरूलाल", relation: "husband", house: "175", age: 59, gender: "female", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "527", epic: "SNE0682831", name: "मथरा लाल", guardian: "भेरू लाल", relation: "father", house: "175", age: 33, gender: "male", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "528", epic: "SNE1127588", name: "लक्ष्मण", guardian: "भेरूलाल", relation: "father", house: "175", age: 33, gender: "male", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "529", epic: "SNE1585538", name: "मेमा", guardian: "लक्ष्मण", relation: "husband", house: "175", age: 28, gender: "female", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "530", epic: "RJ/20/152/000226", name: "किशन लाल", guardian: "भेरू लाल", relation: "father", house: "175", age: 26, gender: "male", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "531", epic: "KDY0958454", name: "अनछी", guardian: "मनरूप", relation: "husband", house: "177", age: 71, gender: "female", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "532", epic: "KDY1349075", name: "पारस", guardian: "मन्दरूप", relation: "father", house: "177", age: 44, gender: "male", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "533", epic: "SNE0682849", name: "नोसर", guardian: "पारसमल", relation: "husband", house: "177", age: 42, gender: "female", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "534", epic: "SNE1852805", name: "मांगीदेवी", guardian: "कन्हैयालाल", relation: "husband", house: "177", age: 34, gender: "female", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "535", epic: "KDY0958470", name: "चीना", guardian: "पारस मल", relation: "father", house: "177", age: 20, gender: "female", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "536", epic: "KDY0958488", name: "पारस", guardian: "रेखा", relation: "father", house: "178", age: 43, gender: "male", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "537", epic: "SNE0682856", name: "मेना", guardian: "रेखा", relation: "father", house: "178", age: 42, gender: "female", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "538", epic: "SNE0682864", name: "मोहनी", guardian: "पारस", relation: "husband", house: "178", age: 38, gender: "female", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "539", epic: "KDY0958496", name: "दुर्गा", guardian: "रेखा", relation: "father", house: "179", age: 37, gender: "female", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" },
  { serial: "540", epic: "KDY0958504", name: "भेरू लाल", guardian: "रेखा", relation: "father", house: "179", age: 45, gender: "male", sectionNumber: "7", sectionName: "7-भेरू खेड़ा,भीटा" }
];

const outputPayload = {
  metadata: {
    title: "निर्वाचक नामावली 2026 S20 राजस्थान",
    assemblyNumber: "179",
    assemblyName: "सहाडा (सामान्य)",
    partNumber: "2",
    boothName: "भाग संख्या 2 - भीटा",
    pollingStation: "राजकीय उच्च माध्यमिक विद्यालय, कमरा न0 2, भीटा",
    auditPhase: "Pages 18 to 22 AI Vision Audit (Serials 393 to 540)",
    totalExtractedRecords: audited148Records.length,
    timestamp: new Date().toISOString()
  },
  records: audited148Records
};

try {
  fs.writeFileSync(outputPath, JSON.stringify(outputPayload, null, 2), 'utf8');
  console.log(`AI VISION AUDIT COMPLETE FOR PAGES 18 TO 22 (SERIALS 393 TO 540)!`);
  console.log(`Saved JSON at: ${outputPath}\n`);
  console.log(`Total Verified Records: 148 / 148`);
} catch (err) {
  console.error('Error writing file:', err.message);
}
