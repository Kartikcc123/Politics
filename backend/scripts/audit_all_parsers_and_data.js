const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { decodeSecHindi } = require('../src/utils/secHindiDecoder');

const dirList = [
  'THALA', 'Mobile Devices', 'KHEMANA-', 'Nathdiyas', 'panotiya', 'palra', 'Raipur', 'sagrev', 
  'suras', 'mokhunda', 'Masinghpura_Wards', 'Masinghpur', 'Nahri_Wards', 'Nahri', '5', 
  'boriyapur', 'w', 'Borana', 'o', 'c', 'narayankhera', 'nandasa', 'WithoutPhoto'
];

const GP_CONFIG = {
  'AASHAHOLI': { hindi: 'आशाहोली', defaultVillage: 'आशाहोली' },
  'BAGAR': { hindi: 'बागड़', defaultVillage: 'बागड़' },
  'BAGOLIYA': { hindi: 'बागोलिया', defaultVillage: 'बागोलिया' },
  'BAKAN': { hindi: 'बकाण', defaultVillage: 'बकाण' },
  'BHEETA': { hindi: 'भींटा', defaultVillage: 'भींटा' },
  'BORANA': { hindi: 'बोराणा', defaultVillage: 'बोराणा' },
  'BORIYAPURA': { hindi: 'बोरियापुरा', defaultVillage: 'बोरियापुरा' },
  'CHAROT': { hindi: 'चारोट', defaultVillage: 'चारोट' },
  'DEVRIYA': { hindi: 'देवरिया', defaultVillage: 'देवरिया' },
  'GALWA': { hindi: 'गलवा', defaultVillage: 'गलवा' },
  'GALYAWADI': { hindi: 'गल्यावड़ी', defaultVillage: 'गल्यावड़ी' },
  'JHADOL': { hindi: 'झाड़ोल', defaultVillage: 'झाड़ोल' },
  'KALALKHEDI': { hindi: 'कलालखेड़ी', defaultVillage: 'कलालखेड़ी' },
  'KHAKHAR MALA': { hindi: 'खाखरमाला', defaultVillage: 'खाखरमाला' },
  'KHEMANA': { hindi: 'खेमाणा', defaultVillage: 'खेमाणा' },
  'KOT': { hindi: 'कोट', defaultVillage: 'कोट' },
  'MASINGHPURA': { hindi: 'मासिंगपुरा', defaultVillage: 'मासिंगपुरा' },
  'MOKHUNDA': { hindi: 'मोखुन्दा', defaultVillage: 'मोखुन्दा' },
  'NAHRI': { hindi: 'नाहरी', defaultVillage: 'नाहरी' },
  'NANDSHA JAGEER': { hindi: 'नान्दशा जागीर', defaultVillage: 'नान्दशा जागीर' },
  'NARAYAN KHERA': { hindi: 'नारायणखेड़ा', defaultVillage: 'नारायणखेड़ा' },
  'NATHDIYAAS': { hindi: 'नाथड़ियास', defaultVillage: 'नाथड़ियास' },
  'PALRA': { hindi: 'पालरा', defaultVillage: 'पालरा' },
  'PANOTIYA': { hindi: 'पानोतिया', defaultVillage: 'पानोतिया' },
  'PEETHA KA KHERA': { hindi: 'पीथा का खेड़ा', defaultVillage: 'पीथा का खेड़ा' },
  'RAIPUR': { hindi: 'रायपुर', defaultVillage: 'रायपुर' },
  'SAGREV': { hindi: 'सागरेव', defaultVillage: 'सागरेव' },
  'SURAS': { hindi: 'सुरास', defaultVillage: 'सुरास' },
  'THALA': { hindi: 'थला', defaultVillage: 'थला' }
};

const GP_ALIASES = {
  'NATHDIYAS': 'NATHDIYAAS',
  'NANDSHA': 'NANDSHA JAGEER',
  'NARAYANKHERA': 'NARAYAN KHERA',
  'KHAKHARMALA': 'KHAKHAR MALA',
  'PEETHA': 'PEETHA KA KHERA',
  'PEETHAKAKHERA': 'PEETHA KA KHERA',
  'BORIYAPUR': 'BORIYAPURA',
  'MASINGHPUR': 'MASINGHPURA'
};

function normalizeGp(name) {
  let clean = name.trim().toUpperCase().replace(/[-_]/g, ' ').replace(/\s+/g, ' ');
  const noSpace = clean.replace(/\s+/g, '');
  if (GP_CONFIG[clean]) return clean;
  if (GP_ALIASES[clean]) return GP_ALIASES[clean];
  if (GP_ALIASES[noSpace]) return GP_ALIASES[noSpace];
  for (const k of Object.keys(GP_CONFIG)) {
    if (clean.startsWith(k) || k.startsWith(clean)) return k;
  }
  return clean;
}

function scanAll(dir) {
  let res = [];
  if (!fs.existsSync(dir)) return res;
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const full = path.join(dir, item);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      res = res.concat(scanAll(full));
    } else if (item.toLowerCase().endsWith('.pdf')) {
      res.push({ path: full, name: item });
    }
  }
  return res;
}

