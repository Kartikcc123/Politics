require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../src/config/db');
const Ward = require('../src/models/Ward');
const Booth = require('../src/models/Booth');
const Member = require('../src/models/Member');

// Voter Pages 6 to 10 (Document Pages 8 to 12, Serials 151 to 278)
// Section 1: 1-राजपूत मोहल्ला,सरेवड़ी (Serials 151 to 158)
// Section 2: 2-निचला बाड़ीया,सरेवड़ी (Serials 159 to 278)
// Total Cards: 128 | DELETED: 1 (Serial 156) | ACTIVE: 127
const sarewadiPart6Pages6to10Voters = [
  // Page 8 (Serials 151 to 158) - Section 1 (End)
  { serial: "151", epic: "KDY0959072", name: "धन्ना सिंह", guardian: "गिरधारी सिंह", relation: "father", house: "150", age: 42, gender: "male", sectionNumber: "1", sectionName: "1-राजपूत मोहल्ला,सरेवड़ी" },
  { serial: "152", epic: "SNE0182659", name: "नैनादेवी", guardian: "धन्ना सिंह", relation: "husband", house: "150", age: 36, gender: "female", sectionNumber: "1", sectionName: "1-राजपूत मोहल्ला,सरेवड़ी" },
  { serial: "153", epic: "SNE1376623", name: "यशोदा", guardian: "किशन सिंह", relation: "husband", house: "150", age: 27, gender: "female", sectionNumber: "1", sectionName: "1-राजपूत मोहल्ला,सरेवड़ी" },
  { serial: "154", epic: "SNE0182642", name: "मोहनी देवी", guardian: "मोती सिंह", relation: "husband", house: "150/1", age: 52, gender: "female", sectionNumber: "1", sectionName: "1-राजपूत मोहल्ला,सरेवड़ी" },
  { serial: "155", epic: "SNE0728477", name: "किसनसिंह", guardian: "मोतीसिंह", relation: "father", house: "150/1", age: 31, gender: "male", sectionNumber: "1", sectionName: "1-राजपूत मोहल्ला,सरेवड़ी" },
  // Serial 156 is DELETED (Surendra Singh)
  { serial: "157", epic: "SNE1860055", name: "रतन सिंह", guardian: "भंवर सिंह", relation: "father", house: "151", age: 23, gender: "male", sectionNumber: "1", sectionName: "1-राजपूत मोहल्ला,सरेवड़ी" },
  { serial: "158", epic: "SNE1525575", name: "सुशीला", guardian: "अर्जुन सिंह", relation: "husband", house: "158", age: 25, gender: "female", sectionNumber: "1", sectionName: "1-राजपूत मोहल्ला,सरेवड़ी" },

  // Page 9 (Serials 159 to 188) - Section 2 (Start: 2-निचला बाड़ीया,सरेवड़ी)
  { serial: "159", epic: "SNE1830413", name: "कैलाश चंद्र", guardian: "उदय लाल", relation: "father", house: "01", age: 33, gender: "male", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "160", epic: "SNE1665215", name: "केयर देवी", guardian: "मदन लाल", relation: "husband", house: "117", age: 26, gender: "female", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "161", epic: "RJ/20/152/006496", name: "केली", guardian: "भेरूसिंह", relation: "husband", house: "151", age: 66, gender: "female", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "162", epic: "RJ/20/152/006474", name: "भंवरसिंह", guardian: "रामसिंह", relation: "father", house: "151", age: 61, gender: "male", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "163", epic: "SNE0182519", name: "गीता देवी", guardian: "भंवर सिंह", relation: "husband", house: "151", age: 57, gender: "female", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "164", epic: "RJ/20/152/006507", name: "उम्मेदसिंह", guardian: "भूरसिंह", relation: "father", house: "152", age: 96, gender: "male", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "165", epic: "SNE0602078", name: "डाऊ सिंह", guardian: "खीम सिंह", relation: "father", house: "153", age: 41, gender: "male", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "166", epic: "SNE0602086", name: "पुष्पा", guardian: "डाऊ सिंह", relation: "husband", house: "153", age: 38, gender: "female", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "167", epic: "SNE1606235", name: "सुंदर कुमारी", guardian: "पुष्पा", relation: "mother", house: "153", age: 22, gender: "female", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "168", epic: "RJ/20/152/006500", name: "वरदसिंह", guardian: "भूरसिंह", relation: "father", house: "154", age: 71, gender: "male", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "169", epic: "RJ/20/152/006495", name: "कमली", guardian: "वरदसिंह", relation: "husband", house: "154", age: 61, gender: "female", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "170", epic: "SNE0285189", name: "नवल सिंह", guardian: "वरद सिंह", relation: "father", house: "154", age: 36, gender: "male", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "171", epic: "SNE0285197", name: "गणी देवी", guardian: "नवल सिंह", relation: "husband", house: "154", age: 35, gender: "female", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "172", epic: "SNE1606391", name: "तोल सिंह", guardian: "कमली", relation: "mother", house: "154", age: 26, gender: "male", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "173", epic: "SNE1606516", name: "विजय सिंह", guardian: "कमली", relation: "mother", house: "154", age: 25, gender: "male", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "174", epic: "RJ/20/152/006499", name: "भंवरसिंह", guardian: "भूरसिंह", relation: "father", house: "155", age: 73, gender: "male", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "175", epic: "RJ/20/152/006497", name: "खेमी", guardian: "भंवरसिंह", relation: "husband", house: "155", age: 66, gender: "female", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "176", epic: "SNE0285205", name: "नैन सिंह", guardian: "भंवर सिंह", relation: "father", house: "155", age: 38, gender: "male", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "177", epic: "SNE0182501", name: "लक्ष्मी देवी", guardian: "नैनसिंह", relation: "husband", house: "155", age: 37, gender: "female", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "178", epic: "KDY0959080", name: "मोहनी", guardian: "सोहन सिंह", relation: "husband", house: "157", age: 43, gender: "female", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "179", epic: "KDY0959098", name: "दीप सिंह", guardian: "माँगू सिंह", relation: "father", house: "157", age: 42, gender: "male", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "180", epic: "SNE0182477", name: "राधादेवी", guardian: "दीप सिंह", relation: "husband", house: "157", age: 39, gender: "female", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "181", epic: "SNE0182485", name: "सवाई सिंह", guardian: "भागु सिंह", relation: "father", house: "157", age: 39, gender: "male", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "182", epic: "SNE0182493", name: "गीता देवी", guardian: "सवाई सिंह", relation: "husband", house: "157", age: 37, gender: "female", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "183", epic: "SNE0285213", name: "महेन्द्र सिंह", guardian: "रोड सिंह", relation: "father", house: "157", age: 35, gender: "male", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "184", epic: "RJ/20/152/007066", name: "मुली", guardian: "उदेसिंह", relation: "husband", house: "158", age: 101, gender: "female", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "185", epic: "RJ/20/152/006555", name: "कानसिंह", guardian: "उदेसिंह", relation: "father", house: "158", age: 68, gender: "male", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "186", epic: "RJ/20/152/006655", name: "धीसू", guardian: "उदेसिंह", relation: "father", house: "158", age: 65, gender: "male", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "187", epic: "RJ/20/152/007067", name: "अमरी", guardian: "कानसिंह", relation: "husband", house: "158", age: 63, gender: "female", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "188", epic: "SNE0602094", name: "अर्जुन सिंह", guardian: "कान सिंह", relation: "father", house: "158", age: 37, gender: "male", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },

  // Page 10 (Serials 189 to 218)
  { serial: "189", epic: "SNE0285239", name: "रतन सिंह", guardian: "कान सिंह", relation: "father", house: "158", age: 36, gender: "male", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "190", epic: "SNE0285221", name: "मन्जु", guardian: "रतन सिंह", relation: "husband", house: "158", age: 35, gender: "female", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "191", epic: "SNE1243344", name: "ईसर सिंह", guardian: "कान सिंह", relation: "father", house: "158", age: 26, gender: "male", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "192", epic: "SNE1864420", name: "केसर रावत", guardian: "कान सिंह", relation: "father", house: "158", age: 21, gender: "female", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "193", epic: "RJ/20/152/006492", name: "रोडसिंह", guardian: "नोलसिंह", relation: "father", house: "159", age: 71, gender: "male", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "194", epic: "SNE0285247", name: "विजय सिंह", guardian: "रोड सिंह", relation: "father", house: "159", age: 37, gender: "male", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "195", epic: "SNE1560945", name: "राधा बाई", guardian: "महेंद्र सिंह", relation: "husband", house: "159", age: 37, gender: "female", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "196", epic: "SNE0285254", name: "संजू", guardian: "विजय सिंह", relation: "husband", house: "159", age: 35, gender: "female", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "197", epic: "SNE0728493", name: "सगणांरी", guardian: "कालू", relation: "husband", house: "161", age: 66, gender: "female", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "198", epic: "RJ/20/152/007065", name: "भंवरी", guardian: "डालु", relation: "husband", house: "163", age: 54, gender: "female", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "199", epic: "SNE0460667", name: "सुरेश", guardian: "डालु", relation: "father", house: "163", age: 34, gender: "male", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "200", epic: "SNE0728501", name: "सुन्दर", guardian: "सुरेश", relation: "husband", house: "163", age: 32, gender: "female", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "201", epic: "KDY1115393", name: "हीरा लाल", guardian: "लालु", relation: "father", house: "164", age: 49, gender: "male", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "202", epic: "SNE0209908", name: "लादी", guardian: "हीरा", relation: "husband", house: "164", age: 43, gender: "female", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "203", epic: "RJ/20/152/006393", name: "छगन", guardian: "लालु", relation: "father", house: "165", age: 58, gender: "male", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "204", epic: "SNE0728519", name: "बरदी", guardian: "छगन", relation: "husband", house: "165", age: 45, gender: "female", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "205", epic: "SNE1243302", name: "डाली", guardian: "शांति लाल", relation: "father", house: "165", age: 27, gender: "female", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "206", epic: "RJ/20/152/007064", name: "दीपा", guardian: "गोकल", relation: "father", house: "166", age: 56, gender: "male", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "207", epic: "RJ/20/152/006520", name: "नर्मदा", guardian: "दीपा", relation: "husband", house: "166", age: 54, gender: "female", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "208", epic: "SNE0514125", name: "शान्तिलाल", guardian: "दीपा", relation: "father", house: "166", age: 37, gender: "male", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "209", epic: "SNE1243294", name: "मीना", guardian: "मुकेश", relation: "husband", house: "166", age: 28, gender: "female", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "210", epic: "SNE1240738", name: "मुकेश", guardian: "दीपालाल", relation: "father", house: "166", age: 27, gender: "male", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "211", epic: "SNE1240837", name: "गणपत लाल", guardian: "दीपा लाल", relation: "father", house: "166", age: 26, gender: "male", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "212", epic: "SNE1240704", name: "कमलेश", guardian: "दीपालाल", relation: "father", house: "166", age: 26, gender: "male", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "213", epic: "RJ/20/152/006680", name: "मांगु", guardian: "गोकल", relation: "father", house: "167", age: 66, gender: "male", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "214", epic: "RJ/20/152/006519", name: "सोहनी", guardian: "मांगु", relation: "husband", house: "167", age: 63, gender: "female", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "215", epic: "SNE0514158", name: "गेहरी लाल", guardian: "मांगीलाल", relation: "father", house: "167", age: 37, gender: "male", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "216", epic: "SNE0514133", name: "उदयलाल", guardian: "मांगु", relation: "father", house: "167", age: 34, gender: "male", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "217", epic: "SNE1240753", name: "मंजू", guardian: "गेहरीलाल", relation: "husband", house: "167", age: 34, gender: "female", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "218", epic: "SNE0514141", name: "देऊ देवी", guardian: "उदय लाल", relation: "husband", house: "167", age: 33, gender: "female", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },

  // Page 11 (Serials 219 to 248)
  { serial: "219", epic: "SNE1240688", name: "लादू", guardian: "मांगीलाल", relation: "father", house: "167", age: 26, gender: "male", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "220", epic: "SNE1725985", name: "तारा देवी", guardian: "छोटू लाल", relation: "husband", house: "167", age: 25, gender: "female", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "221", epic: "SNE1523570", name: "राजकुमार", guardian: "गोपी लाल", relation: "father", house: "167", age: 23, gender: "male", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "222", epic: "SNE1677897", name: "कविता देवी", guardian: "राकेश कुमार", relation: "husband", house: "167", age: 23, gender: "female", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "223", epic: "RJ/20/152/006317", name: "छगु", guardian: "गोकल", relation: "father", house: "168", age: 63, gender: "male", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "224", epic: "SNE1606847", name: "दिनेश", guardian: "छगु", relation: "father", house: "168", age: 33, gender: "male", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "225", epic: "SNE1015940", name: "रेखा", guardian: "दिनेश", relation: "husband", house: "168", age: 30, gender: "female", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "226", epic: "SNE1606748", name: "सीमा कुमारी", guardian: "छगु", relation: "father", house: "168", age: 25, gender: "female", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "227", epic: "SNE1606664", name: "शंकर", guardian: "छगु", relation: "father", house: "168", age: 23, gender: "male", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "228", epic: "KDY1223783", name: "गणेश", guardian: "मोहन", relation: "father", house: "169", age: 56, gender: "male", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "229", epic: "KDY1223817", name: "सोहनी", guardian: "गणेश", relation: "husband", house: "169", age: 54, gender: "female", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "230", epic: "SNE1376615", name: "कंकु", guardian: "बपता राम", relation: "husband", house: "169", age: 34, gender: "female", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "231", epic: "SNE1015916", name: "पूरणमल", guardian: "गणेश", relation: "father", house: "169", age: 27, gender: "male", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "232", epic: "SNE1702646", name: "नारायणी देवी", guardian: "पूरन मल", relation: "husband", house: "169", age: 27, gender: "female", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "233", epic: "SNE1819176", name: "रेखा सालवी", guardian: "गणेश सालवी", relation: "husband", house: "169", age: 26, gender: "female", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "234", epic: "RJ/20/152/006539", name: "मोहन", guardian: "देवा", relation: "father", house: "170", age: 86, gender: "male", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "235", epic: "KDY0910778", name: "जयराम", guardian: "मोहन", relation: "father", house: "170", age: 49, gender: "male", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "236", epic: "KDY2044436", name: "जमनी", guardian: "जयराम", relation: "husband", house: "170", age: 45, gender: "female", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "237", epic: "KDY1115401", name: "बगतावर", guardian: "मोहन", relation: "father", house: "170", age: 44, gender: "male", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "238", epic: "SNE1225689", name: "श्याम लाल", guardian: "जयराम", relation: "father", house: "170", age: 27, gender: "male", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "239", epic: "SNE1243310", name: "रेखा", guardian: "श्याम लाल", relation: "husband", house: "170", age: 26, gender: "female", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "240", epic: "SNE1692573", name: "प्रह्लाद", guardian: "जय राम", relation: "father", house: "170", age: 24, gender: "male", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "241", epic: "RJ/20/152/006527", name: "रूपा", guardian: "देवा", relation: "father", house: "171", age: 76, gender: "male", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "242", epic: "RJ/20/152/006467", name: "जमनी", guardian: "रूपा", relation: "husband", house: "171", age: 71, gender: "female", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "243", epic: "SNE1702380", name: "गोवर्धन लाल", guardian: "चांदी देवी", relation: "father", house: "171", age: 69, gender: "male", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "244", epic: "RJ/20/152/006485", name: "चान्दी", guardian: "गोवर्धन", relation: "husband", house: "171", age: 66, gender: "female", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "245", epic: "RJ/20/152/007095", name: "पेमालाल", guardian: "रूपालाल", relation: "father", house: "171", age: 49, gender: "male", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "246", epic: "RJ/20/152/007093", name: "लक्ष्मी", guardian: "पेमालाल", relation: "husband", house: "171", age: 48, gender: "female", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "247", epic: "KDY1346279", name: "गोपी लाल", guardian: "गोवर्धन", relation: "father", house: "171", age: 46, gender: "male", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "248", epic: "KDY1223825", name: "मोहनी", guardian: "गोपी", relation: "husband", house: "171", age: 44, gender: "female", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },

  // Page 12 (Serials 249 to 278)
  { serial: "249", epic: "KDY2044386", name: "रोशन", guardian: "रूपा", relation: "father", house: "171", age: 44, gender: "male", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "250", epic: "KDY2044394", name: "मीरा", guardian: "रोशन", relation: "husband", house: "171", age: 43, gender: "female", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "251", epic: "SNE1015932", name: "कुलदीप", guardian: "पेमा लाल", relation: "father", house: "171", age: 27, gender: "male", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "252", epic: "SNE1692300", name: "धन्नू सालवी", guardian: "कुलदीप सालवी", relation: "husband", house: "171", age: 25, gender: "female", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "253", epic: "SNE1560812", name: "ओमप्रकाश", guardian: "कुलदीप", relation: "mother", house: "171", age: 24, gender: "male", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "254", epic: "SNE1799881", name: "विकास सालवी", guardian: "रोशन लाल", relation: "father", house: "171", age: 20, gender: "male", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "255", epic: "RJ/20/152/006483", name: "लहरी", guardian: "हीरा", relation: "husband", house: "172", age: 86, gender: "female", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "256", epic: "RJ/20/152/006565", name: "नेनूराम", guardian: "हीरा", relation: "father", house: "172", age: 56, gender: "male", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "257", epic: "KDY1223809", name: "मोहनी", guardian: "नेनू", relation: "husband", house: "172", age: 56, gender: "female", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "258", epic: "KDY1250786", name: "रामेश्वर", guardian: "हीरा लाल", relation: "father", house: "172", age: 52, gender: "male", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "259", epic: "SNE0907741", name: "सन्तोष", guardian: "रामेश्वरलाल", relation: "husband", house: "172", age: 43, gender: "female", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "260", epic: "SNE1243351", name: "संपतलाल", guardian: "नेनूराम", relation: "father", house: "172", age: 26, gender: "male", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "261", epic: "RJ/20/152/006540", name: "चन्द्रप्रकाश", guardian: "हजारी", relation: "father", house: "173", age: 58, gender: "male", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "262", epic: "RJ/20/152/007063", name: "कमला", guardian: "चन्द्रप्रकाश", relation: "husband", house: "173", age: 56, gender: "female", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "263", epic: "SNE0220590", name: "हेमन्त कुमार", guardian: "चन्द्रप्रकाश", relation: "father", house: "173", age: 36, gender: "male", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "264", epic: "SNE0683300", name: "विजयलाल", guardian: "चन्द्रप्रकाश", relation: "father", house: "173", age: 33, gender: "male", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "265", epic: "SNE0728527", name: "पारसी", guardian: "विजयलाल", relation: "husband", house: "173", age: 32, gender: "female", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "266", epic: "SNE0907758", name: "पंकज", guardian: "चन्द्रप्रकाश", relation: "father", house: "173", age: 29, gender: "male", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "267", epic: "SNE1015924", name: "मुकेश", guardian: "चन्द्रप्रकाश", relation: "father", house: "173", age: 28, gender: "male", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "268", epic: "SNE1243328", name: "माया", guardian: "मुकेश", relation: "husband", house: "173", age: 27, gender: "female", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "269", epic: "SNE1523687", name: "सरोज देवी", guardian: "पंकज कुमार", relation: "husband", house: "173", age: 24, gender: "female", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "270", epic: "SNE0601906", name: "सोभाग्यवती", guardian: "हजारी", relation: "husband", house: "174", age: 86, gender: "female", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "271", epic: "SNE1554484", name: "धर्मेंद्र", guardian: "हजारीलाल", relation: "father", house: "174", age: 50, gender: "male", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "272", epic: "SNE0541896", name: "भवर", guardian: "दीपा", relation: "father", house: "175", age: 61, gender: "male", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "273", epic: "RJ/20/152/006504", name: "मांगी", guardian: "भंवर", relation: "husband", house: "175", age: 56, gender: "female", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "274", epic: "SNE0514174", name: "देवीलाल", guardian: "भंवर लाल", relation: "father", house: "175", age: 37, gender: "male", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "275", epic: "SNE1799865", name: "सुवा लाल सालवी", guardian: "भंवर लाल", relation: "father", house: "175", age: 23, gender: "male", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "276", epic: "SNE1764653", name: "राकेश सालवी", guardian: "भंवर लाल सालवी", relation: "father", house: "175", age: 20, gender: "male", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "277", epic: "RJ/20/152/006614", name: "उदा", guardian: "छोगा", relation: "father", house: "176", age: 66, gender: "male", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" },
  { serial: "278", epic: "SNE1616184", name: "कैलाशी", guardian: "शंकर", relation: "mother", house: "176", age: 37, gender: "female", sectionNumber: "2", sectionName: "2-निचला बाड़ीया,सरेवड़ी" }
];

async function importPages6to10() {
  console.log('========================================================================');
  console.log(' FETCHING & SAVING VOTER PAGES 6 TO 10 (SERIAL 151 TO 278)             ');
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

  for (const v of sarewadiPart6Pages6to10Voters) {
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
  console.log(`     SAREWADI PART 6 (179-सहाडा) - PAGES 6 TO 10 FETCH SUMMARY          `);
  console.log(`========================================================================`);
  console.log(`Total Cards Evaluated: 128 (Serials 151 to 278)`);
  console.log(`Total DELETED Excluded: 1 (Serial 156)`);
  console.log(`Total ACTIVE Processed: ${sarewadiPart6Pages6to10Voters.length}`);
  console.log(`New Saved: ${savedCount} | Updated: ${updatedCount}`);
  console.log(`------------------------------------------------------------------------\n`);

  await mongoose.disconnect();
  process.exit(0);
}

importPages6to10().catch(err => {
  console.error('Import Error:', err);
  process.exit(1);
});
