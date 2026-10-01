const mongoose = require('mongoose');

// Full list of voters from Page 3 to Page 17 (Serials 1 to 329)
const ward1Voters = [
  // Page 3
  { serial: 1, epic: 'SNE1307719', name: 'बबलू सिंह', guardian: 'जीतू सिंह', rel: 'father', house: '0', age: 25, gender: 'M', section: 'लड़की' },
  { serial: 2, epic: 'RJ/20/152/081045', name: 'सन्तोषी', guardian: 'गोपीलाल', rel: 'husband', house: '11', age: 73, gender: 'F', section: 'लड़की' },
  { serial: 3, epic: 'KDY1260397', name: 'अम्बू बाई', guardian: 'मांगी लाल', rel: 'husband', house: '11', age: 63, gender: 'F', section: 'लड़की' },
  { serial: 4, epic: 'RJ/20/152/081218', name: 'सुरेशकुमार', guardian: 'गोपीलाल', rel: 'father', house: '11', age: 51, gender: 'M', section: 'लड़की' },
  { serial: 5, epic: 'KDY1260389', name: 'मीठू बाई', guardian: 'सुरेश कुमार', rel: 'husband', house: '11', age: 49, gender: 'F', section: 'लड़की' },
  { serial: 6, epic: 'SNE0399055', name: 'सुवा लाल', guardian: 'गोपीलाल', rel: 'father', house: '11', age: 40, gender: 'M', section: 'लड़की' },
  { serial: 7, epic: 'SNE0399063', name: 'प्रेमी', guardian: 'सुवा', rel: 'husband', house: '11', age: 36, gender: 'F', section: 'लड़की' },
  { serial: 8, epic: 'SNE0820225', name: 'पहलाद', guardian: 'गोपी', rel: 'father', house: '11', age: 33, gender: 'M', section: 'लड़की' },
  { serial: 9, epic: 'SNE0820233', name: 'कान्ता', guardian: 'प्रहलाद', rel: 'husband', house: '11', age: 31, gender: 'F', section: 'लड़की' },
  { serial: 10, epic: 'SNE1711993', name: 'श्याम लाल', guardian: 'सुरेश', rel: 'father', house: '11', age: 21, gender: 'M', section: 'लड़की' },
  { serial: 11, epic: 'RJ/20/152/081216', name: 'चमनसिंह', guardian: 'उदयसिंह', rel: 'father', house: '15', age: 65, gender: 'M', section: 'लड़की' },
  { serial: 12, epic: 'RJ/20/152/081127', name: 'गणेशकंवर', guardian: 'चमनसिंह', rel: 'husband', house: '15', age: 63, gender: 'F', section: 'लड़की' },
  { serial: 13, epic: 'SNE0236604', name: 'बरजू', guardian: 'नेनुनाथ', rel: 'husband', house: '16', age: 66, gender: 'F', section: 'लड़की' },
  { serial: 14, epic: 'RJ/20/152/082058', name: 'भँवरलाल', guardian: 'देवाराम', rel: 'father', house: '16', age: 61, gender: 'M', section: 'लड़की' },
  { serial: 15, epic: 'RJ/20/152/082057', name: 'रेवतनाथ', guardian: 'प्रेमनाथ', rel: 'father', house: '16', age: 55, gender: 'M', section: 'लड़की' },
  { serial: 16, epic: 'RJ/20/152/081176', name: 'अणछीबाई', guardian: 'रेवतनाथ', rel: 'husband', house: '16', age: 53, gender: 'F', section: 'लड़की' },
  { serial: 17, epic: 'SNE1620798', name: 'लादू', guardian: 'गोपी', rel: 'father', house: '16', age: 51, gender: 'M', section: 'लड़की' },
  { serial: 18, epic: 'KDY1260405', name: 'सुगनी बाई', guardian: 'लादू नाथ', rel: 'husband', house: '16', age: 45, gender: 'F', section: 'लड़की' },
  { serial: 19, epic: 'SNE0602151', name: 'गोवर्धन', guardian: 'भँवर', rel: 'father', house: '16', age: 39, gender: 'M', section: 'लड़की' },
  { serial: 20, epic: 'SNE0545012', name: 'पप्पू', guardian: 'भँवर', rel: 'father', house: '16', age: 35, gender: 'M', section: 'लड़की' },
  { serial: 21, epic: 'SNE0602177', name: 'प्रेम', guardian: 'भँवर', rel: 'father', house: '16', age: 35, gender: 'M', section: 'लड़की' },
  { serial: 22, epic: 'SNE0602169', name: 'तारा', guardian: 'गोवर्धन', rel: 'husband', house: '16', age: 34, gender: 'F', section: 'लड़की' },
  { serial: 23, epic: 'SNE0782698', name: 'प्रतापी बाई', guardian: 'पप्पू', rel: 'husband', house: '16', age: 32, gender: 'F', section: 'लड़की' },
  { serial: 24, epic: 'SNE0891978', name: 'कैलाश', guardian: 'नेनूराम', rel: 'father', house: '16', age: 31, gender: 'M', section: 'लड़की' },

  // Page 4
  { serial: 25, epic: 'SNE0602185', name: 'दुर्गा', guardian: 'प्रेम', rel: 'husband', house: '16', age: 30, gender: 'F', section: 'लड़की' },
  { serial: 26, epic: 'SNE1587310', name: 'पिंटू नाथ', guardian: 'रेवत नाथ', rel: 'father', house: '16', age: 24, gender: 'M', section: 'लड़की' },
  { serial: 27, epic: 'SNE1593565', name: 'कमलेश', guardian: 'लाडू', rel: 'father', house: '16', age: 23, gender: 'M', section: 'लड़की' },
  { serial: 28, epic: 'SNE1796457', name: 'मेघा रावल', guardian: 'लाडू', rel: 'father', house: '16', age: 21, gender: 'F', section: 'लड़की' },
  { serial: 29, epic: 'SNE1649029', name: 'परमेश्वर', guardian: 'उदय राम', rel: 'father', house: '33', age: 21, gender: 'M', section: 'लड़की' },
  { serial: 30, epic: 'SNE0514281', name: 'भवानी सिंह', guardian: 'बगतावर सिंह', rel: 'father', house: '105', age: 32, gender: 'M', section: 'लड़की' },
  { serial: 31, epic: 'SNE1307750', name: 'नारायण सिंह', guardian: 'सज्जन सिंह', rel: 'father', house: '-', age: 29, gender: 'M', section: 'लड़की', isDeleted: true },
  { serial: 32, epic: 'SNE1307735', name: 'महेंद्र सिंह', guardian: 'सज्जन सिंह', rel: 'father', house: '-', age: 25, gender: 'M', section: 'लड़की' },
  { serial: 33, epic: 'SNE1829480', name: 'महिपाल सोलंकी', guardian: 'गोकुल सिंह', rel: 'father', house: 'भाणुजा', age: 19, gender: 'M', section: 'लड़की' },
  { serial: 34, epic: 'KDY0976613', name: 'बालूराम', guardian: 'बदीचन्द', rel: 'father', house: '32', age: 51, gender: 'M', section: 'बड़ का चौक, लड़की' },
  { serial: 35, epic: 'KDY0976647', name: 'देऊ बाई', guardian: 'बालू राम', rel: 'husband', house: '32', age: 48, gender: 'F', section: 'बड़ का चौक, लड़की' },
  { serial: 36, epic: 'RJ/20/152/081023', name: 'प्रताबी', guardian: 'नेनूराम', rel: 'husband', house: '33', age: 87, gender: 'F', section: 'बड़ का चौक, लड़की' },
  { serial: 37, epic: 'RJ/20/152/082014', name: 'जमनालाल', guardian: 'नेनूराम', rel: 'father', house: '33', age: 55, gender: 'M', section: 'बड़ का चौक, लड़की' },
  { serial: 38, epic: 'RJ/20/152/082015', name: 'सन्तोषी', guardian: 'जमनालाल', rel: 'husband', house: '33', age: 53, gender: 'F', section: 'बड़ का चौक, लड़की' },
  { serial: 39, epic: 'KDY0976662', name: 'उदेराम', guardian: 'लच्छीराम', rel: 'father', house: '33', age: 46, gender: 'M', section: 'बड़ का चौक, लड़की' },
  { serial: 40, epic: 'SNE0782722', name: 'सीताबाई', guardian: 'उदयराम', rel: 'husband', house: '33', age: 37, gender: 'F', section: 'बड़ का चौक, लड़की' },
  { serial: 41, epic: 'SNE0795989', name: 'कैलाशलाल', guardian: 'जमनालाल', rel: 'father', house: '33', age: 35, gender: 'M', section: 'बड़ का चौक, लड़की' },
  { serial: 42, epic: 'SNE0545020', name: 'नारायणलाल', guardian: 'लच्छीराम', rel: 'father', house: '33', age: 33, gender: 'M', section: 'बड़ का चौक, लड़की' },
  { serial: 43, epic: 'SNE0981183', name: 'सीमा देवी', guardian: 'कैलाश लाल', rel: 'husband', house: '33', age: 32, gender: 'F', section: 'बड़ का चौक, लड़की' },
  { serial: 44, epic: 'SNE1406149', name: 'संतोष देवी', guardian: 'नारायण लाल', rel: 'husband', house: '33', age: 30, gender: 'F', section: 'बड़ का चौक, लड़की' },
  { serial: 45, epic: 'SNE0820258', name: 'महेन्द्र', guardian: 'जमनालाल', rel: 'father', house: '33', age: 29, gender: 'M', section: 'बड़ का चौक, लड़की' },
  { serial: 46, epic: 'SNE1243468', name: 'माया', guardian: 'महेंद्र सिंह', rel: 'husband', house: '33', age: 26, gender: 'F', section: 'बड़ का चौक, लड़की' },
  { serial: 47, epic: 'SNE1243450', name: 'बाबू', guardian: 'जमना लाल', rel: 'father', house: '33', age: 25, gender: 'M', section: 'बड़ का चौक, लड़की' },
  { serial: 48, epic: 'RJ/20/152/082012', name: 'धर्मचन्द', guardian: 'भँवरलाल', rel: 'father', house: '34', age: 65, gender: 'M', section: 'बड़ का चौक, लड़की' },

  // Page 5
  { serial: 49, epic: 'RJ/20/152/082013', name: 'सन्तोषी', guardian: 'धर्मचन्द', rel: 'husband', house: '34', age: 61, gender: 'F', section: 'बड़ का चौक, लड़की' },
  { serial: 50, epic: 'SNE0795997', name: 'पारसलाल', guardian: 'धर्मीलाल', rel: 'father', house: '34', age: 32, gender: 'M', section: 'बड़ का चौक, लड़की' },
  { serial: 51, epic: 'SNE0891994', name: 'सोनू', guardian: 'पारस', rel: 'father', house: '34', age: 31, gender: 'M', section: 'बड़ का चौक, लड़की' },
  { serial: 52, epic: 'SNE1715325', name: 'नारायण लाल', guardian: 'धर्म लाल', rel: 'father', house: '34', age: 23, gender: 'M', section: 'बड़ का चौक, लड़की' },
  { serial: 53, epic: 'SNE1715622', name: 'शंकर', guardian: 'धर्म लाल', rel: 'father', house: '34', age: 20, gender: 'M', section: 'बड़ का चौक, लड़की' },
  { serial: 54, epic: 'RJ/20/152/081233', name: 'भीमसिंह', guardian: 'गुलाबसिंह', rel: 'father', house: '35', age: 63, gender: 'M', section: 'बड़ का चौक, लड़की' },
  { serial: 55, epic: 'RJ/20/152/081078', name: 'पवनकंवर', guardian: 'भीमसिंह', rel: 'husband', house: '35', age: 61, gender: 'F', section: 'बड़ का चौक, लड़की' },
  { serial: 56, epic: 'SNE0048090', name: 'लक्ष्मण सिंह', guardian: 'भीम सिंह', rel: 'father', house: '35', age: 39, gender: 'M', section: 'बड़ का चौक, लड़की' },
  { serial: 57, epic: 'SNE0602219', name: 'सरोज कंवर', guardian: 'लक्ष्मण सिंह', rel: 'husband', house: '35', age: 32, gender: 'F', section: 'बड़ का चौक, लड़की' },
  { serial: 58, epic: 'SNE1669449', name: 'शोभा', guardian: 'भीम सिंह', rel: 'father', house: '35', age: 20, gender: 'F', section: 'बड़ का चौक, लड़की' },
  { serial: 59, epic: 'SNE0399121', name: 'उदय कंवर', guardian: 'शंभू सिंह', rel: 'father', house: '36', age: 59, gender: 'F', section: 'बड़ का चौक, लड़की', isDeleted: true },
  { serial: 60, epic: 'RJ/20/152/081077', name: 'दरीयवकंवर', guardian: 'देवीसिंह', rel: 'husband', house: '36', age: 57, gender: 'F', section: 'बड़ का चौक, लड़की' },
  { serial: 61, epic: 'KDY1125764', name: 'गोपालसिंह', guardian: 'शम्भूसिंह', rel: 'father', house: '36', age: 55, gender: 'M', section: 'बड़ का चौक, लड़की' },
  { serial: 62, epic: 'RJ/20/152/082008', name: 'धनसिंह', guardian: 'शम्भूसिंह', rel: 'father', house: '36', age: 53, gender: 'M', section: 'बड़ का चौक, लड़की' },
  { serial: 63, epic: 'KDY1125772', name: 'पूर्णिमा कंवर', guardian: 'गोपालसिंह', rel: 'husband', house: '36', age: 53, gender: 'F', section: 'बड़ का चौक, लड़की' },
  { serial: 64, epic: 'KDY0976670', name: 'मायाकंवर', guardian: 'धनसिंह', rel: 'husband', house: '36', age: 51, gender: 'F', section: 'बड़ का चौक, लड़की' },
  { serial: 65, epic: 'SNE0072439', name: 'नाहरसिंह', guardian: 'शम्भू सिंह', rel: 'father', house: '36', age: 47, gender: 'M', section: 'बड़ का चौक, लड़की' },
  { serial: 66, epic: 'SNE0072488', name: 'टमा कंवर', guardian: 'नाहर सिंह', rel: 'husband', house: '36', age: 46, gender: 'F', section: 'बड़ का चौक, लड़की' },
  { serial: 67, epic: 'SNE0072504', name: 'हरि सिंह', guardian: 'शम्भू सिंह', rel: 'father', house: '36', age: 45, gender: 'M', section: 'बड़ का चौक, लड़की' },
  { serial: 68, epic: 'SNE0072405', name: 'माधु सिंह', guardian: 'शम्भू सिंह', rel: 'father', house: '36', age: 43, gender: 'M', section: 'बड़ का चौक, लड़की' },
  { serial: 69, epic: 'SNE0072496', name: 'सुन्दरकंवर', guardian: 'हरिसिंह', rel: 'husband', house: '36', age: 43, gender: 'F', section: 'बड़ का चौक, लड़की' },
  { serial: 70, epic: 'SNE1016195', name: 'युगराज', guardian: 'धन सिंह', rel: 'father', house: '36', age: 27, gender: 'M', section: 'बड़ का चौक, लड़की' },
  { serial: 71, epic: 'SNE1243575', name: 'नरेंद्र', guardian: 'गोपाल सिंह', rel: 'father', house: '36', age: 26, gender: 'M', section: 'बड़ का चौक, लड़की' },
  { serial: 72, epic: 'SNE1016187', name: 'देवेंद्र सिंह', guardian: 'धन सिंह', rel: 'father', house: '36', age: 26, gender: 'M', section: 'बड़ का चौक, लड़की' },
  { serial: 73, epic: 'RJ/20/152/081107', name: 'दारूबाई', guardian: 'मांगीलाल', rel: 'husband', house: '37', age: 75, gender: 'F', section: 'बड़ का चौक, लड़की' },
  { serial: 74, epic: 'SNE1424464', name: 'आशा कंवर', guardian: 'बबलू सिंह', rel: 'husband', house: '89', age: 25, gender: 'F', section: 'बड़ का चौक, लड़की' },
  { serial: 75, epic: 'SNE1243583', name: 'कांता', guardian: 'सुखलाल', rel: 'husband', house: '98', age: 26, gender: 'F', section: 'बड़ का चौक, लड़की' },

  // Page 6
  { serial: 76, epic: 'SNE1828292', name: 'भावना कंवर', guardian: 'हरि सिंह', rel: 'father', house: '36', age: 19, gender: 'F', section: 'विद्यालय के पास, लड़की' },
  { serial: 77, epic: 'SNE1811934', name: 'विक्रम सिंह', guardian: 'नाहर सिंह', rel: 'father', house: '36', age: 22, gender: 'M', section: 'विद्यालय के पास, लड़की' },
  { serial: 78, epic: 'SNE1886258', name: 'प्रवीण सिंह', guardian: 'हरि सिंह', rel: 'father', house: '36', age: 20, gender: 'M', section: 'विद्यालय के पास, लड़की' },
  { serial: 79, epic: 'SNE1886340', name: 'मनीषा कंवर', guardian: 'नाहर सिंह', rel: 'father', house: '36', age: 19, gender: 'F', section: 'विद्यालय के पास, लड़की' },
  { serial: 80, epic: 'SNE0102798', name: 'धर्मचन्द', guardian: 'मांगीलाल', rel: 'father', house: '37', age: 55, gender: 'M', section: 'विद्यालय के पास, लड़की' },
  { serial: 81, epic: 'KDY0976696', name: 'जशोदा बाई', guardian: 'धर्मी चन्द', rel: 'husband', house: '37', age: 51, gender: 'F', section: 'विद्यालय के पास, लड़की' },
  { serial: 82, epic: 'SNE0981191', name: 'मीना देवी', guardian: 'धनराज', rel: 'husband', house: '37', age: 31, gender: 'F', section: 'विद्यालय के पास, लड़की' },
  { serial: 83, epic: 'SNE0892000', name: 'प्रकाश', guardian: 'धर्मा', rel: 'father', house: '37', age: 29, gender: 'M', section: 'विद्यालय के पास, लड़की' },
  { serial: 84, epic: 'SNE1593615', name: 'राधेश्याम', guardian: 'धर्म लाल', rel: 'father', house: '37', age: 22, gender: 'M', section: 'विद्यालय के पास, लड़की' },
  { serial: 85, epic: 'SNE0236612', name: 'पपूरी', guardian: 'प्रेमनाथ', rel: 'husband', house: '39', age: 47, gender: 'F', section: 'विद्यालय के पास, लड़की' },
  { serial: 86, epic: 'SNE1128172', name: 'मीना', guardian: 'विनोद', rel: 'husband', house: '39', age: 26, gender: 'F', section: 'विद्यालय के पास, लड़की' },
  { serial: 87, epic: 'SNE1016229', name: 'विनोद', guardian: 'प्रेम', rel: 'father', house: '39', age: 26, gender: 'M', section: 'विद्यालय के पास, लड़की' },
  { serial: 88, epic: 'SNE0143602', name: 'धन्नारावल', guardian: 'बेणाराम', rel: 'father', house: '42', age: 53, gender: 'M', section: 'शिव जी का मंदिर, लड़की' },
  { serial: 89, epic: 'SNE0728857', name: 'मीरा', guardian: 'धन्ना', rel: 'husband', house: '42', age: 37, gender: 'F', section: 'शिव जी का मंदिर, लड़की' },
  { serial: 90, epic: 'SNE0728865', name: 'प्रहलाद', guardian: 'धन्ना', rel: 'father', house: '42', age: 31, gender: 'M', section: 'शिव जी का मंदिर, लड़की' },
  { serial: 91, epic: 'SNE0820308', name: 'राजू सिंह', guardian: 'सज्जन सिंह', rel: 'father', house: '42', age: 31, gender: 'M', section: 'शिव जी का मंदिर, लड़की' },
  { serial: 92, epic: 'SNE1614205', name: 'विमला', guardian: 'प्रहलाद', rel: 'husband', house: '42', age: 23, gender: 'F', section: 'शिव जी का मंदिर, लड़की' },
  { serial: 93, epic: 'RJ/20/152/082045', name: 'सज्जनसिंह', guardian: 'चतरसिंह', rel: 'father', house: '43', age: 71, gender: 'M', section: 'शिव जी का मंदिर, लड़की' },
  { serial: 94, epic: 'RJ/20/152/081074', name: 'उच्छबकंवर', guardian: 'सज्जनसिंह', rel: 'husband', house: '43', age: 69, gender: 'F', section: 'शिव जी का मंदिर, लड़की' },
  { serial: 95, epic: 'SNE0072579', name: 'शिवसिंह', guardian: 'सज्जन सिंह', rel: 'father', house: '43', age: 39, gender: 'M', section: 'शिव जी का मंदिर, लड़की' },
  { serial: 96, epic: 'SNE0820282', name: 'लीना कंवर', guardian: 'शिव सिंह', rel: 'husband', house: '43', age: 32, gender: 'F', section: 'शिव जी का मंदिर, लड़की' },

  // Page 7
  { serial: 97, epic: 'SNE0820290', name: 'गोटू सिंह', guardian: 'सज्जन सिंह', rel: 'father', house: '43', age: 30, gender: 'M', section: 'शिव जी का मंदिर, लड़की' },
  { serial: 98, epic: 'SNE1243443', name: 'कृष्णा कंवर', guardian: 'गोटू सिंह', rel: 'husband', house: '43', age: 26, gender: 'F', section: 'शिव जी का मंदिर, लड़की' },
  { serial: 99, epic: 'RJ/20/152/081016', name: 'जेठूरावल', guardian: 'रामटीला रावल', rel: 'father', house: '51', age: 69, gender: 'M', section: 'शिव जी का मंदिर, लड़की' },
  { serial: 100, epic: 'RJ/20/152/081241', name: 'शंकरीबाई', guardian: 'जेठूरावल', rel: 'husband', house: '51', age: 67, gender: 'F', section: 'शिव जी का मंदिर, लड़की' },
  { serial: 101, epic: 'SNE0602284', name: 'भीमा', guardian: 'जेठू', rel: 'father', house: '51', age: 36, gender: 'M', section: 'शिव जी का मंदिर, लड़की' },
  { serial: 102, epic: 'SNE0602268', name: 'नाराणी', guardian: 'भीमा', rel: 'husband', house: '51', age: 32, gender: 'F', section: 'शिव जी का मंदिर, लड़की' },
  { serial: 103, epic: 'SNE0602276', name: 'मीरा', guardian: 'धर्मा', rel: 'husband', house: '51', age: 32, gender: 'F', section: 'शिव जी का मंदिर, लड़की' },
  { serial: 104, epic: 'SNE0986711', name: 'मिठू रावल', guardian: 'जेठू', rel: 'father', house: '51', age: 26, gender: 'M', section: 'शिव जी का मंदिर, लड़की' },
  { serial: 105, epic: 'SNE1227693', name: 'सेला रावल', guardian: 'मिठू रावल', rel: 'husband', house: '51', age: 26, gender: 'F', section: 'शिव जी का मंदिर, लड़की' },
  { serial: 106, epic: 'SNE1243484', name: 'पप्पू', guardian: 'सुवा', rel: 'father', house: '70', age: 25, gender: 'M', section: 'शिव जी का मंदिर, लड़की' },
  { serial: 107, epic: 'SNE1688696', name: 'सुगना', guardian: 'पप्पू रावल', rel: 'husband', house: '70', age: 25, gender: 'F', section: 'शिव जी का मंदिर, लड़की' },
  { serial: 108, epic: 'SNE1387364', name: 'गजेंद्र सिंह', guardian: 'गोकुल सिंह', rel: 'father', house: '89', age: 24, gender: 'M', section: 'शिव जी का मंदिर, लड़की' },
  { serial: 109, epic: 'SNE1406131', name: 'मिठू लाल', guardian: 'मोहन लाल', rel: 'father', house: '98', age: 24, gender: 'M', section: 'शिव जी का मंदिर, लड़की' },
  { serial: 110, epic: 'SNE1731058', name: 'श्याम लाल लोहार', guardian: 'लादू लाल लोहार', rel: 'father', house: 'रायपुर रोड', age: 20, gender: 'M', section: 'शिव जी का मंदिर, लड़की' },
  { serial: 111, epic: 'SNE0820407', name: 'मदन लाल', guardian: 'लच्छीराम', rel: 'father', house: '33', age: 31, gender: 'M', section: 'रावला चौक, लड़की' },
  { serial: 112, epic: 'SNE1715796', name: 'कंचन कुमारी', guardian: 'मदन लुहार', rel: 'husband', house: '33', age: 29, gender: 'F', section: 'रावला चौक, लड़की' },
  { serial: 113, epic: 'RJ/20/152/081117', name: 'सोहनलाल', guardian: 'कालूराम', rel: 'father', house: '53', age: 85, gender: 'M', section: 'रावला चौक, लड़की' },
  { serial: 114, epic: 'RJ/20/152/081213', name: 'केशीबाई', guardian: 'सोहनलाल', rel: 'husband', house: '53', age: 83, gender: 'F', section: 'रावला चौक, लड़की' },
  { serial: 115, epic: 'RJ/20/152/081273', name: 'लादीबाई', guardian: 'खेमाराम', rel: 'husband', house: '53', age: 61, gender: 'F', section: 'रावला चौक, लड़की' },
  { serial: 116, epic: 'RJ/20/152/081118', name: 'डालूराम', guardian: 'सोहनलाल', rel: 'father', house: '53', age: 57, gender: 'M', section: 'रावला चौक, लड़की' },
  { serial: 117, epic: 'KDY1260454', name: 'गंगा बाई', guardian: 'डालू राम', rel: 'husband', house: '53', age: 48, gender: 'F', section: 'रावला चौक, लड़की' },
  { serial: 118, epic: 'KDY1125814', name: 'शंकर लाल', guardian: 'नेहरू लाल', rel: 'father', house: '53', age: 43, gender: 'M', section: 'रावला चौक, लड़की' },
  { serial: 119, epic: 'KDY1347327', name: 'माधु लाल', guardian: 'नेहरू लाल', rel: 'father', house: '53', age: 41, gender: 'M', section: 'रावला चौक, लड़की' },

  // Page 8
  { serial: 120, epic: 'KDY1125822', name: 'प्रेम बाई', guardian: 'शंकर लाल', rel: 'husband', house: '53', age: 41, gender: 'F', section: 'रावला चौक, लड़की' },
  { serial: 121, epic: 'SNE0399147', name: 'पारस लाल', guardian: 'सोहनलाल', rel: 'father', house: '53', age: 37, gender: 'M', section: 'रावला चौक, लड़की' },
  { serial: 122, epic: 'SNE0782730', name: 'कैलाशी', guardian: 'माधु लाल', rel: 'husband', house: '53', age: 37, gender: 'F', section: 'रावला चौक, लड़की' },
  { serial: 123, epic: 'SNE0602292', name: 'ख्याली लाल', guardian: 'खेमराज', rel: 'father', house: '53', age: 31, gender: 'M', section: 'रावला चौक, लड़की' },
  { serial: 124, epic: 'SNE1227727', name: 'भावना', guardian: 'ख्याली', rel: 'husband', house: '53', age: 26, gender: 'F', section: 'रावला चौक, लड़की' },
  { serial: 125, epic: 'SNE1227750', name: 'मुकेश', guardian: 'खेमराज', rel: 'father', house: '53', age: 26, gender: 'M', section: 'रावला चौक, लड़की' },
  { serial: 126, epic: 'SNE1227743', name: 'सीता', guardian: 'मुकेश', rel: 'husband', house: '53', age: 25, gender: 'F', section: 'रावला चौक, लड़की' },
  { serial: 127, epic: 'SNE1282946', name: 'रतनी', guardian: 'पारस', rel: 'husband', house: '53', age: 25, gender: 'F', section: 'रावला चौक, लड़की' },
  { serial: 128, epic: 'RJ/20/152/081010', name: 'फतहलाल', guardian: 'दौलतराम', rel: 'father', house: '54', age: 55, gender: 'M', section: 'रावला चौक, लड़की' },
  { serial: 129, epic: 'RJ/20/152/081050', name: 'इन्द्राबाई', guardian: 'फतहलाल', rel: 'husband', house: '54', age: 53, gender: 'F', section: 'रावला चौक, लड़की' },
  { serial: 130, epic: 'SNE1461052', name: 'कन्हैया लाल', guardian: 'फतह लाल', rel: 'father', house: '54', age: 26, gender: 'M', section: 'रावला चौक, लड़की' },
  { serial: 131, epic: 'SNE1659309', name: 'पायल', guardian: 'कन्हैया', rel: 'husband', house: '54', age: 24, gender: 'F', section: 'रावला चौक, लड़की' },
  { serial: 132, epic: 'SNE1659150', name: 'राहुल', guardian: 'फतह लाल', rel: 'father', house: '54', age: 21, gender: 'M', section: 'रावला चौक, लड़की' },
  { serial: 133, epic: 'SNE1870104', name: 'कैलाश देवी', guardian: 'कमलेश बैरवा', rel: 'husband', house: '53', age: 20, gender: 'F', section: 'रावला चौक, लड़की' },
  { serial: 134, epic: 'SNE1886324', name: 'राधा दात्या', guardian: 'राहुल दमामी', rel: 'husband', house: '54', age: 22, gender: 'F', section: 'रावला चौक, लड़की' },
  { serial: 135, epic: 'SNE0986778', name: 'सोनू', guardian: 'राजू', rel: 'husband', house: '42', age: 27, gender: 'F', section: 'शिव जी का मंदिर, लड़की' },
  { serial: 136, epic: 'SNE1128289', name: 'नारायण सिंह', guardian: 'सज्जन सिंह', rel: 'father', house: '43', age: 27, gender: 'M', section: 'शिव जी का मंदिर, लड़की' },
  { serial: 137, epic: 'RJ/20/152/081000', name: 'रामनाथ', guardian: 'नन्दनाथ', rel: 'father', house: '64', age: 75, gender: 'M', section: 'शिव जी का मंदिर, लड़की' },
  { serial: 138, epic: 'RJ/20/152/081024', name: 'पतासीबाई', guardian: 'रामनाथ', rel: 'husband', house: '64', age: 73, gender: 'F', section: 'शिव जी का मंदिर, लड़की' },
  { serial: 139, epic: 'SNE0399170', name: 'भावना', guardian: 'बाबू नाथ', rel: 'husband', house: '64', age: 41, gender: 'F', section: 'शिव जी का मंदिर, लड़की' },
  { serial: 140, epic: 'SNE0285437', name: 'बाबूनाथ', guardian: 'रामनाथ', rel: 'father', house: '64', age: 39, gender: 'M', section: 'शिव जी का मंदिर, लड़की' },
  { serial: 141, epic: 'SNE0820530', name: 'राजू नाथ', guardian: 'रामनाथ', rel: 'father', house: '64', age: 33, gender: 'M', section: 'शिव जी का मंदिर, लड़की' },
  { serial: 142, epic: 'SNE0820548', name: 'लीला', guardian: 'राजू नाथ', rel: 'husband', house: '64', age: 30, gender: 'F', section: 'शिव जी का मंदिर, लड़की' },
  { serial: 143, epic: 'SNE0399188', name: 'कमली', guardian: 'भैंरूरावल', rel: 'husband', house: '66', age: 59, gender: 'F', section: 'शिव जी का मंदिर, लड़की' },

  // Page 9
  { serial: 144, epic: 'RJ/20/152/081292', name: 'रूकमाणी', guardian: 'सुवा रावल', rel: 'husband', house: '70', age: 73, gender: 'F', section: 'शिव जी का मंदिर, लड़की' },
  { serial: 145, epic: 'SNE0220640', name: 'बंशी', guardian: 'सुवा रावल', rel: 'father', house: '70', age: 34, gender: 'M', section: 'शिव जी का मंदिर, लड़की' },
  { serial: 146, epic: 'SNE0728931', name: 'रिंकू', guardian: 'शंभू', rel: 'husband', house: '70', age: 34, gender: 'F', section: 'शिव जी का मंदिर, लड़की', isDeleted: true },
  { serial: 147, epic: 'SNE0728949', name: 'सानू', guardian: 'बंशी', rel: 'husband', house: '70', age: 32, gender: 'F', section: 'शिव जी का मंदिर, लड़की' },
  { serial: 148, epic: 'SNE1282953', name: 'प्रेम', guardian: 'हजारी', rel: 'father', house: '39', age: 63, gender: 'M', section: 'विद्यालय चौक, लड़की' },
  { serial: 149, epic: 'SNE1712009', name: 'मूला', guardian: 'प्रेम रावल', rel: 'father', house: '39', age: 22, gender: 'M', section: 'विद्यालय चौक, लड़की' },
  { serial: 150, epic: 'SNE1873074', name: 'महिमा कुमारी योगी', guardian: 'मुला रावल', rel: 'husband', house: '39', age: 18, gender: 'F', section: 'विद्यालय चौक, लड़की' },
  { serial: 151, epic: 'RJ/20/152/081149', name: 'प्यारचन्द्र', guardian: 'गिरधारीलाल', rel: 'father', house: '83', age: 71, gender: 'M', section: 'रायपुर रोड़, लड़की' },
  { serial: 152, epic: 'SNE0820563', name: 'सुमित्रा', guardian: 'प्यारा', rel: 'husband', house: '83', age: 31, gender: 'F', section: 'रायपुर रोड़, लड़की' },
  { serial: 153, epic: 'RJ/20/152/082016', name: 'प्रेमलाल', guardian: 'गिरधारी', rel: 'father', house: '84', age: 63, gender: 'M', section: 'रायपुर रोड़, लड़की', isDeleted: true },
  { serial: 154, epic: 'KDY0976605', name: 'बरजुबाई', guardian: 'प्रेमलाल', rel: 'husband', house: '84', age: 61, gender: 'F', section: 'रायपुर रोड़, लड़की' },
  { serial: 155, epic: 'KDY2051340', name: 'जगदीश', guardian: 'प्रेम', rel: 'father', house: '84', age: 39, gender: 'M', section: 'रायपुर रोड़, लड़की' },
  { serial: 156, epic: 'SNE0206177', name: 'राजू', guardian: 'प्रेम', rel: 'father', house: '84', age: 36, gender: 'M', section: 'रायपुर रोड़, लड़की' },
  { serial: 157, epic: 'SNE0220665', name: 'किरण', guardian: 'जगदीश', rel: 'husband', house: '84', age: 34, gender: 'F', section: 'रायपुर रोड़, लड़की' },
  { serial: 158, epic: 'SNE0948000', name: 'सीमा देवी', guardian: 'राजू लौहार', rel: 'husband', house: '84', age: 28, gender: 'F', section: 'रायपुर रोड़, लड़की' },
  { serial: 159, epic: 'SNE0544973', name: 'मांगीबाई', guardian: 'सुवानाथ', rel: 'husband', house: '85', age: 73, gender: 'F', section: 'रायपुर रोड़, लड़की' },
  { serial: 160, epic: 'SNE0182436', name: 'लीला', guardian: 'दिनेश नाथ', rel: 'husband', house: '85', age: 47, gender: 'F', section: 'रायपुर रोड़, लड़की' },
  { serial: 161, epic: 'KDY1260546', name: 'दिनेश', guardian: 'सुवानाथ', rel: 'father', house: '85', age: 41, gender: 'M', section: 'रायपुर रोड़, लड़की' },
  { serial: 162, epic: 'SNE0182402', name: 'कैलाश नाथ', guardian: 'सुवानाथ', rel: 'father', house: '85', age: 38, gender: 'M', section: 'रायपुर रोड़, लड़की' },
  { serial: 163, epic: 'SNE0182410', name: 'सुखी नाथ', guardian: 'कैलाश नाथ', rel: 'husband', house: '85', age: 36, gender: 'F', section: 'रायपुर रोड़, लड़की' },
  { serial: 164, epic: 'SNE0182444', name: 'सीमा', guardian: 'राजूनाथ', rel: 'husband', house: '85', age: 35, gender: 'F', section: 'रायपुर रोड़, लड़की' },
  { serial: 165, epic: 'SNE0182469', name: 'राजू नाथ', guardian: 'सुवानाथ', rel: 'father', house: '85', age: 35, gender: 'M', section: 'रायपुर रोड़, लड़की' },

  // Page 10
  { serial: 166, epic: 'SNE0182394', name: 'ममता', guardian: 'दीपक नाथ', rel: 'husband', house: '85', age: 34, gender: 'F', section: 'रायपुर रोड़, लड़की' },
  { serial: 167, epic: 'SNE0182386', name: 'दीपक नाथ', guardian: 'सुवानाथ', rel: 'father', house: '85', age: 34, gender: 'M', section: 'रायपुर रोड़, लड़की' },
  { serial: 168, epic: 'SNE1732072', name: 'विमला', guardian: 'दिनेश नाथ', rel: 'father', house: '85', age: 19, gender: 'F', section: 'रायपुर रोड़, लड़की' },
  { serial: 169, epic: 'SNE1761261', name: 'श्रवण नाथ योगी', guardian: 'कैलाश नाथ योगी', rel: 'father', house: '85', age: 19, gender: 'M', section: 'रायपुर रोड़, लड़की' },
  { serial: 170, epic: 'SNE0143636', name: 'जेठूसिंह', guardian: 'पदमसिंह', rel: 'father', house: '86', age: 55, gender: 'M', section: 'रायपुर रोड़, लड़की' },
  { serial: 171, epic: 'KDY1347103', name: 'मूमलकंवर', guardian: 'जेठूसिंह', rel: 'husband', house: '86', age: 53, gender: 'F', section: 'रायपुर रोड़, लड़की' },
  { serial: 172, epic: 'SNE0220673', name: 'रमेश नाथ', guardian: 'नारायणनाथ', rel: 'father', house: '86', age: 37, gender: 'M', section: 'रायपुर रोड़, लड़की' },
  { serial: 173, epic: 'SNE0236398', name: 'नीतु कंवर', guardian: 'भैरूसिंह', rel: 'husband', house: '86', age: 37, gender: 'F', section: 'रायपुर रोड़, लड़की' },
  { serial: 174, epic: 'SNE0729012', name: 'मंजु', guardian: 'रमेश नाथ', rel: 'husband', house: '86', age: 31, gender: 'F', section: 'रायपुर रोड़, लड़की' },
  { serial: 175, epic: 'SNE1664598', name: 'अनिता', guardian: 'जेठू सिंह', rel: 'father', house: '86', age: 27, gender: 'F', section: 'रायपुर रोड़, लड़की' },
  { serial: 176, epic: 'KDY1347335', name: 'हीरालाल', guardian: 'नथूलाल', rel: 'father', house: '87', age: 55, gender: 'M', section: 'रायपुर रोड़, लड़की' },
  { serial: 177, epic: 'KDY0976928', name: 'कंवरीबाई', guardian: 'हीरालाल', rel: 'husband', house: '87', age: 53, gender: 'F', section: 'रायपुर रोड़, लड़की' },
  { serial: 178, epic: 'SNE1016393', name: 'श्रवण लाल', guardian: 'हीरा लाल', rel: 'father', house: '87', age: 26, gender: 'M', section: 'रायपुर रोड़, लड़की' },
  { serial: 179, epic: 'SNE0220681', name: 'कुसुम कंवर', guardian: 'जगदीश सिंह', rel: 'husband', house: '89', age: 36, gender: 'F', section: 'रायपुर रोड़, लड़की' },
  { serial: 180, epic: 'RJ/20/152/081166', name: 'पारसकंवर', guardian: 'हीरासिंह', rel: 'husband', house: '89', age: 93, gender: 'F', section: 'माणना, लड़की', isDeleted: true },
  { serial: 181, epic: 'SNE1440437', name: 'जेठूसिंह', guardian: 'सरदारसिंह', rel: 'father', house: '89', age: 85, gender: 'M', section: 'माणना, लड़की', isDeleted: true },
  { serial: 182, epic: 'SNE1440429', name: 'फूम कंवर', guardian: 'जेठूसिंह', rel: 'husband', house: '89', age: 75, gender: 'F', section: 'माणना, लड़की' },
  { serial: 183, epic: 'RJ/20/152/082003', name: 'नारायणसिंह', guardian: 'तेजसिंह', rel: 'father', house: '89', age: 69, gender: 'M', section: 'माणना, लड़की' },
  { serial: 184, epic: 'SNE1440445', name: 'भंवरसिंह', guardian: 'बदलसिंह', rel: 'father', house: '89', age: 69, gender: 'M', section: 'माणना, लड़की' },
  { serial: 185, epic: 'SNE1440452', name: 'मोरकंवर', guardian: 'भंवरसिंह', rel: 'husband', house: '89', age: 67, gender: 'F', section: 'माणना, लड़की' },
  { serial: 186, epic: 'SNE1440460', name: 'भंवरसिंह', guardian: 'हीरासिंह', rel: 'father', house: '89', age: 67, gender: 'M', section: 'माणना, लड़की' },
  { serial: 187, epic: 'RJ/20/152/082004', name: 'कंचनकंवर', guardian: 'नारायणसिंह', rel: 'husband', house: '89', age: 65, gender: 'F', section: 'माणना, लड़की' },
  { serial: 188, epic: 'SNE0047639', name: 'बालूसिंह', guardian: 'उदयसिंह', rel: 'father', house: '89', age: 65, gender: 'M', section: 'माणना, लड़की' },

  // Page 11
  { serial: 189, epic: 'SNE1440536', name: 'कालू सिंह', guardian: 'माधु सिंह', rel: 'father', house: '89', age: 65, gender: 'M', section: 'माणना, लड़की' },
  { serial: 190, epic: 'RJ/20/152/081146', name: 'धनकंवर', guardian: 'गोर्धनसिंह', rel: 'husband', house: '89', age: 65, gender: 'F', section: 'माणना, लड़की' },
  { serial: 191, epic: 'SNE1440478', name: 'कैलाशकंवर', guardian: 'भंवरसिंह', rel: 'husband', house: '89', age: 65, gender: 'F', section: 'माणना, लड़की' },
  { serial: 192, epic: 'SNE1440577', name: 'अभय सिंह', guardian: 'गुलाब सिंह', rel: 'father', house: '89', age: 63, gender: 'M', section: 'माणना, लड़की' },
  { serial: 193, epic: 'SNE1440569', name: 'कैलाशकंवर', guardian: 'कालू सिंह', rel: 'husband', house: '89', age: 63, gender: 'F', section: 'माणना, लड़की' },
  { serial: 194, epic: 'SNE1440585', name: 'नन्दाकंवर', guardian: 'अभय सिंह', rel: 'husband', house: '89', age: 61, gender: 'F', section: 'माणना, लड़की' },
  { serial: 195, epic: 'SNE1440593', name: 'जीवन सिंह', guardian: 'उदय सिंह', rel: 'father', house: '89', age: 59, gender: 'M', section: 'माणना, लड़की' },
  { serial: 196, epic: 'KDY2050946', name: 'कालू सिंह', guardian: 'तेज सिंह', rel: 'father', house: '89', age: 58, gender: 'M', section: 'माणना, लड़की', isDeleted: true },
  { serial: 197, epic: 'SNE1440544', name: 'सुरजकंवर', guardian: 'जीवनसिंह', rel: 'husband', house: '89', age: 57, gender: 'F', section: 'माणना, लड़की' },
  { serial: 198, epic: 'SNE1440601', name: 'नरपत सिंह', guardian: 'उदय सिंह', rel: 'father', house: '89', age: 57, gender: 'M', section: 'माणना, लड़की' },
  { serial: 199, epic: 'RJ/20/152/081340', name: 'भोपालसिंह', guardian: 'तेजसिंह', rel: 'father', house: '89', age: 55, gender: 'M', section: 'माणना, लड़की' },
  { serial: 200, epic: 'SNE1440502', name: 'सवाईसिंह', guardian: 'हीरासिंह', rel: 'father', house: '89', age: 53, gender: 'M', section: 'माणना, लड़की' },
  { serial: 201, epic: 'SNE1440486', name: 'मान सिंह', guardian: 'जेठू सिंह', rel: 'father', house: '89', age: 53, gender: 'M', section: 'माणना, लड़की' },
  { serial: 202, epic: 'SNE0047720', name: 'गोकलसिंह', guardian: 'उदयसिंह', rel: 'father', house: '89', age: 53, gender: 'M', section: 'माणना, लड़की' },
  { serial: 203, epic: 'SNE1440494', name: 'पुष्पाकंवर', guardian: 'शम्भूसिंह', rel: 'husband', house: '89', age: 53, gender: 'F', section: 'माणना, लड़की' },
  { serial: 204, epic: 'KDY2050938', name: 'प्रियतमा कंवर', guardian: 'कालू सिंह', rel: 'husband', house: '89', age: 53, gender: 'F', section: 'माणना, लड़की', isDeleted: true },
  { serial: 205, epic: 'KDY0976969', name: 'पूर्ण कंवर', guardian: 'गोकुल सिंह', rel: 'husband', house: '89', age: 51, gender: 'F', section: 'माणना, लड़की' },
  { serial: 206, epic: 'SNE0047480', name: 'घनश्याम कंवर', guardian: 'मान सिंह', rel: 'husband', house: '89', age: 51, gender: 'F', section: 'माणना, लड़की' },
  { serial: 207, epic: 'RJ/20/152/082053', name: 'मिठूकंवर', guardian: 'भोपालसिंह', rel: 'husband', house: '89', age: 50, gender: 'F', section: 'माणना, लड़की' },
  { serial: 208, epic: 'KDY0976944', name: 'गोपाल सिंह', guardian: 'जेठू सिंह', rel: 'father', house: '89', age: 48, gender: 'M', section: 'माणना, लड़की' },
  { serial: 209, epic: 'KDY0976951', name: 'प्रेम कंवर', guardian: 'गोपाल सिंह', rel: 'husband', house: '89', age: 45, gender: 'F', section: 'माणना, लड़की' },
  { serial: 210, epic: 'KDY1347046', name: 'पप्पू सिंह', guardian: 'भंवर सिंह', rel: 'father', house: '89', age: 45, gender: 'M', section: 'माणना, लड़की' },
  { serial: 211, epic: 'KDY2051902', name: 'भारत सिंह', guardian: 'कालू सिंह', rel: 'father', house: '89', age: 45, gender: 'M', section: 'माणना, लड़की' },
  { serial: 212, epic: 'KDY1347145', name: 'कैलाश कंवर', guardian: 'पप्पू सिंह', rel: 'husband', house: '89', age: 43, gender: 'F', section: 'माणना, लड़की' },
  { serial: 213, epic: 'SNE0236380', name: 'भैरु सिंह', guardian: 'गोवर्धन सिंह', rel: 'father', house: '89', age: 43, gender: 'M', section: 'माणना, लड़की' },
  { serial: 214, epic: 'SNE0236406', name: 'जगदीश सिंह', guardian: 'गोरधन सिंह', rel: 'father', house: '89', age: 42, gender: 'M', section: 'माणना, लड़की' },
  { serial: 215, epic: 'SNE0047712', name: 'राजू सिंह', guardian: 'बालू सिंह', rel: 'father', house: '89', age: 42, gender: 'M', section: 'माणना, लड़की' },

  // Page 12
  { serial: 216, epic: 'KDY0976936', name: 'जोरावर सिंह', guardian: 'नारायण सिंह', rel: 'father', house: '89', age: 41, gender: 'M', section: 'माणना, लड़की' },
  { serial: 217, epic: 'SNE0047746', name: 'चन्द सिंह', guardian: 'भंवर सिंह', rel: 'father', house: '89', age: 41, gender: 'M', section: 'माणना, लड़की' },
  { serial: 218, epic: 'SNE0047514', name: 'पूर्ण सिंह', guardian: 'अभय सिंह', rel: 'father', house: '89', age: 41, gender: 'M', section: 'माणना, लड़की' },
  { serial: 219, epic: 'SNE0047621', name: 'हिम्मत सिंह', guardian: 'नारायण सिंह', rel: 'father', house: '89', age: 39, gender: 'M', section: 'माणना, लड़की' },
  { serial: 220, epic: 'SNE0782763', name: 'सन्तोष कंवर', guardian: 'अर्जुन सिंह', rel: 'husband', house: '89', age: 38, gender: 'F', section: 'माणना, लड़की' },
  { serial: 221, epic: 'SNE0236414', name: 'पप्पू सिंह', guardian: 'भंवर सिंह', rel: 'father', house: '89', age: 38, gender: 'M', section: 'माणना, लड़की' },
  { serial: 222, epic: 'SNE0047738', name: 'सन्तोष कंवर', guardian: 'चन्द्रसिंह', rel: 'husband', house: '89', age: 38, gender: 'F', section: 'माणना, लड़की' },
  { serial: 223, epic: 'SNE0047753', name: 'गोदा कंवर', guardian: 'जोरावर सिंह', rel: 'husband', house: '89', age: 38, gender: 'F', section: 'माणना, लड़की' },
  { serial: 224, epic: 'SNE0047605', name: 'सौरम कंवर', guardian: 'राजू सिंह', rel: 'husband', house: '89', age: 37, gender: 'F', section: 'माणना, लड़की' },
  { serial: 225, epic: 'SNE0047506', name: 'पूरण कंवर', guardian: 'शिवसिंह', rel: 'husband', house: '89', age: 37, gender: 'F', section: 'माणना, लड़की' },
  { serial: 226, epic: 'SNE0047498', name: 'बरजु कंवर', guardian: 'पूरण सिंह', rel: 'husband', house: '89', age: 37, gender: 'F', section: 'माणना, लड़की' },
  { serial: 227, epic: 'SNE0047589', name: 'रोशन कंवर', guardian: 'मदन सिंह', rel: 'husband', house: '89', age: 36, gender: 'F', section: 'माणना, लड़की' },
  { serial: 228, epic: 'SNE0236430', name: 'नरेन्द्र सिंह', guardian: 'कालू सिंह', rel: 'father', house: '89', age: 36, gender: 'M', section: 'माणना, लड़की' },
  { serial: 229, epic: 'SNE0047688', name: 'रतन सिंह', guardian: 'रमेशत सिंह', rel: 'father', house: '89', age: 36, gender: 'M', section: 'माणना, लड़की' },
  { serial: 230, epic: 'SNE0820621', name: 'विष्णु कंवर', guardian: 'हिम्मत सिंह', rel: 'husband', house: '89', age: 34, gender: 'F', section: 'माणना, लड़की' },
  { serial: 231, epic: 'SNE0514257', name: 'मुन्ना कंवर', guardian: 'रतन सिंह', rel: 'husband', house: '89', age: 33, gender: 'F', section: 'माणना, लड़की' },
  { serial: 232, epic: 'SNE0460824', name: 'महेन्द्र सिंह', guardian: 'जीवन सिंह', rel: 'father', house: '89', age: 33, gender: 'M', section: 'माणना, लड़की' },
  { serial: 233, epic: 'SNE0545053', name: 'बबलू सिंह', guardian: 'कालू सिंह', rel: 'father', house: '89', age: 32, gender: 'M', section: 'माणना, लड़की' },
  { serial: 234, epic: 'SNE0820639', name: 'पुष्पा कंवर', guardian: 'पप्पू सिंह', rel: 'husband', house: '89', age: 32, gender: 'F', section: 'माणना, लड़की' },
  { serial: 235, epic: 'SNE0460832', name: 'टम्पू सिंह', guardian: 'शम्भू सिंह', rel: 'father', house: '89', age: 31, gender: 'M', section: 'माणना, लड़की' },
  { serial: 236, epic: 'SNE0820654', name: 'सीतुकंवर', guardian: 'चामण्डसिंह', rel: 'husband', house: '89', age: 31, gender: 'F', section: 'माणना, लड़की' },
  { serial: 237, epic: 'SNE0820662', name: 'कैलाश कंवर', guardian: 'टम्पू सिंह', rel: 'husband', house: '89', age: 31, gender: 'F', section: 'माणना, लड़की' },
  { serial: 238, epic: 'SNE0820647', name: 'कृष्णाकंवर', guardian: 'नरेन्द्रसिंह', rel: 'husband', house: '89', age: 31, gender: 'F', section: 'माणना, लड़की' },
  { serial: 239, epic: 'SNE0907840', name: 'श्यामु कंवर', guardian: 'भंवरसिंह', rel: 'father', house: '89', age: 28, gender: 'F', section: 'माणना, लड़की', isDeleted: true },
  { serial: 240, epic: 'SNE1625474', name: 'श्रवण कंवर', guardian: 'महेंद्र सिंह', rel: 'husband', house: '89', age: 27, gender: 'F', section: 'माणना, लड़की' },
  { serial: 241, epic: 'SNE1016419', name: 'सोनू कंवर', guardian: 'गोपाल सिंह', rel: 'father', house: '89', age: 26, gender: 'F', section: 'माणना, लड़की', isDeleted: true },
  { serial: 242, epic: 'SNE1329754', name: 'महावीर', guardian: 'गोपाल', rel: 'father', house: '89', age: 25, gender: 'M', section: 'माणना, लड़की' },

  // Page 13
  { serial: 243, epic: 'SNE1658202', name: 'अजय पाल सिंह', guardian: 'मान सिंह', rel: 'father', house: '89', age: 23, gender: 'M', section: 'माणना, लड़की' },
  { serial: 244, epic: 'RJ/20/152/081168', name: 'गुलाबकंवर', guardian: 'अमरसिंह', rel: 'husband', house: '91', age: 103, gender: 'F', section: 'माणना, लड़की' },
  { serial: 245, epic: 'SNE1440528', name: 'हेमकंवर', guardian: 'रेवतसिंह', rel: 'husband', house: '91', age: 59, gender: 'F', section: 'माणना, लड़की' },
  { serial: 246, epic: 'KDY1125871', name: 'जब्बरसिंह', guardian: 'अमरसिंह', rel: 'father', house: '91', age: 59, gender: 'M', section: 'माणना, लड़की' },
  { serial: 247, epic: 'RJ/20/152/082001', name: 'कैलाश कंवर', guardian: 'जब्बरसिंह', rel: 'husband', house: '91', age: 54, gender: 'F', section: 'माणना, लड़की' },
  { serial: 248, epic: 'SNE1440510', name: 'रेवतसिंह', guardian: 'अमरसिंह', rel: 'father', house: '91', age: 53, gender: 'M', section: 'माणना, लड़की' },
  { serial: 249, epic: 'SNE0047613', name: 'महेन्द्रसिंह', guardian: 'अमरसिंह', rel: 'father', house: '91', age: 48, gender: 'M', section: 'माणना, लड़की' },
  { serial: 250, epic: 'SNE0047597', name: 'अन्तर कंवर', guardian: 'महेन्द्र सिंह', rel: 'husband', house: '91', age: 45, gender: 'F', section: 'माणना, लड़की' },
  { serial: 251, epic: 'SNE0047704', name: 'अर्जुन सिंह', guardian: 'अमर सिंह', rel: 'father', house: '91', age: 41, gender: 'M', section: 'माणना, लड़की' },
  { serial: 252, epic: 'SNE1685957', name: 'कृष्णा', guardian: 'अर्जुन सिंह', rel: 'father', house: '91', age: 22, gender: 'F', section: 'माणना, लड़की' },
  { serial: 253, epic: 'SNE1700178', name: 'नरेंद्र सिंह', guardian: 'महेंद्र सिंह', rel: 'father', house: '91', age: 20, gender: 'M', section: 'माणना, लड़की' },
  { serial: 254, epic: 'RJ/20/152/081153', name: 'ईश्वर सिंह', guardian: 'नाहरसिंह', rel: 'father', house: '92', age: 69, gender: 'M', section: 'माणना, लड़की' },
  { serial: 255, epic: 'RJ/20/152/081177', name: 'भंवरकंवर', guardian: 'ईश्वर सिंह', rel: 'husband', house: '92', age: 63, gender: 'F', section: 'माणना, लड़की' },
  { serial: 256, epic: 'SNE0782771', name: 'शैतान सिंह', guardian: 'ईश्वर सिंह', rel: 'father', house: '92', age: 43, gender: 'M', section: 'माणना, लड़की' },
  { serial: 257, epic: 'SNE0047696', name: 'कमला कंवर', guardian: 'शैतान सिंह', rel: 'husband', house: '92', age: 41, gender: 'F', section: 'माणना, लड़की' },
  { serial: 258, epic: 'SNE0047670', name: 'मदन सिंह', guardian: 'ईश्वर सिंह', rel: 'father', house: '92', age: 41, gender: 'M', section: 'माणना, लड़की' },
  { serial: 259, epic: 'SNE1797141', name: 'करनपाल सिंह सोलंकी', guardian: 'शैतान सिंह', rel: 'father', house: '92', age: 19, gender: 'M', section: 'माणना, लड़की' },
  { serial: 260, epic: 'RJ/20/152/082048', name: 'शंकरसिंह', guardian: 'अचलसिंह', rel: 'father', house: '93', age: 65, gender: 'M', section: 'माणना, लड़की', isDeleted: true },
  { serial: 261, epic: 'RJ/20/152/082049', name: 'कमलाकंवर', guardian: 'शंकरसिंह', rel: 'husband', house: '93', age: 61, gender: 'F', section: 'माणना, लड़की' },
  { serial: 262, epic: 'SNE0285510', name: 'भंवर सिंह', guardian: 'शंकर सिंह', rel: 'father', house: '93', age: 35, gender: 'M', section: 'माणना, लड़की' },
  { serial: 263, epic: 'RJ/20/152/081510', name: 'जीवनसिंह', guardian: 'अचलसिंह', rel: 'father', house: '94', age: 61, gender: 'M', section: 'माणना, लड़की' },
  { serial: 264, epic: 'SNE1868702', name: 'निशा कंवर सोलंकी', guardian: 'मान सिंह', rel: 'father', house: '89', age: 18, gender: 'F', section: 'माणना, लड़की' },

  // Page 14
  { serial: 265, epic: 'SNE1326842', name: 'संतोष कंवर', guardian: 'भवानी सिंह', rel: 'husband', house: '1', age: 27, gender: 'F', section: 'चमारिया खेड़ा, लड़की' },
  { serial: 266, epic: 'SNE1016443', name: 'सुखी', guardian: 'कैलाश', rel: 'husband', house: '53', age: 26, gender: 'F', section: 'चमारिया खेड़ा, लड़की' },
  { serial: 267, epic: 'SNE1376532', name: 'कमलेश', guardian: 'शंकर', rel: 'father', house: '53', age: 24, gender: 'M', section: 'चमारिया खेड़ा, लड़की' },
  { serial: 268, epic: 'SNE1016450', name: 'सुमेर सिंह', guardian: 'शंकर सिंह', rel: 'father', house: '93', age: 26, gender: 'M', section: 'चमारिया खेड़ा, लड़की' },
  { serial: 269, epic: 'SNE1409903', name: 'वर्षा कंवर', guardian: 'भंवर सिंह', rel: 'husband', house: '93', age: 25, gender: 'F', section: 'चमारिया खेड़ा, लड़की' },
  { serial: 270, epic: 'KDY1347343', name: 'फुल कंवर', guardian: 'जीवन सिंह', rel: 'husband', house: '94', age: 53, gender: 'F', section: 'चमारिया खेड़ा, लड़की' },
  { serial: 271, epic: 'SNE1611953', name: 'महेंद्र सिंह', guardian: 'जीवराज सिंह', rel: 'father', house: '94', age: 24, gender: 'M', section: 'चमारिया खेड़ा, लड़की' },
  { serial: 272, epic: 'SNE1612027', name: 'यशपाल सिंह', guardian: 'नामजीवन सिंह', rel: 'father', house: '94', age: 22, gender: 'M', section: 'चमारिया खेड़ा, लड़की' },
  { serial: 273, epic: 'KDY0976977', name: 'रुकमणी', guardian: 'घीसालाल', rel: 'husband', house: '95', age: 65, gender: 'F', section: 'चमारिया खेड़ा, लड़की' },
  { serial: 274, epic: 'KDY1347277', name: 'बंशी लाल', guardian: 'त्रिलोक', rel: 'father', house: '95', age: 41, gender: 'M', section: 'चमारिया खेड़ा, लड़की' },
  { serial: 275, epic: 'SNE0399220', name: 'प्रेमी', guardian: 'बंशी', rel: 'husband', house: '95', age: 35, gender: 'F', section: 'चमारिया खेड़ा, लड़की' },
  { serial: 276, epic: 'RJ/20/152/081312', name: 'दोलाराम', guardian: 'हरलाल', rel: 'father', house: '96', age: 67, gender: 'M', section: 'चमारिया खेड़ा, लड़की' },
  { serial: 277, epic: 'RJ/20/152/081242', name: 'तिलोक', guardian: 'जालम', rel: 'father', house: '96', age: 63, gender: 'M', section: 'चमारिया खेड़ा, लड़की' },
  { serial: 278, epic: 'RJ/20/152/081260', name: 'उदयराम', guardian: 'जालमराम', rel: 'father', house: '96', age: 59, gender: 'M', section: 'चमारिया खेड़ा, लड़की' },
  { serial: 279, epic: 'KDY1347251', name: 'नारायण लाल', guardian: 'आसू राम', rel: 'father', house: '96', age: 47, gender: 'M', section: 'चमारिया खेड़ा, लड़की' },
  { serial: 280, epic: 'SNE0460865', name: 'बालूराम', guardian: 'आसूराम', rel: 'father', house: '96', age: 37, gender: 'M', section: 'चमारिया खेड़ा, लड़की' },
  { serial: 281, epic: 'SNE0460857', name: 'पारस लाल', guardian: 'आसू राम', rel: 'father', house: '96', age: 36, gender: 'M', section: 'चमारिया खेड़ा, लड़की' },
  { serial: 282, epic: 'SNE0545079', name: 'पप्पूलाल', guardian: 'आसूराम', rel: 'father', house: '96', age: 33, gender: 'M', section: 'चमारिया खेड़ा, लड़की' },
  { serial: 283, epic: 'SNE0460840', name: 'किशन लाल', guardian: 'त्रिलोक', rel: 'father', house: '96', age: 31, gender: 'M', section: 'चमारिया खेड़ा, लड़की' },
  { serial: 284, epic: 'SNE1737790', name: 'मीरा देवी बैरवा', guardian: 'किशन लाल', rel: 'husband', house: '96', age: 30, gender: 'F', section: 'चमारिया खेड़ा, लड़की' },
  { serial: 285, epic: 'SNE0602383', name: 'मदनलाल', guardian: 'कालूराम', rel: 'father', house: '96', age: 30, gender: 'M', section: 'चमारिया खेड़ा, लड़की' },
  { serial: 286, epic: 'SNE0820688', name: 'ममता', guardian: 'मदनलाल', rel: 'husband', house: '96', age: 29, gender: 'F', section: 'चमारिया खेड़ा, लड़की' },
  { serial: 287, epic: 'SNE1784461', name: 'मीना बैरवा', guardian: 'रतन लाल', rel: 'husband', house: '96', age: 28, gender: 'F', section: 'चमारिया खेड़ा, लड़की' },
  { serial: 288, epic: 'SNE1784495', name: 'रतन लाल', guardian: 'त्रिलोक', rel: 'father', house: '96', age: 23, gender: 'M', section: 'चमारिया खेड़ा, लड़की' },
  { serial: 289, epic: 'SNE1757491', name: 'आशा देवी', guardian: 'पप्पूलाल बैरवा', rel: 'husband', house: '96', age: 22, gender: 'F', section: 'चमारिया खेड़ा, लड़की' },
  { serial: 290, epic: 'RJ/20/152/081046', name: 'बरदा', guardian: 'गोकुल', rel: 'father', house: '97', age: 89, gender: 'M', section: 'चमारिया खेड़ा, लड़की', isDeleted: true },
  { serial: 291, epic: 'KDY0977017', name: 'अणछी', guardian: 'छोगालाल', rel: 'husband', house: '97', age: 73, gender: 'F', section: 'चमारिया खेड़ा, लड़की' },

  // Page 15
  { serial: 292, epic: 'SNE0602367', name: 'भैरुलाल', guardian: 'छोगालाल', rel: 'father', house: '97', age: 30, gender: 'M', section: 'चमारिया खेड़ा, लड़की' },
  { serial: 293, epic: 'RJ/20/152/081310', name: 'मोहनलाल', guardian: 'गोमाराम', rel: 'father', house: '98', age: 59, gender: 'M', section: 'चमारिया खेड़ा, लड़की' },
  { serial: 294, epic: 'RJ/20/152/082047', name: 'सोहनबाई', guardian: 'मोहनलाल', rel: 'husband', house: '98', age: 57, gender: 'F', section: 'चमारिया खेड़ा, लड़की' },
  { serial: 295, epic: 'SNE0460899', name: 'सुखलाल', guardian: 'मोहन लाल', rel: 'father', house: '98', age: 34, gender: 'M', section: 'चमारिया खेड़ा, लड़की' },
  { serial: 296, epic: 'SNE0460881', name: 'अमर चन्द', guardian: 'मोहन लाल', rel: 'father', house: '98', age: 33, gender: 'M', section: 'चमारिया खेड़ा, लड़की' },
  { serial: 297, epic: 'SNE1243591', name: 'नर्मदा', guardian: 'अमरचंद', rel: 'husband', house: '98', age: 26, gender: 'F', section: 'चमारिया खेड़ा, लड़की' },
  { serial: 298, epic: 'RJ/20/152/081202', name: 'प्यारीबाई', guardian: 'मांगूरावल', rel: 'husband', house: '99', age: 81, gender: 'F', section: 'चमारिया खेड़ा, लड़की', isDeleted: true },
  { serial: 299, epic: 'SNE1128313', name: 'धर्मा', guardian: 'मांगू', rel: 'father', house: '99', age: 29, gender: 'M', section: 'चमारिया खेड़ा, लड़की' },
  { serial: 300, epic: 'RJ/20/152/081058', name: 'प्रेम सिंह', guardian: 'गोपाल सिंह', rel: 'father', house: '101', age: 59, gender: 'M', section: 'चमारिया खेड़ा, लड़की' },
  { serial: 301, epic: 'SNE0460907', name: 'महेन्द्र सिंह', guardian: 'प्रेम सिंह', rel: 'father', house: '101', age: 33, gender: 'M', section: 'चमारिया खेड़ा, लड़की' },
  { serial: 302, epic: 'SNE0820696', name: 'घनश्याम कंवर', guardian: 'महेन्द्र सिंह', rel: 'husband', house: '101', age: 31, gender: 'F', section: 'चमारिया खेड़ा, लड़की' },
  { serial: 303, epic: 'SNE0602375', name: 'प्रहलाद सिंह', guardian: 'प्रेम सिंह', rel: 'father', house: '101', age: 31, gender: 'M', section: 'चमारिया खेड़ा, लड़की' },
  { serial: 304, epic: 'SNE1409820', name: 'नारायण कंवर', guardian: 'पहलाद सिंह', rel: 'husband', house: '101', age: 28, gender: 'F', section: 'चमारिया खेड़ा, लड़की' },
  { serial: 305, epic: 'SNE1665116', name: 'विजेंद्र सिंह', guardian: 'प्रेम सिंह', rel: 'father', house: '101', age: 21, gender: 'M', section: 'चमारिया खेड़ा, लड़की' },
  { serial: 306, epic: 'KDY2050714', name: 'भंवर सिंह', guardian: 'गोरधन सिंह', rel: 'father', house: '102', age: 39, gender: 'M', section: 'चमारिया खेड़ा, लड़की' },
  { serial: 307, epic: 'SNE0820704', name: 'पिस्ता कंवर', guardian: 'भंवर सिंह', rel: 'husband', house: '102', age: 32, gender: 'F', section: 'चमारिया खेड़ा, लड़की' },
  { serial: 308, epic: 'RJ/20/152/082050', name: 'छीतरलाल', guardian: 'छोगालाल', rel: 'father', house: '103', age: 55, gender: 'M', section: 'चमारिया खेड़ा, लड़की' },
  { serial: 309, epic: 'RJ/20/152/082051', name: 'सीताबाई', guardian: 'छीतरलाल', rel: 'husband', house: '103', age: 53, gender: 'F', section: 'चमारिया खेड़ा, लड़की' },
  { serial: 310, epic: 'SNE0514265', name: 'प्रकाश', guardian: 'छीतर', rel: 'father', house: '103', age: 33, gender: 'M', section: 'चमारिया खेड़ा, लड़की' },
  { serial: 311, epic: 'SNE0514273', name: 'उदयलाल', guardian: 'छीतरलाल', rel: 'father', house: '103', age: 31, gender: 'M', section: 'चमारिया खेड़ा, लड़की' },
  { serial: 312, epic: 'SNE0820712', name: 'बसन्ती', guardian: 'प्रकाश', rel: 'husband', house: '103', age: 31, gender: 'F', section: 'चमारिया खेड़ा, लड़की' },
  { serial: 313, epic: 'RJ/20/152/081511', name: 'गोरधनसिंह', guardian: 'गोपालसिंह', rel: 'father', house: '105', age: 73, gender: 'M', section: 'चमारिया खेड़ा, लड़की' },
  { serial: 314, epic: 'RJ/20/152/081185', name: 'अलोलकंवर', guardian: 'गोरधनसिंह', rel: 'husband', house: '105', age: 71, gender: 'F', section: 'चमारिया खेड़ा, लड़की' },
  { serial: 315, epic: 'KDY0977025', name: 'बखतावरसिंह', guardian: 'गोपालसिंह', rel: 'father', house: '105', age: 55, gender: 'M', section: 'चमारिया खेड़ा, लड़की' },
  { serial: 316, epic: 'RJ/20/152/081187', name: 'पूरणकंवर', guardian: 'बखतावरसिंह', rel: 'husband', house: '105', age: 53, gender: 'F', section: 'चमारिया खेड़ा, लड़की' },
  { serial: 317, epic: 'SNE0460915', name: 'भगवान सिंह', guardian: 'गोवर्धन सिंह', rel: 'father', house: '105', age: 33, gender: 'M', section: 'चमारिया खेड़ा, लड़की' },
  { serial: 318, epic: 'SNE0981241', name: 'काजल कंवर', guardian: 'भगवान', rel: 'husband', house: '105', age: 28, gender: 'F', section: 'चमारिया खेड़ा, लड़की' },

  // Page 16
  { serial: 319, epic: 'SNE1593813', name: 'चंद्रा भान सिंह', guardian: 'बख्तवार सिंह', rel: 'father', house: '105', age: 22, gender: 'M', section: 'चमारिया खेड़ा, लड़की' },
  { serial: 320, epic: 'SNE1726355', name: 'टीना', guardian: 'शंकर', rel: 'father', house: 'रावला चौक लड़की', age: 22, gender: 'F', section: 'चमारिया खेड़ा, लड़की', isDeleted: true },
  { serial: 321, epic: 'SNE1861426', name: 'पिंकी कंवर राजपूत', guardian: 'सुमेर सिंह', rel: 'husband', house: '93', age: 24, gender: 'F', section: 'चमारिया खेड़ा, लड़की' },

  // Page 17 (Parivardhan / Additions)
  { serial: 322, epic: '', name: 'रेखा जोगी', guardian: 'कैलाश रावल', rel: 'husband', house: '16', age: 26, gender: 'F', section: 'लड़की' },
  { serial: 323, epic: '', name: 'रोशन लाल', guardian: 'बालू लाल', rel: 'father', house: '32', age: 26, gender: 'M', section: 'बड़ का चौक, लड़की' },
  { serial: 324, epic: '', name: 'मेमा कुमारी भील', guardian: 'रोशन लाल भील', rel: 'husband', house: '32', age: 18, gender: 'F', section: 'बड़ का चौक, लड़की' },
  { serial: 325, epic: '', name: 'श्याम लाल भील', guardian: 'बालू लाल भील', rel: 'father', house: '32', age: 24, gender: 'M', section: 'बड़ का चौक, लड़की' },
  { serial: 326, epic: '', name: 'संतु', guardian: 'बालू राम', rel: 'father', house: '32', age: 23, gender: 'F', section: 'बड़ का चौक, लड़की' },
  { serial: 327, epic: '', name: 'खुशी कंवर', guardian: 'मदन सिंह', rel: 'father', house: '92', age: 19, gender: 'F', section: 'माणना, लड़की' },
  { serial: 328, epic: '', name: 'ओम कंवर', guardian: 'शंकर सिंह', rel: 'husband', house: '91', age: 27, gender: 'F', section: 'माणना, लड़की' },
  { serial: 329, epic: '', name: 'शंकर सिंह', guardian: 'जब्बर सिंह 2', rel: 'father', house: '91', age: 23, gender: 'M', section: 'माणना, लड़की' }
];