const allPdfs = [];
for (const d of dirList) {
  const p = path.join('C:\\Users\\Ashish Sharma\\Downloads', d);
  allPdfs.push(...scanAll(p));
}

// Add Peetha if in Downloads root
if (fs.existsSync('C:\\Users\\Ashish Sharma\\Downloads\\PEETHA KA KHERA-Ward No-001.pdf')) {
  allPdfs.push({ path: 'C:\\Users\\Ashish Sharma\\Downloads\\PEETHA KA KHERA-Ward No-001.pdf', name: 'PEETHA KA KHERA-Ward No-001.pdf' });
}
if (fs.existsSync('C:\\Users\\Ashish Sharma\\Downloads\\PEETHA KA KHERA-Ward No-002.pdf')) {
  allPdfs.push({ path: 'C:\\Users\\Ashish Sharma\\Downloads\\PEETHA KA KHERA-Ward No-002.pdf', name: 'PEETHA KA KHERA-Ward No-002.pdf' });
}

const gpWardPdfs = {};
for (const pdf of allPdfs) {
  const m = pdf.name.match(/([A-Za-z\s-]+?)-Ward\s*No-?0*(\d+)\.pdf/i);
  if (m) {
    const rawGp = m[1].trim();
    const gpKey = normalizeGp(rawGp);
    const wardNo = parseInt(m[2], 10);
    if (!gpWardPdfs[gpKey]) gpWardPdfs[gpKey] = {};
    gpWardPdfs[gpKey][wardNo] = pdf.path;
  }
}

// Import parser from master_import_all_29_panchayats.js logic
function cleanField(text) {
  if (!text) return '';
  return text
    .replace(/Photo\s*is\s*Available/gi, '')
    .replace(/Available/gi, '')
    .replace(/Photo/gi, '')
    .replace(/is/gi, '')
    .replace(/[\r\n]+/g, ' ')
    .trim();
}

