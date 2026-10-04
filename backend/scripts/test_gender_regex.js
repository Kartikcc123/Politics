const { execSync } = require('child_process');
const fs = require('fs');
const { decodeSecHindi } = require('../src/utils/secHindiDecoder');

function parseCardText(cardText) {
  const isDeleted = /विलोप|निरस्त|हटाया|Delet/i.test(cardText);
  let epic = null;
  const epicMatch = cardText.match(/([A-Z]{3}[0-9]{7}|RJ\/\d+\/\d+\/\d+)/i);
  if (epicMatch) epic = epicMatch[1].toUpperCase();

  let name = '';
  const nameMatch = cardText.match(/(?:नाम|नरम)\s*[:;]?\s*([^\n\r]+)/i);
  if (nameMatch) {
    let rawName = nameMatch[1].split(/(?:पिता|पति|माता|Photo|लिंग|ललग|मकान|मकरन|आजच|सपखजर|उम्र|आयु)/i)[0].trim();
    rawName = rawName.replace(/^\d+\s*/, '').replace(/[:;]/g, '').trim();
    if (!/^\d+$/.test(rawName)) {
      name = decodeSecHindi(rawName);
    }
  }

  let relationType = 'father';
  let guardianName = '';
  const relMatch = cardText.match(/(पिता|पति|माता|नपतर|पनत|मरतर)\s*(?:का\s*नाम|कर\s*नरम)?\s*[:;]?\s*([^\n\r]+)/i);
  if (relMatch) {
    const relWord = relMatch[1];
    if (/पति|पनत/i.test(relWord)) relationType = 'husband';
    else if (/माता|मरतर/i.test(relWord)) relationType = 'mother';
    else relationType = 'father';

    let rawRel = relMatch[2].split(/(?:मकान|मकरन|सपखजर|लिंग|ललग|आजच|उम्र|आयु|Photo)/i)[0].trim();
    rawRel = rawRel.replace(/[:;]/g, '').trim();
    guardianName = decodeSecHindi(rawRel);
  }

  let houseNumber = '';
  const houseMatch = cardText.match(/(?:मकान\s*संख्या|मकरन\s*सपखजर|मकान\s*नं|गृह\s*संख्या)\s*[:;]?\s*([^\n\r]+)/i);
  if (houseMatch) {
    let rawH = houseMatch[1].split(/(?:आयु|उम्र|लिंग|आजच|ललग|Photo)/i)[0].trim();
    rawH = rawH.replace(/(?:पिता|पति|माता|नाम|नरम|नपतर|पनत)/gi, '').trim();
    houseNumber = decodeSecHindi(rawH);
  }

  let age = null;
  const ageMatch = cardText.match(/(?:आयु|उम्र|आजच)\s*[:;]?\s*(\d{1,3})/i);
  if (ageMatch) age = parseInt(ageMatch[1], 10);

  let gender = '';
  if (/(?:ललग|लिंग)\s*[:;]?\s*(?:सल|महिला|स्त्री|female)/i.test(cardText)) {
    gender = 'female';
  } else if (/(?:ललग|लिंग)\s*[:;]?\s*(?:पचरष|पचरुष|पुरुष|male)/i.test(cardText)) {
    gender = 'male';
  }

  return { isDeleted, epic, name, relationType, guardianName, houseNumber, age, gender };
}

const sampleCardMale = "आजच: 60 ललग: पचरष";
const sampleCardFemale = "आजच: 58 ललग: सल";
console.log('Male test:', parseCardText(sampleCardMale).gender);
console.log('Female test:', parseCardText(sampleCardFemale).gender);
