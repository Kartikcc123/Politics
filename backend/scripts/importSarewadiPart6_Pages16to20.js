require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../src/config/db');
const Ward = require('../src/models/Ward');
const Booth = require('../src/models/Booth');
const Member = require('../src/models/Member');

// Voter Pages 16 to 20 (Document Pages 18 to 22, Serials 400 to 541)
// Section 3: 3-सुधार मोहल्ला,जोरावरपुरा (Serials 400 to 421) [Ends on Page 18 with 22 cards]
// Section 4: 4-बलाई मोहल्ला,जोरावरपुरा (Serials 422 to 541) [Starts on Page 19]
// Total Cards: 142 | DELETED: 0 | ACTIVE: 142
const sarewadiPart6Pages16to20Voters = [
  // Page 18 (Serials 400 to 421) - Section 3 End
  { serial: "400", epic: "KDY0959163", name: "भेरू लाल", guardian: "छगु लाल", relation: "father", house: "12", age: 51, gender: "male", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "401", epic: "KDY0959171", name: "गीता", guardian: "भेरू लाल", relation: "husband", house: "12", age: 49, gender: "female", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "402", epic: "RJ/20/152/007073", name: "चतरभुज", guardian: "गोकल", relation: "father", house: "13", age: 73, gender: "male", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "403", epic: "RJ/20/152/006595", name: "अणछीबाई", guardian: "चतरभुज", relation: "husband", house: "13", age: 71, gender: "female", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "404", epic: "SNE0307397", name: "नारायण", guardian: "चतरभुज", relation: "father", house: "13", age: 48, gender: "male", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "405", epic: "KDY1115500", name: "प्रेमी", guardian: "नारायण", relation: "husband", house: "13", age: 46, gender: "female", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "406", epic: "KDY1115518", name: "हेमराज", guardian: "चतरभुज", relation: "father", house: "13", age: 44, gender: "male", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "407", epic: "SNE0907774", name: "मीना", guardian: "हेमराज", relation: "husband", house: "13", age: 30, gender: "female", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "408", epic: "SNE0782664", name: "रेमतलाल", guardian: "गोकल", relation: "father", house: "14", age: 79, gender: "male", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "409", epic: "RJ/20/152/006596", name: "सोसरदेवी", guardian: "रेमतलाल", relation: "husband", house: "14", age: 73, gender: "female", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "410", epic: "KDY2044261", name: "लक्ष्मण", guardian: "रहमत लाल", relation: "father", house: "14", age: 50, gender: "male", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "411", epic: "KDY2044279", name: "नाथी", guardian: "लक्ष्मण", relation: "husband", house: "14", age: 48, gender: "female", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "412", epic: "RJ/20/152/007074", name: "रूपलाल", guardian: "गोकल", relation: "father", house: "15", age: 66, gender: "male", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "413", epic: "RJ/20/152/006597", name: "रामी", guardian: "रूपलाल", relation: "husband", house: "15", age: 61, gender: "female", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "414", epic: "SNE0544890", name: "शंकरलाल", guardian: "बालूराम", relation: "father", house: "15", age: 42, gender: "male", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "415", epic: "SNE0544908", name: "सन्तोकी", guardian: "शंकरलाल", relation: "husband", house: "15", age: 40, gender: "female", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "416", epic: "SNE0381871", name: "गोवर्धन", guardian: "रूपलाल", relation: "father", house: "15", age: 38, gender: "male", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "417", epic: "SNE0182576", name: "सुरेश चन्द्र", guardian: "रूपलाल", relation: "father", house: "15", age: 37, gender: "male", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "418", epic: "SNE0986612", name: "मंगनी", guardian: "गोवर्धन लाल", relation: "husband", house: "15", age: 35, gender: "female", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "419", epic: "SNE0381889", name: "अणदी", guardian: "सुरेश चन्द", relation: "husband", house: "15", age: 33, gender: "female", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "420", epic: "SNE1340397", name: "देवली", guardian: "शंभु लाल", relation: "husband", house: "21", age: 26, gender: "female", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },
  { serial: "421", epic: "SNE1575414", name: "मीना", guardian: "लाडू लाल", relation: "father", house: "29", age: 26, gender: "female", sectionNumber: "3", sectionName: "3-सुधार मोहल्ला,जोरावरपुरा" },

  // Page 19 (Serials 422 to 451) - Section 4 Start (4-बलाई मोहल्ला,जोरावरपुरा)
  { serial: "422", epic: "SNE0398974", name: "प्यारी देवी", guardian: "अवध लाल", relation: "husband", house: "6", age: 38, gender: "female", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "423", epic: "SNE1128107", name: "प्रभु लाल", guardian: "नारायण लाल", relation: "father", house: "11", age: 30, gender: "male", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "424", epic: "SNE1220193", name: "जेतु", guardian: "प्रभु लाल", relation: "husband", house: "11", age: 27, gender: "female", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "425", epic: "KDY1250851", name: "हज़ारीमल", guardian: "नन्दराम", relation: "father", house: "16", age: 69, gender: "male", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "426", epic: "KDY1115534", name: "आसूराम", guardian: "नन्दराम", relation: "father", house: "16", age: 62, gender: "male", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "427", epic: "KDY1115526", name: "मचरा", guardian: "हजारेमल", relation: "husband", house: "16", age: 61, gender: "female", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "428", epic: "RJ/20/152/006598", name: "गंगादेवी", guardian: "आसूराम", relation: "husband", house: "16", age: 59, gender: "female", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "429", epic: "SNE1243377", name: "गणि", guardian: "शंकरलाल", relation: "father", house: "16", age: 26, gender: "female", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "430", epic: "SNE1243369", name: "शंकरलाल", guardian: "आसूराम", relation: "father", house: "16", age: 26, gender: "male", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "431", epic: "SNE0307405", name: "फेपी", guardian: "बगतावर", relation: "husband", house: "17", age: 87, gender: "female", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "432", epic: "RJ/20/152/007075", name: "उदेराम", guardian: "बगतावर", relation: "father", house: "17", age: 61, gender: "male", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "433", epic: "KDY1115542", name: "हीरी", guardian: "उदेराम", relation: "husband", house: "17", age: 58, gender: "female", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "434", epic: "SNE0381897", name: "बना लाल", guardian: "उदय राम", relation: "father", house: "17", age: 35, gender: "male", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "435", epic: "SNE0381905", name: "रूपलाल", guardian: "उदयराम", relation: "father", house: "17", age: 34, gender: "male", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "436", epic: "SNE0683334", name: "शारदा", guardian: "बनालाल", relation: "husband", house: "17", age: 33, gender: "female", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "437", epic: "SNE0954404", name: "भेरूलाल", guardian: "उदयराम", relation: "father", house: "17", age: 30, gender: "male", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "438", epic: "SNE1016013", name: "नंगजीराम", guardian: "उदेराम", relation: "father", house: "17", age: 28, gender: "male", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "439", epic: "SNE1016005", name: "नेनाराम", guardian: "उदेराम", relation: "father", house: "17", age: 27, gender: "male", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "440", epic: "SNE0728345", name: "छगुबाई", guardian: "हीरालाल", relation: "father", house: "18", age: 79, gender: "female", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "441", epic: "RJ/20/152/006599", name: "रेवता", guardian: "हीरा", relation: "father", house: "18", age: 61, gender: "male", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "442", epic: "KDY1115559", name: "नाथी", guardian: "रेवता", relation: "husband", house: "18", age: 58, gender: "female", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "443", epic: "KDY0959189", name: "नारायण", guardian: "हीरा लाल", relation: "father", house: "18", age: 45, gender: "male", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "444", epic: "SNE0307413", name: "सीता", guardian: "नारायण", relation: "husband", house: "18", age: 43, gender: "female", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "445", epic: "SNE0381913", name: "लादुलाल", guardian: "रेमत लाल", relation: "father", house: "18", age: 34, gender: "male", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "446", epic: "SNE1016047", name: "शानु", guardian: "लादू लाल", relation: "husband", house: "18", age: 33, gender: "female", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "447", epic: "SNE0683342", name: "अम्बालाल", guardian: "रेवतालाल", relation: "father", house: "18", age: 32, gender: "male", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "448", epic: "SNE1016021", name: "रामलाल", guardian: "रेवता लाल", relation: "father", house: "18", age: 28, gender: "male", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "449", epic: "RJ/20/152/006600", name: "सुडी", guardian: "लछमीराम", relation: "husband", house: "19", age: 93, gender: "female", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "450", epic: "RJ/20/152/006056", name: "हरूलाल", guardian: "लछमीराम", relation: "father", house: "19", age: 68, gender: "male", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "451", epic: "RJ/20/152/006631", name: "भोजाराम", guardian: "लछमीराम", relation: "father", house: "19", age: 59, gender: "male", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },

  // Page 20 (Serials 452 to 481)
  { serial: "452", epic: "RJ/20/152/006517", name: "अमरा", guardian: "लछमीराम", relation: "father", house: "19", age: 52, gender: "male", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "453", epic: "SNE0284885", name: "रामलाल", guardian: "हरलाल", relation: "father", house: "19", age: 39, gender: "male", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "454", epic: "SNE0284893", name: "भेरूलाल", guardian: "हरलाल", relation: "father", house: "19", age: 36, gender: "male", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "455", epic: "SNE0381921", name: "पारसी", guardian: "अमरा", relation: "husband", house: "19", age: 35, gender: "female", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "456", epic: "SNE0728543", name: "लक्ष्मी", guardian: "रामचंद्र", relation: "husband", house: "19", age: 34, gender: "female", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "457", epic: "KDY1346592", name: "लहरूलाल", guardian: "मोतीराम", relation: "father", house: "20", age: 61, gender: "male", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "458", epic: "KDY1250877", name: "जमनी", guardian: "लहरूला", relation: "husband", house: "20", age: 58, gender: "female", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "459", epic: "RJ/20/152/006522", name: "मोहनी", guardian: "कछोड", relation: "husband", house: "21", age: 69, gender: "female", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "460", epic: "SNE0398982", name: "आसूराम", guardian: "लछमीराम", relation: "father", house: "21", age: 66, gender: "male", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "461", epic: "KDY1250885", name: "मांगीलाल", guardian: "वेनाराम", relation: "father", house: "21", age: 62, gender: "male", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "462", epic: "KDY1115567", name: "कमला", guardian: "आसूराम", relation: "husband", house: "21", age: 54, gender: "female", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "463", epic: "RJ/20/152/006660", name: "लक्ष्मी", guardian: "रेवताराम", relation: "husband", house: "21", age: 52, gender: "female", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "464", epic: "RJ/20/152/007080", name: "कमला", guardian: "मांगीलाल", relation: "husband", house: "21", age: 50, gender: "female", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "465", epic: "KDY1250935", name: "सीता", guardian: "बालू लाल", relation: "husband", house: "21", age: 50, gender: "female", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "466", epic: "RJ/20/152/006529", name: "लोमचन्द", guardian: "घेनाराम", relation: "father", house: "21", age: 49, gender: "male", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "467", epic: "RJ/20/152/007082", name: "डाली", guardian: "लोमचन्द", relation: "husband", house: "21", age: 48, gender: "female", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "468", epic: "KDY1250901", name: "सोहन", guardian: "गिरधारी", relation: "father", house: "21", age: 48, gender: "male", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "469", epic: "KDY1250927", name: "बाबू लाल", guardian: "गिरधारी लाल", relation: "father", house: "21", age: 48, gender: "male", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "470", epic: "KDY1250919", name: "गीता", guardian: "सोहन", relation: "husband", house: "21", age: 46, gender: "female", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "471", epic: "KDY0910752", name: "गोपी लाल", guardian: "गणेश", relation: "father", house: "21", age: 44, gender: "male", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "472", epic: "KDY1250943", name: "राष्ट्र देवी", guardian: "गोपी लाल", relation: "husband", house: "21", age: 43, gender: "female", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "473", epic: "SNE0209932", name: "चुन्नीलाल", guardian: "गिरधारी", relation: "father", house: "21", age: 38, gender: "male", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "474", epic: "SNE0795914", name: "रेखा", guardian: "चुन्नीलाल", relation: "husband", house: "21", age: 37, gender: "female", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "475", epic: "SNE0728568", name: "भोजा", guardian: "लोभराम", relation: "father", house: "21", age: 33, gender: "male", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "476", epic: "SNE0728550", name: "लादुलाल", guardian: "मांगीलाल", relation: "father", house: "21", age: 31, gender: "male", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "477", epic: "SNE1015999", name: "जगदीश", guardian: "आसूराम", relation: "father", house: "21", age: 27, gender: "male", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "478", epic: "SNE1016062", name: "शंभू लाल", guardian: "मांगीलाल", relation: "father", house: "21", age: 27, gender: "male", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "479", epic: "SNE1220433", name: "मोहिनी", guardian: "जगदीश", relation: "husband", house: "21", age: 27, gender: "female", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "480", epic: "SNE1523174", name: "संपत लाल", guardian: "रेवत लाल", relation: "father", house: "21", age: 26, gender: "male", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "481", epic: "SNE1524990", name: "कुसुम", guardian: "खेमराज", relation: "father", house: "21", age: 24, gender: "female", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },

  // Page 21 (Serials 482 to 511)
  { serial: "482", epic: "SNE1576438", name: "सराई", guardian: "मांगीलाल", relation: "father", house: "21", age: 23, gender: "male", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "483", epic: "SNE1797190", name: "दाखु बलाई", guardian: "गोपी लाल", relation: "father", house: "21", age: 22, gender: "female", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "484", epic: "SNE1669746", name: "किशन लाल", guardian: "आसू राम", relation: "father", house: "21", age: 21, gender: "male", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "485", epic: "SNE1698661", name: "सुरेश", guardian: "डालू लाल", relation: "father", house: "21", age: 21, gender: "male", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "486", epic: "SNE1575539", name: "शंकर लाल", guardian: "कछोड़", relation: "father", house: "21/3", age: 24, gender: "male", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "487", epic: "SNE1575760", name: "किशन लाल", guardian: "डालू लाल", relation: "father", house: "21/5", age: 22, gender: "male", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "488", epic: "SNE0544775", name: "लादूराम", guardian: "प्रतापराम", relation: "father", house: "22", age: 54, gender: "male", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "489", epic: "KDY1115575", name: "सुखी", guardian: "लादू", relation: "husband", house: "22", age: 54, gender: "female", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "490", epic: "SNE0954412", name: "दिनेश चन्द्र", guardian: "लादूराम", relation: "father", house: "22", age: 28, gender: "male", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "491", epic: "SNE1016039", name: "गोवर्धन लाल", guardian: "लादूराम", relation: "father", house: "22", age: 27, gender: "male", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "492", epic: "SNE1220292", name: "मीना", guardian: "गोवर्धन लाल", relation: "husband", house: "22", age: 27, gender: "female", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "493", epic: "SNE1220169", name: "जेतु", guardian: "दिनेश कुमार", relation: "father", house: "22", age: 26, gender: "female", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "494", epic: "RJ/20/152/007084", name: "पेमालाल", guardian: "हीरालाल", relation: "father", house: "23", age: 76, gender: "male", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "495", epic: "RJ/20/152/006525", name: "नेगुड़ी", guardian: "पेमालाल", relation: "husband", house: "23", age: 66, gender: "female", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "496", epic: "SNE0307462", name: "भोजाराम", guardian: "छोगालाल", relation: "father", house: "24", age: 71, gender: "male", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "497", epic: "SNE0307454", name: "सुखी", guardian: "भोजाराम", relation: "husband", house: "24", age: 69, gender: "female", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "498", epic: "SNE0307447", name: "बगतावर", guardian: "छोगालाल", relation: "father", house: "24", age: 61, gender: "male", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "499", epic: "KDY1250950", name: "गणेश देवी", guardian: "बगतावर", relation: "husband", house: "24", age: 54, gender: "female", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "500", epic: "SNE1220581", name: "भगवती लाल", guardian: "बगतावर", relation: "father", house: "24", age: 28, gender: "male", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "501", epic: "SNE1220243", name: "सुखी", guardian: "भगवती लाल", relation: "husband", house: "24", age: 27, gender: "female", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "502", epic: "SNE1307537", name: "कैलाश", guardian: "बगतावर", relation: "father", house: "24", age: 26, gender: "male", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "503", epic: "RJ/20/152/006575", name: "दयाराम", guardian: "लालू", relation: "father", house: "25", age: 81, gender: "male", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "504", epic: "SNE0307470", name: "छगुबाई", guardian: "दयाराम", relation: "husband", house: "25", age: 74, gender: "female", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "505", epic: "KDY0959197", name: "चुना", guardian: "दयाराम", relation: "father", house: "25", age: 53, gender: "male", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "506", epic: "KDY0959205", name: "अमरी", guardian: "चुना", relation: "husband", house: "25", age: 49, gender: "female", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "507", epic: "KDY2044303", name: "भेरू लाल", guardian: "दया राम", relation: "father", house: "25", age: 49, gender: "male", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "508", epic: "KDY1346691", name: "वक्षा लाल", guardian: "दया राम", relation: "father", house: "25", age: 47, gender: "male", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "509", epic: "SNE0307488", name: "घणी", guardian: "भेरूलाल", relation: "husband", house: "25", age: 42, gender: "female", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "510", epic: "KDY2044295", name: "रूकमणी", guardian: "बदालाल", relation: "husband", house: "25", age: 42, gender: "female", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "511", epic: "SNE0460683", name: "पारस मल", guardian: "दयाराम", relation: "father", house: "25", age: 37, gender: "male", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },

  // Page 22 (Serials 512 to 541)
  { serial: "512", epic: "SNE0728576", name: "रामीबाई", guardian: "पारसमल", relation: "husband", house: "25", age: 37, gender: "female", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "513", epic: "SNE1332600", name: "नारायणी", guardian: "किशन लाल", relation: "father", house: "25", age: 26, gender: "female", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "514", epic: "SNE1332592", name: "किशन लाल", guardian: "चुन्नी लाल", relation: "father", house: "25", age: 25, gender: "male", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "515", epic: "RJ/20/152/006643", name: "उदयराम", guardian: "लालू", relation: "father", house: "26", age: 78, gender: "male", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "516", epic: "RJ/20/152/006603", name: "नारायणी", guardian: "उदयराम", relation: "husband", house: "26", age: 71, gender: "female", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "517", epic: "KDY0959213", name: "सुवा लाल", guardian: "उदय राम", relation: "father", house: "26", age: 49, gender: "male", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "518", epic: "SNE0152140", name: "श्रवण लाल", guardian: "उदयराम", relation: "father", house: "26", age: 43, gender: "male", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "519", epic: "RJ/20/152/006577", name: "गिरधारी", guardian: "लालू", relation: "father", house: "27", age: 66, gender: "male", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "520", epic: "RJ/20/152/006604", name: "सन्तु", guardian: "गिरधारी", relation: "husband", house: "27", age: 54, gender: "female", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "521", epic: "SNE1128115", name: "ईंदरा", guardian: "शंकरलाल", relation: "father", house: "27", age: 37, gender: "female", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "522", epic: "SNE1307628", name: "शंकर लाल", guardian: "गिरधारी", relation: "father", house: "27", age: 32, gender: "male", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "523", epic: "SNE1307503", name: "ईंद्रा", guardian: "रूपलाल", relation: "father", house: "27", age: 27, gender: "female", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "524", epic: "RJ/20/152/006586", name: "मोहनबाई", guardian: "बालूलाल", relation: "husband", house: "28", age: 71, gender: "female", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "525", epic: "RJ/20/152/006587", name: "उगमबाई", guardian: "नाथूलाल", relation: "husband", house: "29", age: 91, gender: "female", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "526", epic: "KDY1250968", name: "लादू लाल", guardian: "भूरा", relation: "father", house: "29", age: 49, gender: "male", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "527", epic: "SNE0265116", name: "गीता", guardian: "लादू लाल", relation: "husband", house: "29", age: 48, gender: "female", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "528", epic: "SNE1779479", name: "किशन लाल सुधार", guardian: "लादू लाल", relation: "father", house: "29", age: 20, gender: "male", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "529", epic: "KDY0959221", name: "हरलाल", guardian: "घीसा", relation: "father", house: "30", age: 76, gender: "male", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "530", epic: "RJ/20/152/006588", name: "सन्तोक", guardian: "हरलाल", relation: "husband", house: "30", age: 69, gender: "female", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "531", epic: "SNE0954420", name: "रेखा", guardian: "भेरूलाल", relation: "father", house: "30", age: 33, gender: "female", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "532", epic: "RJ/20/152/006607", name: "डालूलाल", guardian: "गणेश", relation: "father", house: "31", age: 61, gender: "male", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "533", epic: "RJ/20/152/006659", name: "भंवरी", guardian: "डालूलाल", relation: "husband", house: "31", age: 58, gender: "female", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "534", epic: "KDY1115583", name: "खेमराज", guardian: "गणेशराम", relation: "father", house: "31", age: 54, gender: "male", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "535", epic: "KDY1115591", name: "कमला", guardian: "खेमराज", relation: "husband", house: "31", age: 52, gender: "female", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "536", epic: "SNE0381947", name: "मीना", guardian: "खेमराज", relation: "father", house: "31", age: 33, gender: "female", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "537", epic: "SNE0981126", name: "रोशन लाल", guardian: "डालू लाल", relation: "father", house: "31", age: 32, gender: "male", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "538", epic: "SNE0981134", name: "दुर्गा", guardian: "डालू लाल", relation: "father", house: "31", age: 31, gender: "female", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "539", epic: "SNE1016054", name: "तेजमल", guardian: "डालू राम", relation: "father", house: "31", age: 28, gender: "male", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "540", epic: "SNE0986620", name: "मदन लाल", guardian: "खेमराज", relation: "father", house: "31", age: 27, gender: "male", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" },
  { serial: "541", epic: "SNE1307636", name: "पुष्पा कुमारी", guardian: "खेमराज", relation: "father", house: "31", age: 26, gender: "female", sectionNumber: "4", sectionName: "4-बलाई मोहल्ला,जोरावरपुरा" }
];

async function importPages16to20() {
  console.log('========================================================================');
  console.log(' FETCHING & SAVING VOTER PAGES 16 TO 20 (SERIAL 400 TO 541)            ');
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

  for (const v of sarewadiPart6Pages16to20Voters) {
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
  console.log(`     SAREWADI PART 6 (179-सहाडा) - PAGES 16 TO 20 FETCH SUMMARY         `);
  console.log(`========================================================================`);
  console.log(`Total Cards Evaluated: 142 (Serials 400 to 541)`);
  console.log(`Total DELETED Excluded: 0`);
  console.log(`Total ACTIVE Processed: ${sarewadiPart6Pages16to20Voters.length}`);
  console.log(`New Saved: ${savedCount} | Updated: ${updatedCount}`);
  console.log(`------------------------------------------------------------------------\n`);

  await mongoose.disconnect();
  process.exit(0);
}

importPages16to20().catch(err => {
  console.error('Import Error:', err);
  process.exit(1);
});