function parseWardPdf(pdfPath, gpHindi, defaultVillage) {
  let xml = '';
  try {
    xml = execSync(`pdftotext -bbox "${pdfPath}" -`, { encoding: 'utf8', maxBuffer: 100 * 1024 * 1024 });
  } catch (err) {
    return { error: err.message, voters: [] };
  }

  const pageRegex = /<page\s+width="([\d.]+)"\s+height="([\d.]+)">([\s\S]*?)<\/page>/g;
  let pageMatch;
  let pageIndex = 0;
  
  let wardNumber = '1';
  let villageName = defaultVillage;
  const wardFileM = pdfPath.match(/Ward\s*No-?0*(\d+)/i);
  if (wardFileM) wardNumber = String(parseInt(wardFileM[1], 10));

  const allVoters = [];

  while ((pageMatch = pageRegex.exec(xml)) !== null) {
    pageIndex++;
    const pageXml = pageMatch[3];

    // Page 1: Extract village name if specified
    if (pageIndex === 1) {
      const page1Text = pageXml.replace(/<[^>]+>/g, ' ');
      const villM = page1Text.match(/(?:गांव|गाँव|ग्राम|महरललर|मोहल्ला|वार्ड)\s*:\s*([^\n\r,]+)/);
      if (villM) {
        const extractedVillage = cleanField(decodeSecHindi(villM[1]));
        if (extractedVillage && extractedVillage.length > 2 && !extractedVillage.includes('राजस्थान') && !extractedVillage.includes('पंचायत')) {
          villageName = extractedVillage;
        }
      }
      continue;
    }

    const wordRegex = /<word\s+xMin="([\d.]+)"\s+yMin="([\d.]+)"\s+xMax="([\d.]+)"\s+yMax="([\d.]+)">([\s\S]*?)<\/word>/g;
    let wordMatch;
    const words = [];
    while ((wordMatch = wordRegex.exec(pageXml)) !== null) {
      words.push({
        xMin: parseFloat(wordMatch[1]),
        yMin: parseFloat(wordMatch[2]),
        xMax: parseFloat(wordMatch[3]),
        yMax: parseFloat(wordMatch[4]),
        text: wordMatch[5].trim()
      });
    }

    const rawPageText = words.map(w => w.text).join(' ');
    const decodedPageText = decodeSecHindi(rawPageText);
    if (decodedPageText.includes('हस्ताक्षर') || decodedPageText.includes('कुल पृष्ठ') || words.length < 30) {
      continue;
    }

    // Identify Card Boxes across 3 columns
    const serialCandidates = [];
    for (const w of words) {
      if (w.yMin >= 68 && w.yMin <= 740) {
        if (/^[OESR]?\d{1,4}$/.test(w.text)) {
          const num = parseInt(w.text.replace(/^[OESR]/, ''), 10);
          if (num >= 1 && num <= 2500) {
            let col = -1;
            if (w.xMin >= 25 && w.xMin <= 80) col = 0;
            else if (w.xMin >= 205 && w.xMin <= 265) col = 1;
            else if (w.xMin >= 380 && w.xMin <= 445) col = 2;

            if (col !== -1) {
              const isDel = /^[OESR]/.test(w.text);
              serialCandidates.push({
                serial: num,
                isDeleted: isDel,
                x: w.xMin,
                y: w.yMin,
                col
              });
            }
          }
        }
      }
    }

    if (serialCandidates.length < 3) continue;

    for (const sc of serialCandidates) {
      let cardXMin, cardXMax;
      if (sc.col === 0) { cardXMin = 25; cardXMax = 205; }
      else if (sc.col === 1) { cardXMin = 205; cardXMax = 380; }
      else { cardXMin = 380; cardXMax = 565; }

      const cardYMin = sc.y - 10;
      const cardYMax = sc.y + 68;

      const cardWords = words.filter(w =>
        w.xMin >= cardXMin - 5 &&
        w.xMax <= cardXMax + 10 &&
        w.yMin >= cardYMin &&
        w.yMax <= cardYMax + 8
      );

      let epic = '';
      for (const w of cardWords) {
        if (w.yMin <= sc.y + 14) {
          const epM = w.text.match(/[A-Z]{2,4}\/?\d{6,10}|RJ\/\d{2}\/\d{2,4}\/\d{5,8}/i);
          if (epM) {
            epic = epM[0].toUpperCase();
            break;
          }
        }
      }

      if (!epic) {
        const topWords = cardWords.filter(w => w.yMin <= sc.y + 14).map(w => w.text).join('');
        const epM = topWords.match(/([A-Z]{2,4}\/?\d{6,10}|RJ\/\d{2}\/\d{2,4}\/\d{5,8})/i);
        if (epM) epic = epM[1].toUpperCase();
      }

      const rawCardText = cardWords.map(w => w.text).join(' ');
      const cleanCard = decodeSecHindi(rawCardText);
      let serial = sc.serial;

      let name = '';
      const nameM = cleanCard.match(/(?:नाम|नरम|रिम)\s*:\s*([^:]+?)(?=(?:पिता|पति|माता|नपतर|पनत|मरतर|मकान|मकरन|Photo|Available|$))/);
      if (nameM) name = cleanField(nameM[1]);

      let guardian = '';
      let relationType = 'father';
      const guardM = cleanCard.match(/(?:(पिता|पति|माता|नपतर|पनत|मरतर)\s*का?\s*नाम|पिता|पति|माता|नपतर|पनत|मरतर)\s*:\s*([^:]+?)(?=(?:मकान|मकरन|आयु|आजच|Photo|$))/);
      if (guardM) {
        if (/(?:पति|पनत)/.test(guardM[1])) relationType = 'husband';
        else if (/(?:माता|मरतर)/.test(guardM[1])) relationType = 'mother';
        guardian = cleanField(guardM[2]);
      }

      let house = '';
      const houseM = cleanCard.match(/(?:मकान|मकरन)\s*(?:संख्या|सपखजर)?\s*:\s*([^:]+?)(?=(?:आयु|आजच|Photo|$))/);
      if (houseM) house = cleanField(houseM[1]);

      let age = null;
      let gender = 'male';
      const ageM = cleanCard.match(/(?:आयु|आजच)\s*:\s*(\d+)/);
      if (ageM) age = parseInt(ageM[1], 10);
      if (/(?:सल|स्त्री|F|महिला)/i.test(cleanCard)) gender = 'female';

      if (!name && !epic && !guardian) continue;

      allVoters.push({
        serial,
        epic,
        name,
        guardianName: guardian,
        relationType,
        houseNumber: house,
        age,
        gender,
        isDeleted: sc.isDeleted,
        wardNumber,
        villageName,
        gpHindi
      });
    }
  }

  // Deduplicate
  const bySerial = new Map();
  for (const v of allVoters) {
    if (v.serial) {
      if (!bySerial.has(v.serial) || (!v.isDeleted && bySerial.get(v.serial).isDeleted)) {
        bySerial.set(v.serial, v);
      }
    }
  }

  return {
    wardNumber,
    villageName,
    voters: Array.from(bySerial.values()).sort((a,b) => (a.serial||0) - (b.serial||0))
  };
}

console.log('Testing sample parsing for 1 ward per GP:');
for (const [gpKey, wardsObj] of Object.entries(gpWardPdfs)) {
  const config = GP_CONFIG[gpKey] || { hindi: gpKey, defaultVillage: gpKey };
  const ward1 = Object.keys(wardsObj).sort((a,b)=>a-b)[0];
  const pdfPath = wardsObj[ward1];
  const res = parseWardPdf(pdfPath, config.hindi, config.defaultVillage);
  const sampleVoters = res.voters.slice(0, 3);
  console.log(`\n[${config.hindi}] Ward ${res.wardNumber} (Village: ${res.villageName}) -> ${res.voters.length} Voters`);
  sampleVoters.forEach(v => {
    console.log(`   #${v.serial} | EPIC: ${v.epic || 'NONE'} | Name: "${v.name}" | Rel: ${v.relationType} "${v.guardianName}" | House: ${v.houseNumber} | Age: ${v.age}`);
  });
}
