const mongoose = require('mongoose');
const Member = require('../src/models/Member');

const rawVoters = [
  // Page 3
  { serial: 1, epic: 'SNE1307719', name: 'बबलू सिंह', guardian: 'जीतू सिंह', rel: 'father', house: '0', age: 25, gender: 'M' },
  { serial: 2, epic: 'RJ/20/152/081045', name: 'सन्तोषी', guardian: 'गोपीलाल', rel: 'husband', house: '11', age: 73, gender: 'F' },
  { serial: 3, epic: 'KDY1260397', name: 'अम्बू बाई', guardian: 'मांगी लाल', rel: 'husband', house: '11', age: 63, gender: 'F' },
  { serial: 4, epic: 'RJ/20/152/081218', name: 'सुरेशकुमार', guardian: 'गोपीलाल', rel: 'father', house: '11', age: 51, gender: 'M' },
  { serial: 5, epic: 'KDY1260389', name: 'मीठू बाई', guardian: 'सुरेश कुमार', rel: 'husband', house: '11', age: 49, gender: 'F' },
  { serial: 6, epic: 'SNE0399055', name: 'सुवा लाल', guardian: 'गोपीलाल', rel: 'father', house: '11', age: 40, gender: 'M' },
  { serial: 7, epic: 'SNE0399063', name: 'प्रेमी', guardian: 'सुवा', rel: 'husband', house: '11', age: 36, gender: 'F' },
  { serial: 8, epic: 'SNE0820225', name: 'प्रहलाद', guardian: 'गोपी', rel: 'father', house: '11', age: 33, gender: 'M' },
  { serial: 9, epic: 'SNE0820233', name: 'कान्ता', guardian: 'प्रहलाद', rel: 'husband', house: '11', age: 31, gender: 'F' },
  { serial: 10, epic: 'SNE1711993', name: 'श्याम लाल', guardian: 'सुरेश', rel: 'father', house: '11', age: 21, gender: 'M' },
  { serial: 11, epic: 'RJ/20/152/081216', name: 'चमनसिंह', guardian: 'उदयसिंह', rel: 'father', house: '15', age: 65, gender: 'M' },
  { serial: 12, epic: 'RJ/20/152/081127', name: 'गणेशकंवर', guardian: 'चमनसिंह', rel: 'husband', house: '15', age: 63, gender: 'F' },
  { serial: 13, epic: 'SNE0236604', name: 'बरजू', guardian: 'नेनुनाथ', rel: 'husband', house: '16', age: 66, gender: 'F' },
  { serial: 14, epic: 'RJ/20/152/082058', name: 'भँवरलाल', guardian: 'देवाराम', rel: 'father', house: '16', age: 61, gender: 'M' },
  { serial: 15, epic: 'RJ/20/152/082057', name: 'रेवतनाथ', guardian: 'प्रेमनाथ', rel: 'father', house: '16', age: 55, gender: 'M' },
  { serial: 16, epic: 'RJ/20/152/081176', name: 'अणछीबाई', guardian: 'रेवतनाथ', rel: 'husband', house: '16', age: 53, gender: 'F' },
  { serial: 17, epic: 'SNE1620798', name: 'लादू', guardian: 'गोपी', rel: 'father', house: '16', age: 51, gender: 'M' },
  { serial: 18, epic: 'KDY1260405', name: 'सुगनी बाई', guardian: 'लादू नाथ', rel: 'husband', house: '16', age: 45, gender: 'F' },
  { serial: 19, epic: 'SNE0602151', name: 'गोवर्धन', guardian: 'भँवर', rel: 'father', house: '16', age: 39, gender: 'M' },
  { serial: 20, epic: 'SNE0545012', name: 'पप्पू', guardian: 'भँवर', rel: 'father', house: '16', age: 35, gender: 'M' },
  { serial: 21, epic: 'SNE0602177', name: 'प्रेम', guardian: 'भँवर', rel: 'father', house: '16', age: 35, gender: 'M' },
  { serial: 22, epic: 'SNE0602169', name: 'तारा', guardian: 'गोवर्धन', rel: 'husband', house: '16', age: 34, gender: 'F' },
  { serial: 23, epic: 'SNE0782698', name: 'प्रतापी बाई', guardian: 'पप्पू', rel: 'husband', house: '16', age: 32, gender: 'F' },
  { serial: 24, epic: 'SNE0891978', name: 'कैलाश', guardian: 'नेनूराम', rel: 'father', house: '16', age: 31, gender: 'M' },

  // Page 4
  { serial: 25, epic: 'SNE0602185', name: 'दुर्गा', guardian: 'प्रेम', rel: 'husband', house: '16', age: 30, gender: 'F' },
  { serial: 26, epic: 'SNE1587310', name: 'पिंटू नाथ', guardian: 'रेवत नाथ', rel: 'father', house: '16', age: 24, gender: 'M' },
  { serial: 27, epic: 'SNE1593565', name: 'कमलेश', guardian: 'लाडू', rel: 'father', house: '16', age: 23, gender: 'M' },
  { serial: 28, epic: 'SNE1796457', name: 'मेघा रावल', guardian: 'लाडू', rel: 'father', house: '16', age: 21, gender: 'F' },
  { serial: 29, epic: 'SNE1649029', name: 'परमेश्वर', guardian: 'उदय राम', rel: 'father', house: '33', age: 21, gender: 'M' },
  { serial: 30, epic: 'SNE0514281', name: 'भवानी सिंह', guardian: 'बगतावर सिंह', rel: 'father', house: '105', age: 32, gender: 'M' },
  { serial: 32, epic: 'SNE1307735', name: 'महेंद्र सिंह', guardian: 'सज्जन सिंह', rel: 'father', house: '-', age: 25, gender: 'M' },
  { serial: 33, epic: 'SNE1829480', name: 'महिपाल सोलंकी', guardian: 'गोकुल सिंह', rel: 'father', house: 'भाणुजा', age: 19, gender: 'M' },
  { serial: 34, epic: 'KDY0976613', name: 'बालूराम', guardian: 'बदीचन्द', rel: 'father', house: '32', age: 51, gender: 'M' },
  { serial: 35, epic: 'KDY0976647', name: 'देऊ बाई', guardian: 'बालू राम', rel: 'husband', house: '32', age: 48, gender: 'F' },
  { serial: 36, epic: 'RJ/20/152/081023', name: 'प्रताबी', guardian: 'नेनूराम', rel: 'husband', house: '33', age: 87, gender: 'F' },
  { serial: 37, epic: 'RJ/20/152/082014', name: 'जमनालाल', guardian: 'नेनूराम', rel: 'father', house: '33', age: 55, gender: 'M' },
  { serial: 38, epic: 'RJ/20/152/082015', name: 'सन्तोषी', guardian: 'जमनालाल', rel: 'husband', house: '33', age: 53, gender: 'F' },
  { serial: 39, epic: 'KDY0976662', name: 'उदेराम', guardian: 'लच्छीराम', rel: 'father', house: '33', age: 46, gender: 'M' },
  { serial: 40, epic: 'SNE0782722', name: 'सीताबाई', guardian: 'उदयराम', rel: 'husband', house: '33', age: 37, gender: 'F' },
  { serial: 41, epic: 'SNE0795989', name: 'कैलाशलाल', guardian: 'जमनालाल', rel: 'father', house: '33', age: 35, gender: 'M' },
  { serial: 42, epic: 'SNE0545020', name: 'नारायणलाल', guardian: 'लच्छीराम', rel: 'father', house: '33', age: 33, gender: 'M' },
  { serial: 43, epic: 'SNE0981183', name: 'सीमा देवी', guardian: 'कैलाश लाल', rel: 'husband', house: '33', age: 32, gender: 'F' },
  { serial: 44, epic: 'SNE1406149', name: 'संतोष देवी', guardian: 'नारायण लाल', rel: 'husband', house: '33', age: 30, gender: 'F' },
  { serial: 45, epic: 'SNE0820258', name: 'महेन्द्र', guardian: 'जमनालाल', rel: 'father', house: '33', age: 29, gender: 'M' },
  { serial: 46, epic: 'SNE1243468', name: 'माया', guardian: 'महेंद्र सिंह', rel: 'husband', house: '33', age: 26, gender: 'F' },
  { serial: 47, epic: 'SNE1243450', name: 'बाबू', guardian: 'जमना लाल', rel: 'father', house: '33', age: 25, gender: 'M' },
  { serial: 48, epic: 'RJ/20/152/082012', name: 'धर्मचन्द', guardian: 'भँवरलाल', rel: 'father', house: '34', age: 65, gender: 'M' },

  // Page 5
  { serial: 49, epic: 'RJ/20/152/082013', name: 'सन्तोषी', guardian: 'धर्मचन्द', rel: 'husband', house: '34', age: 61, gender: 'F' },
  { serial: 50, epic: 'SNE0795997', name: 'पारसलाल', guardian: 'धर्मलाल', rel: 'father', house: '34', age: 32, gender: 'M' },
  { serial: 51, epic: 'SNE0891994', name: 'सोनू', guardian: 'पारस', rel: 'father', house: '34', age: 31, gender: 'M' },
  { serial: 52, epic: 'SNE1715325', name: 'नारायण लाल', guardian: 'धर्म लाल', rel: 'father', house: '34', age: 23, gender: 'M' },
  { serial: 53, epic: 'SNE1715622', name: 'शंकर', guardian: 'धर्म लाल', rel: 'father', house: '34', age: 20, gender: 'M' },
  { serial: 54, epic: 'RJ/20/152/081233', name: 'भीमसिंह', guardian: 'गुलाबसिंह', rel: 'father', house: '35', age: 63, gender: 'M' },
  { serial: 55, epic: 'RJ/20/152/081078', name: 'पवनकंवर', guardian: 'भीमसिंह', rel: 'husband', house: '35', age: 61, gender: 'F' },
  { serial: 56, epic: 'SNE0048090', name: 'लक्ष्मण सिंह', guardian: 'भीम सिंह', rel: 'father', house: '35', age: 39, gender: 'M' },
  { serial: 57, epic: 'SNE0602219', name: 'सरोज कंवर', guardian: 'लक्ष्मण सिंह', rel: 'husband', house: '35', age: 32, gender: 'F' },
  { serial: 58, epic: 'SNE1669449', name: 'शोभा', guardian: 'भीम सिंह', rel: 'father', house: '35', age: 20, gender: 'F' },
  { serial: 60, epic: 'RJ/20/152/081077', name: 'दरीयवकंवर', guardian: 'देवीसिंह', rel: 'husband', house: '36', age: 57, gender: 'F' },
  { serial: 61, epic: 'KDY1125764', name: 'गोपालसिंह', guardian: 'शम्भूसिंह', rel: 'father', house: '36', age: 55, gender: 'M' },
  { serial: 62, epic: 'RJ/20/152/082008', name: 'धनसिंह', guardian: 'शम्भूसिंह', rel: 'father', house: '36', age: 53, gender: 'M' },
  { serial: 63, epic: 'KDY1125772', name: 'पूर्णिमा कंवर', guardian: 'गोपालसिंह', rel: 'husband', house: '36', age: 53, gender: 'F' },
  { serial: 64, epic: 'KDY0976670', name: 'मायाकंवर', guardian: 'धनसिंह', rel: 'husband', house: '36', age: 51, gender: 'F' },
  { serial: 65, epic: 'SNE0072439', name: 'नाहरसिंह', guardian: 'शम्भू सिंह', rel: 'father', house: '36', age: 47, gender: 'M' },
  { serial: 66, epic: 'SNE0072488', name: 'टमा कंवर', guardian: 'नाहर सिंह', rel: 'husband', house: '36', age: 46, gender: 'F' },
  { serial: 67, epic: 'SNE0072504', name: 'हरि सिंह', guardian: 'शम्भू सिंह', rel: 'father', house: '36', age: 45, gender: 'M' },
  { serial: 68, epic: 'SNE0072405', name: 'माधु सिंह', guardian: 'शम्भू सिंह', rel: 'father', house: '36', age: 43, gender: 'M' },
  { serial: 69, epic: 'SNE0072496', name: 'सुन्दरकंवर', guardian: 'हरिसिंह', rel: 'husband', house: '36', age: 43, gender: 'F' },
  { serial: 70, epic: 'SNE1016195', name: 'युगराज', guardian: 'धन सिंह', rel: 'father', house: '36', age: 27, gender: 'M' },
  { serial: 71, epic: 'SNE1243575', name: 'नरेंद्र', guardian: 'गोपाल सिंह', rel: 'father', house: '36', age: 26, gender: 'M' },
  { serial: 72, epic: 'SNE1016187', name: 'देवेंद्र सिंह', guardian: 'धन सिंह', rel: 'father', house: '36', age: 26, gender: 'M' },
  { serial: 73, epic: 'RJ/20/152/081107', name: 'दारूबाई', guardian: 'मांगीलाल', rel: 'husband', house: '37', age: 75, gender: 'F' },
  { serial: 74, epic: 'SNE1424464', name: 'आशा कंवर', guardian: 'बबलू सिंह', rel: 'husband', house: '89', age: 25, gender: 'F' },
  { serial: 75, epic: 'SNE1243583', name: 'कांता', guardian: 'सुखलाल', rel: 'husband', house: '98', age: 26, gender: 'F' },

  // Page 6
  { serial: 76, epic: 'SNE1828292', name: 'भावना कंवर', guardian: 'हरि सिंह', rel: 'father', house: '36', age: 19, gender: 'F' },
  { serial: 77, epic: 'SNE1811934', name: 'विक्रम सिंह', guardian: 'नाहर सिंह', rel: 'father', house: '36', age: 22, gender: 'M' },
  { serial: 78, epic: 'SNE1886258', name: 'प्रवीण सिंह', guardian: 'हरि सिंह', rel: 'father', house: '36', age: 20, gender: 'M' },
  { serial: 79, epic: 'SNE1886340', name: 'मनीषा कंवर', guardian: 'नाहर सिंह', rel: 'father', house: '36', age: 19, gender: 'F' },
  { serial: 80, epic: 'SNE0102798', name: 'धर्मचन्द', guardian: 'मांगीलाल', rel: 'father', house: '37', age: 55, gender: 'M' },
  { serial: 81, epic: 'KDY0976696', name: 'जशोदा बाई', guardian: 'धर्मी चन्द', rel: 'husband', house: '37', age: 51, gender: 'F' },
  { serial: 82, epic: 'SNE0981191', name: 'मीना देवी', guardian: 'धनराज', rel: 'husband', house: '37', age: 31, gender: 'F' },
  { serial: 83, epic: 'SNE0892000', name: 'प्रकाश', guardian: 'धर्मा', rel: 'father', house: '37', age: 29, gender: 'M' },
  { serial: 84, epic: 'SNE1593615', name: 'राधेश्याम', guardian: 'धर्म लाल', rel: 'father', house: '37', age: 22, gender: 'M' },
  { serial: 85, epic: 'SNE0236612', name: 'पपूरी', guardian: 'प्रेमनाथ', rel: 'husband', house: '39', age: 47, gender: 'F' },
  { serial: 86, epic: 'SNE1128172', name: 'मीना', guardian: 'विनोद', rel: 'husband', house: '39', age: 26, gender: 'F' },
  { serial: 87, epic: 'SNE1016229', name: 'विनोद', guardian: 'प्रेम', rel: 'father', house: '39', age: 26, gender: 'M' },
  { serial: 88, epic: 'SNE0143602', name: 'धन्नारावल', guardian: 'बेणाराम', rel: 'father', house: '42', age: 53, gender: 'M' },
  { serial: 89, epic: 'SNE0728857', name: 'मीरा', guardian: 'धन्ना', rel: 'husband', house: '42', age: 37, gender: 'F' },
  { serial: 90, epic: 'SNE0728865', name: 'प्रहलाद', guardian: 'धन्ना', rel: 'father', house: '42', age: 31, gender: 'M' },
  { serial: 91, epic: 'SNE0820308', name: 'राजू सिंह', guardian: 'सज्जन सिंह', rel: 'father', house: '42', age: 31, gender: 'M' },
  { serial: 92, epic: 'SNE1614205', name: 'विमला', guardian: 'प्रहलाद', rel: 'husband', house: '42', age: 23, gender: 'F' },
  { serial: 93, epic: 'RJ/20/152/082045', name: 'सज्जनसिंह', guardian: 'चतरसिंह', rel: 'father', house: '43', age: 71, gender: 'M' },
  { serial: 94, epic: 'RJ/20/152/081074', name: 'उच्छबकंवर', guardian: 'सज्जनसिंह', rel: 'husband', house: '43', age: 69, gender: 'F' },
  { serial: 95, epic: 'SNE0072579', name: 'शिवसिंह', guardian: 'सज्जन सिंह', rel: 'father', house: '43', age: 39, gender: 'M' },
  { serial: 96, epic: 'SNE0820282', name: 'लीना कंवर', guardian: 'शिव सिंह', rel: 'husband', house: '43', age: 32, gender: 'F' },

  // Page 7
  { serial: 97, epic: 'SNE0820290', name: 'गोटू सिंह', guardian: 'सज्जन सिंह', rel: 'father', house: '43', age: 30, gender: 'M' },
  { serial: 98, epic: 'SNE1243443', name: 'कृष्णा कंवर', guardian: 'गोटू सिंह', rel: 'husband', house: '43', age: 26, gender: 'F' },
  { serial: 99, epic: 'RJ/20/152/081016', name: 'जेठूरावल', guardian: 'रामटीला रावल', rel: 'father', house: '51', age: 69, gender: 'M' },
  { serial: 100, epic: 'RJ/20/152/081241', name: 'शंकरीबाई', guardian: 'जेठूरावल', rel: 'husband', house: '51', age: 67, gender: 'F' },
  { serial: 101, epic: 'SNE0602284', name: 'भीमा', guardian: 'जेठू', rel: 'father', house: '51', age: 36, gender: 'M' },
  { serial: 102, epic: 'SNE0602268', name: 'नाराणी', guardian: 'भीमा', rel: 'husband', house: '51', age: 32, gender: 'F' },
  { serial: 103, epic: 'SNE0602276', name: 'मीरा', guardian: 'धर्मा', rel: 'husband', house: '51', age: 32, gender: 'F' },
  { serial: 104, epic: 'SNE0986711', name: 'मिठू रावल', guardian: 'जेठू', rel: 'father', house: '51', age: 26, gender: 'M' },
  { serial: 105, epic: 'SNE1227693', name: 'सेला रावल', guardian: 'मिठू रावल', rel: 'husband', house: '51', age: 26, gender: 'F' },
  { serial: 106, epic: 'SNE1243484', name: 'पप्पू', guardian: 'सुवा', rel: 'father', house: '70', age: 25, gender: 'M' },
  { serial: 107, epic: 'SNE1688696', name: 'सुगना', guardian: 'पप्पू रावल', rel: 'husband', house: '70', age: 25, gender: 'F' },
  { serial: 108, epic: 'SNE1387364', name: 'गजेंद्र सिंह', guardian: 'गोकुल सिंह', rel: 'father', house: '89', age: 24, gender: 'M' },
  { serial: 109, epic: 'SNE1406131', name: 'मिठू लाल', guardian: 'मोहन लाल', rel: 'father', house: '98', age: 24, gender: 'M' },
  { serial: 110, epic: 'SNE1731058', name: 'श्याम लाल लोहार', guardian: 'लादू लाल लोहार', rel: 'father', house: 'रायपुर रोड', age: 20, gender: 'M' },
  { serial: 111, epic: 'SNE0820407', name: 'मदन लाल', guardian: 'लच्छीराम', rel: 'father', house: '33', age: 31, gender: 'M' },
  { serial: 112, epic: 'SNE1715796', name: 'कंचन कुमारी', guardian: 'मदन लुहार', rel: 'husband', house: '33', age: 29, gender: 'F' },
  { serial: 113, epic: 'RJ/20/152/081117', name: 'सोहनलाल', guardian: 'कालूराम', rel: 'father', house: '53', age: 85, gender: 'M' },
  { serial: 114, epic: 'RJ/20/152/081213', name: 'केशीबाई', guardian: 'सोहनलाल', rel: 'husband', house: '53', age: 83, gender: 'F' },
  { serial: 115, epic: 'RJ/20/152/081273', name: 'लादीबाई', guardian: 'खेमाराम', rel: 'husband', house: '53', age: 61, gender: 'F' },
  { serial: 116, epic: 'RJ/20/152/081118', name: 'डालूराम', guardian: 'सोहनलाल', rel: 'father', house: '53', age: 57, gender: 'M' },
  { serial: 117, epic: 'KDY1260454', name: 'गंगा बाई', guardian: 'डालू राम', rel: 'husband', house: '53', age: 48, gender: 'F' },
  { serial: 118, epic: 'KDY1125814', name: 'शंकर लाल', guardian: 'नेहरू लाल', rel: 'father', house: '53', age: 43, gender: 'M' },
  { serial: 119, epic: 'KDY1347327', name: 'माधु लाल', guardian: 'नेहरू लाल', rel: 'father', house: '53', age: 41, gender: 'M' },
  { serial: 120, epic: 'KDY1125822', name: 'प्रेम बाई', guardian: 'शंकर लाल', rel: 'husband', house: '53', age: 41, gender: 'F' },
  { serial: 121, epic: 'SNE0399147', name: 'पारस लाल', guardian: 'सोहनलाल', rel: 'father', house: '53', age: 37, gender: 'M' },
  { serial: 128, epic: 'RJ/20/152/081010', name: 'फतहलाल', guardian: 'दौलतराम', rel: 'father', house: '54', age: 55, gender: 'M' },
  { serial: 137, epic: 'RJ/20/152/081000', name: 'रामनाथ', guardian: 'नन्दनाथ', rel: 'father', house: '64', age: 75, gender: 'M' },
  { serial: 140, epic: 'SNE0285437', name: 'बाबूनाथ', guardian: 'रामनाथ', rel: 'father', house: '64', age: 39, gender: 'M' },
  { serial: 144, epic: 'RJ/20/152/081292', name: 'रूकमाणी', guardian: 'सुवा रावल', rel: 'husband', house: '70', age: 73, gender: 'F' },
  { serial: 145, epic: 'SNE0220640', name: 'बंशी', guardian: 'सुवा रावल', rel: 'father', house: '70', age: 34, gender: 'M' },
  { serial: 151, epic: 'RJ/20/152/081149', name: 'प्यारचन्द्र', guardian: 'गिरधारीलाल', rel: 'father', house: '83', age: 71, gender: 'M' },
  { serial: 154, epic: 'KDY0976605', name: 'बरजुबाई', guardian: 'प्रेमलाल', rel: 'husband', house: '84', age: 61, gender: 'F' },
  { serial: 161, epic: 'KDY1260546', name: 'दिनेश', guardian: 'सुवानाथ', rel: 'father', house: '85', age: 41, gender: 'M' },
  { serial: 170, epic: 'SNE0143636', name: 'जेठूसिंह', guardian: 'पदमसिंह', rel: 'father', house: '86', age: 55, gender: 'M' },
  { serial: 176, epic: 'KDY1347335', name: 'हीरालाल', guardian: 'नथूलाल', rel: 'father', house: '87', age: 55, gender: 'M' },
  { serial: 184, epic: 'SNE1440445', name: 'भंवरसिंह', guardian: 'बदलसिंह', rel: 'father', house: '89', age: 69, gender: 'M' },
  { serial: 189, epic: 'SNE1440536', name: 'कालू सिंह', guardian: 'माधु सिंह', rel: 'father', house: '89', age: 65, gender: 'M' },
  { serial: 192, epic: 'SNE1440577', name: 'अभय सिंह', guardian: 'गुलाब सिंह', rel: 'father', house: '89', age: 63, gender: 'M' },
  { serial: 195, epic: 'SNE1440593', name: 'जीवन सिंह', guardian: 'उदय सिंह', rel: 'father', house: '89', age: 59, gender: 'M' },
  { serial: 198, epic: 'SNE1440601', name: 'नरपत सिंह', guardian: 'उदय सिंह', rel: 'father', house: '89', age: 57, gender: 'M' },
  { serial: 201, epic: 'SNE1440486', name: 'मान सिंह', guardian: 'जेठू सिंह', rel: 'father', house: '89', age: 53, gender: 'M' },
  { serial: 214, epic: 'SNE0236406', name: 'जगदीश सिंह', guardian: 'गोरधन सिंह', rel: 'father', house: '89', age: 42, gender: 'M' },
  { serial: 246, epic: 'KDY1125871', name: 'जब्बर सिंह', guardian: 'अमर सिंह', rel: 'father', house: '91', age: 59, gender: 'M' },
  { serial: 248, epic: 'SNE1440510', name: 'रेवत सिंह', guardian: 'अमर सिंह', rel: 'father', house: '91', age: 53, gender: 'M' },
  { serial: 251, epic: 'SNE0047704', name: 'अर्जुन सिंह', guardian: 'अमर सिंह', rel: 'father', house: '91', age: 41, gender: 'M' },
  { serial: 254, epic: 'RJ/20/152/081153', name: 'ईश्वर सिंह', guardian: 'नाहर सिंह', rel: 'father', house: '92', age: 69, gender: 'M' },
  { serial: 263, epic: 'RJ/20/152/081510', name: 'जीवन सिंह', guardian: 'अचल सिंह', rel: 'father', house: '94', age: 61, gender: 'M' },
  { serial: 274, epic: 'KDY1347277', name: 'बंशी लाल', guardian: 'त्रिलोक', rel: 'father', house: '95', age: 41, gender: 'M' },
  { serial: 276, epic: 'RJ/20/152/081312', name: 'दोलाराम', guardian: 'हरलाल', rel: 'father', house: '96', age: 67, gender: 'M' },
  { serial: 277, epic: 'RJ/20/152/081242', name: 'तिलोक', guardian: 'जालम', rel: 'father', house: '96', age: 63, gender: 'M' },
  { serial: 278, epic: 'RJ/20/152/081260', name: 'उदयराम', guardian: 'जालमराम', rel: 'father', house: '96', age: 59, gender: 'M' },
  { serial: 283, epic: 'SNE0460840', name: 'किशन लाल', guardian: 'त्रिलोक', rel: 'father', house: '96', age: 31, gender: 'M' },
  { serial: 293, epic: 'RJ/20/152/081310', name: 'मोहनलाल', guardian: 'गोमाराम', rel: 'father', house: '98', age: 59, gender: 'M' },
  { serial: 300, epic: 'RJ/20/152/081058', name: 'प्रेम सिंह', guardian: 'गोपाल सिंह', rel: 'father', house: '101', age: 59, gender: 'M' },
  { serial: 308, epic: 'RJ/20/152/082050', name: 'छीतरलाल', guardian: 'छोगालाल', rel: 'father', house: '103', age: 55, gender: 'M' },
  { serial: 313, epic: 'RJ/20/152/081511', name: 'गोरधनसिंह', guardian: 'गोपालसिंह', rel: 'father', house: '105', age: 73, gender: 'M' },
  { serial: 315, epic: 'KDY0977025', name: 'बखतावरसिंह', guardian: 'गोपालसिंह', rel: 'father', house: '105', age: 55, gender: 'M' },
  { serial: 317, epic: 'SNE0460915', name: 'भगवान सिंह', guardian: 'गोवर्धन सिंह', rel: 'father', house: '105', age: 33, gender: 'M' },
  { serial: 319, epic: 'SNE1593813', name: 'चंद्रा भान सिंह', guardian: 'बख्तवार सिंह', rel: 'father', house: '105', age: 22, gender: 'M' },
  { serial: 321, epic: 'SNE1861426', name: 'पिंकी कंवर राजपूत', guardian: 'सुमेर सिंह', rel: 'husband', house: '93', age: 24, gender: 'F' }
];