async function run() {
  await mongoose.connect('mongodb://187.127.173.42:27017/political_crm');
  console.log('Connected to MongoDB');

  const Member = require('../src/models/Member');
  const gpName = 'पीथाकाखेड़ा';
  const wardNumber = '1';
  const villageName = 'लड़की';

  let matchedCount = 0;
  let createdCount = 0;
  let deletedCount = 0;
  let updatedDetailsCount = 0;

  for (const v of ward1Voters) {
    const cleanEpic = (v.epic || '').trim();

    // If marked deleted in electoral roll
    if (v.isDeleted) {
      deletedCount++;
      if (cleanEpic) {
        // Look up member and remove from ward or flag as deleted
        const member = await Member.findOne({ voterId: cleanEpic });
        if (member) {
          await Member.updateOne(
            { _id: member._id },
            { 
              $pull: { municipalWardNumbers: wardNumber },
              $set: { isVoterDeleted: true }
            }
          );
          console.log(`❌ [DELETED IN ROLL] ${v.serial}. ${v.name} (${cleanEpic}) -> Flagged deleted`);
        }
      }
      continue;
    }

    // Try finding by EPIC first
    let member = null;
    if (cleanEpic) {
      member = await Member.findOne({ voterId: cleanEpic });
    }

    // If not found by EPIC, try finding by Name + Village / GP
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

    const normGender = v.gender === 'F' || v.gender === 'female' ? 'female' : 'male';

    if (member) {
      matchedCount++;
      await Member.updateOne(
        { _id: member._id },
        {
          $set: {
            wardNumber: wardNumber,
            gramPanchayat: gpName,
            village: villageName,
            hasMunicipalMembership: true,
            partNumber: member.partNumber || '75',
            age: v.age || member.age,
            gender: normGender || member.gender,
            guardianName: member.guardianName || v.guardian,
            relationType: member.relationType || v.rel,
            houseNumber: v.house || member.houseNumber,
            sectionName: v.section || member.sectionName
          },
          $addToSet: {
            municipalWardNumbers: wardNumber
          }
        }
      );
      console.log(`✅ [MATCHED & UPDATED] #${v.serial} ${v.name} (EPIC: ${cleanEpic || 'N/A'}) -> Ward 1`);
    } else {
      createdCount++;
      await Member.create({
        voterId: cleanEpic || `WARD1_PEETHA_${v.serial}`,
        name: v.name,
        guardianName: v.guardian,
        relationType: v.rel,
        houseNumber: v.house,
        age: v.age,
        gender: normGender,
        gramPanchayat: gpName,
        village: villageName,
        tehsil: 'रायपुर',
        wardNumber: wardNumber,
        hasAssemblyMembership: true,
        hasMunicipalMembership: true,
        municipalWardNumbers: [wardNumber],
        contactType: 'voter',
        verificationStatus: 'verified',
        partNumber: '75',
        sectionName: v.section
      });
      console.log(`🆕 [CREATED NEW] #${v.serial} ${v.name} (EPIC: ${cleanEpic || 'N/A'}) -> Ward 1`);
    }
  }

  console.log('\n========================================================================');
  console.log('📊 WARD 1 IMPORT FINAL AUDIT REPORT:');
  console.log(`• Total Voter Serials in Document: ${ward1Voters.length}`);
  console.log(`• Active Voters in Document:       ${ward1Voters.length - deletedCount} (Expected: 315)`);
  console.log(`• Matched with Existing Voters:    ${matchedCount} (${((matchedCount / (ward1Voters.length - deletedCount)) * 100).toFixed(1)}%)`);
  console.log(`• Newly Created in Database:       ${createdCount}`);
  console.log(`• Deleted / Excluded from Ward:    ${deletedCount}`);
  console.log('========================================================================\n');

  // Verify in MongoDB
  const inDb = await Member.countDocuments({
    gramPanchayat: /पीथा/i,
    $or: [
      { wardNumber: '1' },
      { municipalWardNumbers: '1' }
    ]
  });
  console.log(`👥 Total Live Voters in MongoDB for GP "${gpName}" Ward 1: ${inDb}`);

  process.exit(0);
}

run().catch(console.error);
