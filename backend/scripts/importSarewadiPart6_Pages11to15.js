require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../src/config/db');
const Ward = require('../src/models/Ward');
const Booth = require('../src/models/Booth');
const Member = require('../src/models/Member');

// Voter Pages 11 to 15 (Document Pages 13 to 17, Serials 279 to 399)
// Section 2: 2-निचला बाड़ीया,सरेवड़ी (Serials 279 to 309) [Ends on Page 14 with 1 card]
// Section 3: 3-सुधार मोहल्ला,जोरावरपुरा (Serials 310 to 399) [Starts on Page 15]
// Total Cards: 121 | DELETED: 0 | ACTIVE: 121
const sarewadiPart6Pages11to15Voters = [
  // Page 13 (Serials 279 to 308) - Section 2
  { serial: "279", epic: "RJ/20/152/007062", name: "गोमी", guardian: "जोधा", relation: "husband", house: "177", age: 101, gender: "female", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "280", epic: "RJ/20/152/007061", name: "मांगीलाल", guardian: "सरीराम", relation: "father", house: "177", age: 66, gender: "male", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "281", epic: "RJ/20/152/006548", name: "सूरजमल", guardian: "मांगीलाल", relation: "father", house: "177", age: 54, gender: "male", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "282", epic: "KDY1115427", name: "शान्ति", guardian: "सूरजमल", relation: "husband", house: "177", age: 52, gender: "female", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "283", epic: "KDY1250794", name: "भगवान लाल", guardian: "मांगी लाल", relation: "father", house: "177", age: 49, gender: "male", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "284", epic: "KDY1250802", name: "सरजु", guardian: "भगवान लाल", relation: "husband", house: "177", age: 46, gender: "female", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "285", epic: "KDY1223593", name: "शंकर", guardian: "मांगी लाल", relation: "father", house: "177", age: 44, gender: "male", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "286", epic: "KDY1223791", name: "सोहनी", guardian: "शंकर", relation: "husband", house: "177", age: 42, gender: "female", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "287", epic: "SNE0954388", name: "मदन लाल", guardian: "सूरजमल", relation: "father", house: "177", age: 29, gender: "male", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "288", epic: "SNE1240795", name: "गोविंद", guardian: "सूरज मल", relation: "father", house: "177", age: 26, gender: "male", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "289", epic: "SNE1347806", name: "संतु देवी", guardian: "गोविंद", relation: "husband", house: "177", age: 26, gender: "female", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "290", epic: "SNE1347822", name: "चंदा", guardian: "सूरज मल", relation: "husband", house: "177", age: 26, gender: "female", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "291", epic: "SNE1615988", name: "रमेश कुमार", guardian: "भगवान लाल", relation: "mother", house: "177", age: 25, gender: "male", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "292", epic: "SNE1702778", name: "लीला देवी", guardian: "रमेश कुमार", relation: "husband", house: "177", age: 24, gender: "female", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "293", epic: "SNE1616077", name: "कमली", guardian: "शंकर", relation: "father", house: "177", age: 23, gender: "female", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "294", epic: "SNE1765957", name: "रोशन सालवी", guardian: "सूरज मल", relation: "father", house: "177", age: 20, gender: "male", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "295", epic: "SNE1851013", name: "दिनेश सालवी", guardian: "शंकर लाल", relation: "father", house: "177", age: 19, gender: "male", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "296", epic: "RJ/20/152/006465", name: "गीता", guardian: "नारू", relation: "husband", house: "178", age: 58, gender: "female", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "297", epic: "SNE1440395", name: "सुरेश", guardian: "छोगा", relation: "father", house: "178", age: 56, gender: "male", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "298", epic: "RJ/20/152/006654", name: "जमनी", guardian: "सुरेश", relation: "husband", house: "178", age: 54, gender: "female", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "299", epic: "SNE0220566", name: "भागचन्द", guardian: "नारायण लाल", relation: "father", house: "178", age: 36, gender: "male", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "300", epic: "SNE0220574", name: "श्रवण लाल", guardian: "नारायण", relation: "father", house: "178", age: 36, gender: "male", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "301", epic: "SNE0795898", name: "डाली", guardian: "भागचन्द", relation: "husband", house: "178", age: 36, gender: "female", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "302", epic: "SNE0795906", name: "लक्ष्मी", guardian: "श्रवणलाल", relation: "husband", house: "178", age: 33, gender: "female", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "303", epic: "SNE0954396", name: "लक्ष्मण लाल", guardian: "सुरेशचन्द्र", relation: "father", house: "178", age: 28, gender: "male", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "304", epic: "SNE1243278", name: "अंचु", guardian: "लक्ष्मण लाल", relation: "husband", house: "178", age: 27, gender: "female", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "305", epic: "SNE1240811", name: "मुकेश", guardian: "सुरेश", relation: "father", house: "178", age: 26, gender: "male", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "306", epic: "SNE1840685", name: "इंदरा देवी", guardian: "मुकेश सालवी", relation: "husband", house: "178", age: 22, gender: "female", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "307", epic: "SNE1855899", name: "दुर्गा सालवी", guardian: "सुरेश चंद", relation: "husband", house: "178", age: 20, gender: "female", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "308", epic: "SNE1525070", name: "मयरा", guardian: "भगवान सिंह", relation: "father", house: "204", age: 25, gender: "female", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },

  // Page 14 (Serial 309) - Section 2 End (Partial Page with 1 Card)
  { serial: "309", epic: "SNE1646058", name: "राहुल कुमार", guardian: "धमेन्द्र", relation: "father", house: "178", age: 22, gender: "male", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },

  // Page 15 (Serials 310 to 339) - Section 3 Start (3-सुधार मोहल्ला,जोरावरपुरा)
  { serial: "310", epic: "RJ/20/152/006580", name: "बरदी", guardian: "मोहन", relation: "husband", house: "1", age: 74, gender: "female", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "311", epic: "RJ/20/152/006567", name: "किशनलाल", guardian: "मोहन", relation: "father", house: "1", age: 56, gender: "male", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "312", epic: "SNE1557032", name: "प्रेमा", guardian: "शिव लाल", relation: "husband", house: "1", age: 56, gender: "female", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "313", epic: "KDY0959114", name: "बाली", guardian: "किशनलाल", relation: "husband", house: "1", age: 54, gender: "female", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "314", epic: "SNE1557024", name: "शिव लाल", guardian: "नाथू लाल सुधार", relation: "father", house: "1", age: 53, gender: "male", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "315", epic: "SNE0265090", name: "मगरमलाल", guardian: "वरदा", relation: "father", house: "1", age: 52, gender: "male", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "316", epic: "KDY2044212", name: "लक्ष्मी", guardian: "मगनालाल", relation: "husband", house: "1", age: 52, gender: "female", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "317", epic: "SNE0514026", name: "मुकेश", guardian: "किशनलाल", relation: "father", house: "1", age: 36, gender: "male", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "318", epic: "SNE1128081", name: "प्रेमी", guardian: "प्रकाश", relation: "husband", house: "1", age: 30, gender: "female", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "319", epic: "SNE0907766", name: "प्रकाश चन्द", guardian: "किशनलाल", relation: "father", house: "1", age: 29, gender: "male", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "320", epic: "SNE1015981", name: "लक्ष्मी देवी", guardian: "मुकेश", relation: "husband", house: "1", age: 28, gender: "female", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "321", epic: "SNE1575265", name: "दिव्या", guardian: "मगुरा लाल", relation: "father", house: "1", age: 22, gender: "female", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "322", epic: "RJ/20/152/006581", name: "ऐछी", guardian: "वरदू", relation: "husband", house: "2", age: 81, gender: "female", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "323", epic: "SNE0307355", name: "राजू", guardian: "खेमा", relation: "father", house: "3", age: 66, gender: "male", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "324", epic: "SNE0063073", name: "कंकु", guardian: "राजू", relation: "husband", house: "3", age: 61, gender: "female", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "325", epic: "KDY1250810", name: "फेकीबाई", guardian: "गंगाराम", relation: "husband", house: "4", age: 79, gender: "female", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "326", epic: "RJ/20/152/006605", name: "गनेशराम", guardian: "लछीराम", relation: "father", house: "4", age: 77, gender: "male", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "327", epic: "KDY1115468", name: "भंवरी बाई", guardian: "गनेशराम", relation: "husband", house: "4", age: 73, gender: "female", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "328", epic: "KDY2044311", name: "किस्तूरचन्द", guardian: "गंगाराम", relation: "father", house: "4", age: 59, gender: "male", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "329", epic: "KDY1115443", name: "भागुही", guardian: "किस्तूरचन्द", relation: "husband", house: "4", age: 57, gender: "female", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "330", epic: "KDY2044360", name: "डालचन्द", guardian: "गंगाराम", relation: "father", house: "4", age: 55, gender: "male", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "331", epic: "KDY1115450", name: "सुन्दरदेवी", guardian: "डालचन्द", relation: "husband", house: "4", age: 54, gender: "female", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "332", epic: "KDY0959122", name: "रमेशचन्द", guardian: "गनेश", relation: "father", house: "4", age: 52, gender: "male", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "333", epic: "SNE0063362", name: "रोशन", guardian: "गणेश", relation: "father", house: "4", age: 47, gender: "male", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "334", epic: "SNE0063354", name: "चान्दमल", guardian: "गणेश", relation: "father", house: "4", age: 45, gender: "male", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "335", epic: "KDY1250836", name: "यशोदा", guardian: "चान्दमल", relation: "husband", house: "4", age: 44, gender: "female", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "336", epic: "SNE0284810", name: "लाड़ देवी", guardian: "रोशनलाल", relation: "husband", house: "4", age: 42, gender: "female", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "337", epic: "SNE0063370", name: "कैलाश चन्द", guardian: "गणेशराम", relation: "father", house: "4", age: 38, gender: "male", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "338", epic: "SNE0460675", name: "गोपाल लाल", guardian: "गणेश राम", relation: "father", house: "4", age: 35, gender: "male", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "339", epic: "SNE0683318", name: "नारायणी देवी", guardian: "कैलाशचन्द", relation: "husband", house: "4", age: 34, gender: "female", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },

  // Page 16 (Serials 340 to 369)
  { serial: "340", epic: "SNE1015957", name: "रेखा देवी", guardian: "गोपाल लाल", relation: "husband", house: "4", age: 29, gender: "female", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "341", epic: "SNE1015965", name: "मधुरा", guardian: "रमेश चन्द", relation: "husband", house: "4", age: 28, gender: "female", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "342", epic: "SNE1240621", name: "दिनेश", guardian: "रमेश चन्द", relation: "father", house: "4", age: 26, gender: "male", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "343", epic: "SNE1779511", name: "भावना देवी", guardian: "दिनेश चंद", relation: "husband", house: "4", age: 24, gender: "female", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "344", epic: "SNE1575331", name: "हेमराज", guardian: "कस्तूर चंद", relation: "father", house: "4", age: 23, gender: "male", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "345", epic: "SNE1892538", name: "दयाल सुधार", guardian: "चांद मल", relation: "father", house: "4", age: 19, gender: "male", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "346", epic: "RJ/20/152/006582", name: "तुलसी", guardian: "जगन्नाथ", relation: "husband", house: "5", age: 86, gender: "female", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "347", epic: "KDY0959130", name: "उदयराम", guardian: "जगन्नाथ", relation: "father", house: "5", age: 55, gender: "male", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "348", epic: "KDY0959148", name: "देउदेवी", guardian: "उदयराम", relation: "husband", house: "5", age: 54, gender: "female", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "349", epic: "RJ/20/152/006584", name: "शान्ती", guardian: "जयराम", relation: "husband", house: "5", age: 54, gender: "female", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "350", epic: "SNE0381780", name: "जयराम", guardian: "जगन्नाथ", relation: "father", house: "5", age: 51, gender: "male", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "351", epic: "SNE1225739", name: "प्रकाश", guardian: "डालचंद", relation: "father", house: "5", age: 27, gender: "male", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "352", epic: "SNE1307644", name: "राधेश्याम", guardian: "उदयराम", relation: "father", house: "5", age: 26, gender: "male", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "353", epic: "SNE1575166", name: "भावना", guardian: "उदयराम", relation: "father", house: "5", age: 26, gender: "female", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "354", epic: "SNE1579606", name: "मीना", guardian: "उदयराम", relation: "father", house: "5", age: 24, gender: "female", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "355", epic: "SNE1579663", name: "राहुल", guardian: "उदय राम", relation: "father", house: "5", age: 22, gender: "male", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "356", epic: "RJ/20/152/006528", name: "छीतरमल", guardian: "तुलसीराम", relation: "father", house: "6", age: 66, gender: "male", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "357", epic: "RJ/20/152/006585", name: "गंगादेवी", guardian: "छीतरमल", relation: "husband", house: "6", age: 64, gender: "female", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "358", epic: "SNE0265108", name: "नारायण", guardian: "छीतर मल", relation: "father", house: "6", age: 45, gender: "male", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "359", epic: "KDY1115476", name: "सीमा", guardian: "नारायण", relation: "husband", house: "6", age: 44, gender: "female", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "360", epic: "SNE1579713", name: "राणी", guardian: "छीतर मल", relation: "father", house: "6", age: 25, gender: "female", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "361", epic: "SNE1575224", name: "गणपत", guardian: "छीतर मल", relation: "father", house: "6", age: 23, gender: "male", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "362", epic: "RJ/20/152/006509", name: "सोहनबाई", guardian: "नेगुराम", relation: "husband", house: "7", age: 76, gender: "female", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "363", epic: "KDY1250844", name: "जगदीश", guardian: "नेगु राम", relation: "father", house: "7", age: 45, gender: "male", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "364", epic: "SNE0891945", name: "नारायण लाल", guardian: "नेगुराम", relation: "father", house: "7", age: 38, gender: "male", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "365", epic: "SNE0891952", name: "केसर", guardian: "नारायण लाल", relation: "husband", house: "7", age: 37, gender: "female", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "366", epic: "SNE0891960", name: "मीरा देवी", guardian: "जगदीशचन्द्र", relation: "husband", house: "7", age: 37, gender: "female", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "367", epic: "KDY0959155", name: "पन्नालाल", guardian: "खेमाराम", relation: "father", house: "8", age: 63, gender: "male", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "368", epic: "SNE1815299", name: "प्रताप लाल गुर्जर", guardian: "खेमलाल गुर्जर", relation: "father", house: "8", age: 52, gender: "male", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "369", epic: "RJ/20/152/006568", name: "मांगीलाल", guardian: "हरिराम", relation: "father", house: "9", age: 76, gender: "male", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },

  // Page 17 (Serials 370 to 399)
  { serial: "370", epic: "RJ/20/152/007070", name: "हरजुबाई", guardian: "मांगीलाल", relation: "husband", house: "9", age: 71, gender: "female", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "371", epic: "SNE0381822", name: "भोजराम", guardian: "हरिराम", relation: "father", house: "9", age: 60, gender: "male", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "372", epic: "SNE0728535", name: "भैरूलाल", guardian: "मांगीलाल", relation: "father", house: "9", age: 31, gender: "male", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "373", epic: "SNE1307529", name: "गेहरी लाल", guardian: "भोजराम", relation: "father", house: "9", age: 27, gender: "male", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "374", epic: "SNE1876804", name: "पप्पू लाल", guardian: "भोजराम", relation: "father", house: "9", age: 23, gender: "male", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "375", epic: "SNE1878297", name: "सुगाना देवी", guardian: "पप्पू लाल", relation: "husband", house: "9", age: 23, gender: "female", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "376", epic: "RJ/20/152/007071", name: "कमला", guardian: "भोजाराम", relation: "husband", house: "10", age: 64, gender: "female", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "377", epic: "SNE1885250", name: "रतन देवी", guardian: "प्रकाश चंद", relation: "husband", house: "10", age: 40, gender: "female", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "378", epic: "SNE0514067", name: "उदी देवी", guardian: "नारायणलाल", relation: "husband", house: "10", age: 39, gender: "female", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "379", epic: "SNE0381830", name: "नारायण", guardian: "भोजाराम", relation: "father", house: "10", age: 36, gender: "male", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "380", epic: "SNE0514059", name: "प्रकाशचन्द", guardian: "भोजाराम", relation: "father", house: "10", age: 36, gender: "male", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "381", epic: "SNE0381848", name: "शंकर लाल", guardian: "भोजा राम", relation: "father", house: "10", age: 34, gender: "male", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "382", epic: "SNE1875368", name: "संतोष देवी", guardian: "शंकर लाल", relation: "husband", house: "10", age: 32, gender: "female", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "383", epic: "SNE1908508", name: "जयराम", guardian: "भोजाराम", relation: "father", house: "10", age: 19, gender: "male", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "384", epic: "RJ/20/152/006591", name: "देवीबाई", guardian: "केला", relation: "husband", house: "11", age: 79, gender: "female", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "385", epic: "SNE0307371", name: "आसूराम", guardian: "किसना", relation: "father", house: "11", age: 79, gender: "male", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "386", epic: "RJ/20/152/006592", name: "लेहरीबाई", guardian: "आसूराम", relation: "husband", house: "11", age: 71, gender: "female", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "387", epic: "RJ/20/152/006630", name: "पन्नालाल", guardian: "गोकल", relation: "father", house: "11", age: 66, gender: "male", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "388", epic: "RJ/20/152/007072", name: "चांदी", guardian: "पन्नालाल", relation: "husband", house: "11", age: 62, gender: "female", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "389", epic: "KDY1115492", name: "सुवालाल", guardian: "आसूराम", relation: "father", house: "11", age: 54, gender: "male", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "390", epic: "RJ/20/152/006593", name: "मीठू", guardian: "सुवालाल", relation: "husband", house: "11", age: 54, gender: "female", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "391", epic: "SNE1795194", name: "नाथी", guardian: "नारायण लाल", relation: "husband", house: "11", age: 52, gender: "female", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "392", epic: "SNE0151936", name: "रामलाल", guardian: "आसूराम", relation: "father", house: "11", age: 37, gender: "male", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "393", epic: "SNE0683326", name: "पारसी देवी", guardian: "रामलाल", relation: "husband", house: "11", age: 33, gender: "female", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "394", epic: "SNE1307545", name: "हरदेव", guardian: "सुवालाल", relation: "father", house: "11", age: 27, gender: "male", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "395", epic: "SNE1307552", name: "महेंद्र लाल", guardian: "पन्ना लाल", relation: "father", house: "11", age: 26, gender: "male", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "396", epic: "SNE1888262", name: "सीता देवी", guardian: "हरदेव लाल", relation: "husband", house: "11", age: 21, gender: "female", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "397", epic: "SNE1884659", name: "प्रकाश चंद", guardian: "नारायण लाल", relation: "father", house: "11", age: 20, gender: "male", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "398", epic: "RJ/20/152/006606", name: "छगुलाल", guardian: "गोकल", relation: "father", house: "12", age: 71, gender: "male", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "399", epic: "RJ/20/152/006594", name: "फेपी", guardian: "छगुलाल", relation: "husband", house: "12", age: 68, gender: "female", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" }
];

async function importPages11to15() {
  console.log('========================================================================');
  console.log(' FETCHING & SAVING VOTER PAGES 11 TO 15 (SERIAL 279 TO 399)            ');
  console.log(' ASSEMBLY: 179 - सहाडा (सामान्य), PART: 6                             ');
  console.log('========================================================================\n');

  await connectDB();

  let ward = await Ward.findOne({ number: "179" });
  if (!ward) {
    ward = await Ward.create({ number: "179", name: "विधान सभा 179 - सहाडा (सामान्य)", area: "सहाडा", active: true });
  }

  let booth = await Booth.findOne({ ward: ward._id, number: "6" });
  if (!booth) {
    booth = await Booth.create({ ward: ward._id, number: "6", name: "भाग संख्या 6 - सरेवडी", area: "सरेवड़ी", active: true });
  }

  let savedCount = 0;
  let updatedCount = 0;

  for (const v of sarewadiPart6Pages11to15Voters) {
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
      address: `${v.sectionName}, मकान: ${v.house}`,
      location: v.sectionName,
      assemblyNumber: "179",
      assemblyName: "सहाडा (सामान्य)",
      partNumber: "6",
      sectionNumber: v.sectionNumber,
      sectionName: v.sectionName,
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
  console.log(`     SAREWADI PART 6 (179-सहाडा) - PAGES 11 TO 15 FETCH SUMMARY         `);
  console.log(`========================================================================`);
  console.log(`Total Cards Evaluated: 121 (Serials 279 to 399)`);
  console.log(`Total DELETED Excluded: 0`);
  console.log(`Total ACTIVE Processed: ${sarewadiPart6Pages11to15Voters.length}`);
  console.log(`New Saved: ${savedCount} | Updated: ${updatedCount}`);
  console.log(`------------------------------------------------------------------------\n`);

  await mongoose.disconnect();
  process.exit(0);
}

importPages11to15().catch(err => {
  console.error('Import Error:', err);
  process.exit(1);
});