async function run() {
  await mongoose.connect('mongodb://187.127.173.42:27017/political_crm');
  console.log('Connected to MongoDB');

  const gpName = 'पीथाकाखेड़ा';
  const wardNumber = '1';
  const villageName = 'लड़की';

  let matchedCount = 0;
  let createdCount = 0;

  for (const v of rawVoters) {
    const cleanEpic = v.epic.trim();

    // Search by EPIC in entire database or GP
    let member = await Member.findOne({ voterId: cleanEpic });

    if (!member) {
      const nameRegex = new RegExp(`^${v.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
      member = await Member.findOne({
        name: nameRegex,
        $or: [
          { village: /लड़की/i },
          { gramPanchayat: /पीथा/i }
        ]
      });
    }

    if (member) {
      const res = await Member.updateOne(
        { _id: member._id },
        {
          $set: {
            wardNumber: wardNumber,
            gramPanchayat: gpName,
            village: villageName,
            hasMunicipalMembership: true,
          },
          $addToSet: {
            municipalWardNumbers: wardNumber
          }
        }
      );
      matchedCount++;
      console.log(`✅ [MATCHED] ${v.serial}. ${v.name} (EPIC: ${cleanEpic}) -> Updated in Ward 1!`);
    } else {
      await Member.create({
        voterId: cleanEpic,
        name: v.name,
        guardianName: v.guardian,
        relationType: v.rel,
        houseNumber: v.house,
        age: v.age,
        gender: v.gender,
        gramPanchayat: gpName,
        village: villageName,
        tehsil: 'रायपुर',
        wardNumber: wardNumber,
        hasAssemblyMembership: true,
        hasMunicipalMembership: true,
        municipalWardNumbers: [wardNumber],
        contactType: 'voter',
        verificationStatus: 'verified'
      });
      createdCount++;
      console.log(`🆕 [CREATED] ${v.serial}. ${v.name} (EPIC: ${cleanEpic}) -> Created in Ward 1!`);
    }
  }

  console.log('\n========================================================================');
  console.log(`📊 WARD 1 IMPORT SUMMARY:`);
  console.log(`• Total Voters in Batch:  ${rawVoters.length}`);
  console.log(`• Successfully Matched:   ${matchedCount} (${((matchedCount/rawVoters.length)*100).toFixed(1)}%)`);
  console.log(`• Newly Created in Ward:  ${createdCount}`);
  console.log('========================================================================\n');

  // Verify in MongoDB
  const inDb = await Member.countDocuments({
    gramPanchayat: /पीथा/i,
    $or: [
      { wardNumber: '1' },
      { municipalWardNumbers: '1' }
    ]
  });
  console.log(`👥 Total Voters in DB for GP "${gpName}" Ward 1: ${inDb}`);

  process.exit(0);
}

run().catch(console.error);
