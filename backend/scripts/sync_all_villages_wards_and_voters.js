const mongoose = require('mongoose');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const Member = require('../src/models/Member');
const { decodeSecHindi } = require('../src/utils/secHindiDecoder');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://187.127.173.42:27017/political_crm';

const dirList = [
  'THALA', 'Mobile Devices', 'KHEMANA-', 'Nathdiyas', 'panotiya', 'palra', 'Raipur', 'sagrev', 
  'suras', 'mokhunda', 'Masinghpura_Wards', 'Masinghpur', 'Nahri_Wards', 'Nahri', '5', 
  'boriyapur', 'w', 'Borana', 'o', 'c', 'narayankhera', 'nandasa', 'WithoutPhoto'
];

// Official Ward-to-Village Mappings
const VILLAGE_RULES = {
  'AASHAHOLI': (w) => 'आशाहोली',
  'BAGAR': (w) => {
    if (['1', '2'].includes(w)) return 'जलामली';
    if (w === '3') return 'मंडी';
    if (['4', '5'].includes(w)) return 'मियाला';
    if (['6', '7', '8'].includes(w)) return 'बागड़';
    if (w === '9') return 'कारोल';
    return 'बागड़';
  },
  'BAGOLIYA': (w) => {
    if (['1', '2', '3', '4'].includes(w)) return 'बागोलिया';
    if (['5', '6'].includes(w)) return 'पाटियाखेड़ा';
    if (['7', '8', '9'].includes(w)) return 'गाड़रीखेड़ा';
    return 'बागोलिया';
  },
  'BAKAN': (w) => {
    if (w === '1') return 'लखाहोली';
    if (w === '2') return 'दियास';
    if (['3', '4', '5'].includes(w)) return 'राणास';
    if (['6', '7'].includes(w)) return 'बकाण';
    return 'बकाण';
  },
  'BHEETA': (w) => {
    if (['1', '2', '3'].includes(w)) return 'भींटा';
    if (['4', '5'].includes(w)) return 'सरेवड़ी';
    if (w === '6') return 'सरेवड़ी का बाड़ीया';
    if (w === '7') return 'जोरावरपुरा';
    if (['8', '9', '10'].includes(w)) return 'भटेवर';
    if (w === '11') return 'रूपाखेड़ा';
    return 'भींटा';
  },
  'BORANA': (w) => {
    if (['1', '2', '3', '4', '5'].includes(w)) return 'बोराणा';
    if (['6', '7'].includes(w)) return 'कांखरिया';
    if (['8', '9', '10', '11'].includes(w)) return 'धौला का खेड़ा';
    return 'बोराणा';
  },
  'BORIYAPURA': (w) => 'बोरियापुरा',
  'CHAROT': (w) => {
    if (['1', '2'].includes(w)) return 'आसूणा';
    if (['3', '4'].includes(w)) return 'चारोट';
    if (w === '5') return 'गोविन्दपुरा';
    if (['6', '7'].includes(w)) return 'सिंहपुरा';
    return 'चारोट';
  },
  'DEVRIYA': (w) => 'देवरिया',
  'GALWA': (w) => {
    if (['1', '2'].includes(w)) return 'गलवा';
    if (w === '3') return 'सज्जनपुरा';
    if (w === '4') return 'लाठियाखेड़ी';
    if (w === '5') return 'रालीखेड़ा';
    if (['6', '7'].includes(w)) return 'टोकरा';
    return 'गलवा';
  },
  'GALYAWADI': (w) => {
    if (['1', '2'].includes(w)) return 'केमुनिया';
    if (['3', '4'].includes(w)) return 'पचातरों का खेड़ा';
    return 'गल्यावड़ी';
  },
  'JHADOL': (w) => {
    if (w === '9') return 'नयाखेड़ा';
    return 'झाड़ोल';
  },
  'KALALKHEDI': (w) => {
    if (w === '1') return 'थोरियाखेड़ा';
    if (['2', '3', '4'].includes(w)) return 'कलालखेड़ी';
    return 'बाड़ी';
  },
  'KHAKHAR MALA': (w) => {
    if (w === '1') return 'नान्दूड़ा';
    if (w === '2') return 'खाखरमाला';
    if (w === '3') return 'रेबारियों की ढाणी';
    if (['4', '5', '6'].includes(w)) return 'टुंगच';
    if (w === '7') return 'सिरोड़ी';
    return 'खाखरमाला';
  },
  'KHEMANA': (w) => {
    if (w === '7') return 'थोरियाखेड़ा';
    return 'खेमाणा';
  },
  'KOT': (w) => 'कोट',
  'MASINGHPURA': (w) => {
    if (['5', '6'].includes(w)) return 'डांगड़ा';
    if (w === '7') return 'डांगड़ी';
    return 'मासिंगपुरा';
  },
  'MOKHUNDA': (w) => {
    if (w === '9') return 'माण्डकाखेड़ा';
    return 'मोखुन्दा';
  },
  'NAHRI': (w) => {
    if (['7', '8', '9'].includes(w)) return 'फतेहपुरा';
    return 'नाहरी';
  },
  'NANDSHA JAGEER': (w) => 'नान्दशा जागीर',
  'NARAYAN KHERA': (w) => 'नारायणखेड़ा',
  'NATHDIYAAS': (w) => 'नाथड़ियास',
  'PALRA': (w) => 'पालरा',
  'PANOTIYA': (w) => {
    if (['4', '5', '6', '7'].includes(w)) return 'जोगरास';
    return 'पानोतिया';
  },
  'PEETHA KA KHERA': (w) => {
    if (['5', '6'].includes(w)) return 'मंडोल';
    if (['7', '8'].includes(w)) return 'रामा';
    if (['9', '10', '11'].includes(w)) return 'लड़की';
    return 'पीथा का खेड़ा';
  },
  'RAIPUR': (w) => 'रायपुर',
  'SAGREV': (w) => 'सागरेव',
  'SURAS': (w) => 'सुरास',
  'THALA': (w) => {
    if (['6', '7'].includes(w)) return 'पिथलपुरा';
    if (['8', '9'].includes(w)) return 'मोखमपुरा';
    return 'थला';
  }
};

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

function parseWardPdfFull(pdfPath, gpHindi, defaultVillage, gpKey) {
  const xml = execSync(`pdftotext -bbox "${pdfPath}" -`, { encoding: 'utf8', maxBuffer: 100 * 1024 * 1024 });
  const pageRegex = /<page\s+width="([\d.]+)"\s+height="([\d.]+)">([\s\S]*?)<\/page>/g;
  let pageMatch;
  let pageIndex = 0;
  
  let wardNumber = '1';
  const wardFileM = pdfPath.match(/Ward\s*No-?0*(\d+)/i);
  if (wardFileM) wardNumber = String(parseInt(wardFileM[1], 10));

  let villageName = defaultVillage;
  if (VILLAGE_RULES[gpKey]) {
    villageName = VILLAGE_RULES[gpKey](wardNumber);
  }

  const epicPattern = /(?:[A-Z]{2,4}\/?\d{6,10})|(?:RJ\/\d{2}\/\d{2,4}\/\d{5,8})/i;
  const allVoters = [];

  while ((pageMatch = pageRegex.exec(xml)) !== null) {
    pageIndex++;
    if (pageIndex <= 2) continue; // skip cover/summary

    const pageContent = pageMatch[3];
    const wordRegex = /<word\s+xMin="([\d.]+)"\s+yMin="([\d.]+)"\s+xMax="([\d.]+)"\s+yMax="([\d.]+)">([^<]+)<\/word>/g;
    let wMatch;
    const words = [];
    while ((wMatch = wordRegex.exec(pageContent)) !== null) {
      const text = wMatch[5].trim();
      if (!text) continue;
      words.push({
        xMin: parseFloat(wMatch[1]),
        yMin: parseFloat(wMatch[2]),
        xMax: parseFloat(wMatch[3]),
        yMax: parseFloat(wMatch[4]),
        text
      });
    }

    const fullPageText = words.map(w => w.text).join(' ');
    if (/हस्ताक्षर|कुल\s*मतदाताओं|Summary/i.test(fullPageText) && !words.some(w => epicPattern.test(w.text))) {
      continue;
    }

    const bodyWords = words.filter(w => w.yMin >= 130 && w.yMax <= 790);
    if (bodyWords.length === 0) continue;

    // Identify EPIC tokens & serial anchors
    const epicWords = bodyWords.filter(w => epicPattern.test(w.text));
    const serialWords = bodyWords.filter(w =>
      /^[OESR]?\d{1,4}$/.test(w.text) &&
      (w.xMin < 65 || (w.xMin > 200 && w.xMin < 250) || (w.xMin > 375 && w.xMin < 430))
    );

    const usedSerials = new Set();
    const cards = [];

    for (const epicWord of epicWords) {
      let matchedSerial = serialWords.find(s =>
        !usedSerials.has(s) &&
        s.xMin < epicWord.xMin &&
        (epicWord.xMin - s.xMin) < 85 &&
        Math.abs(s.yMin - epicWord.yMin) <= 8
      );

      let isDeleted = false;
      let serial = null;

      if (matchedSerial) {
        usedSerials.add(matchedSerial);
        const raw = matchedSerial.text;
        if (/^[OESR]/.test(raw)) isDeleted = true;
        serial = parseInt(raw.replace(/^[OESR]/, ''), 10);
      }

      const delWord = bodyWords.find(w =>
        ['O', 'E', 'S', 'R'].includes(w.text) &&
        w.xMin < epicWord.xMin &&
        (epicWord.xMin - w.xMin) < 95 &&
        Math.abs(w.yMin - epicWord.yMin) <= 8
      );
      if (delWord) isDeleted = true;

      let colLeft = 20, colRight = 205;
      if (epicWord.xMin >= 200 && epicWord.xMin < 380) {
        colLeft = 205; colRight = 380;
      } else if (epicWord.xMin >= 380) {
        colLeft = 380; colRight = 565;
      }

      const cardYMin = epicWord.yMin - 8;
      const cardYMax = epicWord.yMin + 72;

      const cardWords = bodyWords.filter(w =>
        w.xMin >= colLeft - 5 &&
        w.xMax <= colRight + 5 &&
        w.yMin >= cardYMin &&
        w.yMax <= cardYMax
      );

      cards.push({
        page: pageIndex,
        serial,
        epic: epicWord.text.match(epicPattern)[0].toUpperCase(),
        isDeleted,
        cardWords
      });
    }

    // Catch cards without EPIC
    for (const sw of serialWords) {
      if (!usedSerials.has(sw)) {
        const isAge = bodyWords.some(other =>
          (other.text.includes('आजच') || other.text.includes('आयु')) &&
          Math.abs(other.yMin - sw.yMin) <= 6 &&
          Math.abs(other.xMin - sw.xMin) < 50
        );
        if (isAge) continue;

        let colLeft = 20, colRight = 205;
        if (sw.xMin >= 200 && sw.xMin < 380) {
          colLeft = 205; colRight = 380;
        } else if (sw.xMin >= 380) {
          colLeft = 380; colRight = 565;
        }

        const isDel = /^[OESR]/.test(sw.text);
        const sNum = parseInt(sw.text.replace(/^[OESR]/, ''), 10);
        const cardYMin = sw.yMin - 8;
        const cardYMax = sw.yMin + 72;

        const cardWords = bodyWords.filter(w =>
          w.xMin >= colLeft - 5 &&
          w.xMax <= colRight + 5 &&
          w.yMin >= cardYMin &&
          w.yMax <= cardYMax
        );

        const text = cardWords.map(w => w.text).join(' ');
        if (text.includes('नरम') || text.includes('नाम')) {
          usedSerials.add(sw);
          cards.push({
            page: pageIndex,
            serial: sNum,
            epic: '',
            isDeleted: isDel,
            cardWords
          });
        }
      }
    }

    // Parse card fields
    for (const card of cards) {
      const sorted = [...card.cardWords].sort((a,b) => {
        if (Math.abs(a.yMin - b.yMin) > 4) return a.yMin - b.yMin;
        return a.xMin - b.xMin;
      });

      const fullRaw = sorted.map(w => w.text).join(' ');

      let name = '';
      const nameM = fullRaw.match(/(?:नरम|नाम)\s*:\s*([^:]+?)(?=(?:नपतर|पिता|पनत|पति|मरतर|माता|मकरन|मकान|आजच|आयु|Photo|Available|$))/);
      if (nameM) name = decodeSecHindi(nameM[1].trim());

      let guardian = '';
      let relationType = 'father';
      const guardM = fullRaw.match(/(?:(नपतर|पिता|पनत|पति|मरतर|माता)\s*(?:कर|का)?\s*(?:नरम|नाम)?)\s*:\s*([^:]+?)(?=(?:मकरन|मकान|आजच|आयु|Photo|Available|$))/);
      if (guardM) {
        if (/(?:पनत|पति)/.test(guardM[1])) relationType = 'husband';
        else if (/(?:मरतर|माता)/.test(guardM[1])) relationType = 'mother';
        guardian = decodeSecHindi(guardM[2].trim());
      }

      let house = '';
      const houseM = fullRaw.match(/(?:मकरन|मकान)\s*(?:सपखजर|संख्या)?\s*:\s*([^:]+?)(?=(?:आजच|आयु|Photo|Available|$))/);
      if (houseM) house = decodeSecHindi(houseM[1].trim());

      let age = null;
      const ageM = fullRaw.match(/(?:आजच|आयु)\s*:\s*(\d+)/);
      if (ageM) age = parseInt(ageM[1], 10);

      let gender = 'male';
      if (/(?:सल|स्त्री|महिला|F)/.test(fullRaw)) gender = 'female';

      if (!name && !card.epic && !guardian) continue;

      allVoters.push({
        serial: card.serial,
        epic: card.epic,
        name,
        guardianName: guardian,
        relationType,
        houseNumber: house,
        age,
        gender,
        isDeleted: card.isDeleted,
        wardNumber,
        villageName,
        gpHindi
      });
    }
  }

  // Deduplicate by serial
  const bySerial = new Map();
  for (const v of allVoters) {
    if (v.serial) {
      if (!bySerial.has(v.serial) || (!v.isDeleted && bySerial.get(v.serial).isDeleted)) {
        bySerial.set(v.serial, v);
      }
    }
  }

  return Array.from(bySerial.values()).sort((a,b) => (a.serial||0) - (b.serial||0));
}

async function runMasterSyncAll() {
  console.log('========================================================================');
  console.log('   FULL RE-SYNC: 100% ACCURATE MATDATA KRAMANK, NAMES & VILLAGE LOCATIONS');
  console.log('========================================================================');
  console.log('Connecting to MongoDB:', MONGO_URI);
  await mongoose.connect(MONGO_URI);
  console.log('Connected successfully to Database!\n');

  // Discover all PDFs across all 23 folders
  const allPdfs = [];
  for (const d of dirList) {
    const p = path.join('C:\\Users\\Ashish Sharma\\Downloads', d);
    allPdfs.push(...scanAll(p));
  }

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

  const grandSummary = {
    totalGps: Object.keys(gpWardPdfs).length,
    totalWards: 0,
    totalVotersSynced: 0,
    matchedAssembly: 0,
    wardOnlyCreatedOrUpdated: 0,
    details: []
  };

  for (const [gpKey, wardsObj] of Object.entries(gpWardPdfs)) {
    const config = GP_CONFIG[gpKey] || { hindi: gpKey, defaultVillage: gpKey };
    const gpHindi = config.hindi;
    const defaultVillage = config.defaultVillage;
    const wardNos = Object.keys(wardsObj).map(Number).sort((a,b) => a - b);
    grandSummary.totalWards += wardNos.length;

    console.log(`\n------------------------------------------------------------------------`);
    console.log(`Processing Gram Panchayat: ${gpHindi} (${gpKey}) [${wardNos.length} Wards]`);
    console.log(`------------------------------------------------------------------------`);

    let gpMatched = 0;
    let gpWardOnly = 0;
    let gpTotalVoters = 0;

    // Parse all wards for this GP
    const gpParsedWards = [];
    const allEpics = new Set();

    for (const wardNo of wardNos) {
      const pdfPath = wardsObj[wardNo];
      const voters = parseWardPdfFull(pdfPath, gpHindi, defaultVillage, gpKey);
      gpParsedWards.push({ wardNo: String(wardNo), pdfPath, voters });
      for (const v of voters) {
        if (v.epic) allEpics.add(v.epic);
      }
    }

    // Load existing members from MongoDB for these EPICs
    const epicArray = Array.from(allEpics);
    const existingMap = new Map();
    const CHUNK_SIZE = 1000;
    for (let i = 0; i < epicArray.length; i += CHUNK_SIZE) {
      const chunk = epicArray.slice(i, i + CHUNK_SIZE);
      const docs = await Member.find({ voterId: { $in: chunk } }).select('_id voterId name relativeName guardianName wardSerialMap');
      for (const doc of docs) {
        if (!existingMap.has(doc.voterId)) {
          existingMap.set(doc.voterId, doc);
        }
      }
    }

    for (const item of gpParsedWards) {
      const wardNo = item.wardNo;
      const voters = item.voters;
      let wardMatched = 0;
      let wardCreated = 0;
      let bulkOps = [];

      for (const v of voters) {
        if (v.isDeleted) continue; // skip deleted cards

        const serialStr = String(v.serial || '');
        const wardStr = String(wardNo);
        const village = v.villageName || defaultVillage;

        if (v.epic && existingMap.has(v.epic)) {
          // Existing Assembly Member Match - Update with exact verified Ward PDF data
          const existing = existingMap.get(v.epic);
          const updateFields = {
            hasMunicipalMembership: true,
            gramPanchayat: gpHindi,
            village: village,
            wardNumber: wardStr,
            wardVoterSerial: serialStr,
            [`wardSerialMap.${wardStr}`]: serialStr
          };
          if (serialStr) {
            updateFields.voterSerial = serialStr;
          }
          if (v.name && !v.name.startsWith('मतदाता')) {
            updateFields.name = v.name;
          }
          if (v.guardianName) {
            updateFields.guardianName = v.guardianName;
            updateFields.relativeName = v.guardianName;
          }
          if (v.relationType) {
            updateFields.relationType = v.relationType;
          }
          if (v.houseNumber) {
            updateFields.houseNumber = v.houseNumber;
          }
          if (v.age) {
            updateFields.age = v.age;
          }
          if (v.gender) {
            updateFields.gender = v.gender;
          }

          bulkOps.push({
            updateOne: {
              filter: { _id: existing._id },
              update: {
                $set: updateFields,
                $addToSet: { municipalWardNumbers: wardStr }
              }
            }
          });
          wardMatched++;
        } else {
          // Ward-Only Member (Upsert by gramPanchayat, wardNumber, wardVoterSerial)
          const newDoc = {
            contactType: 'voter',
            name: v.name || `मतदाता #${v.serial}`,
            guardianName: v.guardianName || '',
            relativeName: v.guardianName || '',
            relationType: v.relationType || 'father',
            houseNumber: v.houseNumber || '',
            age: v.age || null,
            gender: v.gender || '',
            gramPanchayat: gpHindi,
            village: village,
            wardNumber: wardStr,
            wardVoterSerial: serialStr,
            voterSerial: serialStr,
            municipalWardNumbers: [wardStr],
            hasMunicipalMembership: true,
            hasAssemblyMembership: false,
            [`wardSerialMap.${wardStr}`]: serialStr
          };

          if (v.epic) {
            newDoc.voterId = v.epic;
          } else {
            newDoc.voterId = `WARD_${gpKey}_W${wardStr}_S${serialStr}`;
          }

          const filterCriteria = {
            gramPanchayat: gpHindi,
            wardNumber: wardStr,
            wardVoterSerial: serialStr
          };

          bulkOps.push({
            updateOne: {
              filter: filterCriteria,
              update: { $set: newDoc },
              upsert: true
            }
          });
          wardCreated++;
        }
      }

      if (bulkOps.length > 0) {
        await Member.bulkWrite(bulkOps, { ordered: false });
      }

      gpMatched += wardMatched;
      gpWardOnly += wardCreated;
      gpTotalVoters += voters.length;

      console.log(`   Ward ${wardNo.padStart(2)}: ${voters.length} Voters (Village: ${voters[0]?.villageName || defaultVillage}) -> Matched Assembly: ${wardMatched} | Ward-Only: ${wardCreated}`);
    }

    grandSummary.totalVotersSynced += gpTotalVoters;
    grandSummary.matchedAssembly += gpMatched;
    grandSummary.wardOnlyCreatedOrUpdated += gpWardOnly;
    grandSummary.details.push({
      gp: gpHindi,
      wards: wardNos.length,
      totalVoters: gpTotalVoters,
      matched: gpMatched,
      wardOnly: gpWardOnly
    });
  }

  console.log('\n========================================================================');
  console.log('                          FINAL SYNC SUMMARY                            ');
  console.log('========================================================================');
  console.log(`Total Gram Panchayats Processed: ${grandSummary.totalGps}`);
  console.log(`Total Ward PDFs Processed:       ${grandSummary.totalWards}`);
  console.log(`Total Voters Synced:             ${grandSummary.totalVotersSynced}`);
  console.log(`Matched to Assembly Database:    ${grandSummary.matchedAssembly}`);
  console.log(`Ward-Only Voters Added/Updated:  ${grandSummary.wardOnlyCreatedOrUpdated}`);
  console.log('========================================================================\n');

  // Save report
  fs.writeFileSync('scripts/master_sync_execution_report.json', JSON.stringify(grandSummary, null, 2));
  console.log('Saved detailed report to scripts/master_sync_execution_report.json');

  await mongoose.disconnect();
}

runMasterSyncAll().catch(err => {
  console.error('Fatal Error during Master Sync:', err);
  process.exit(1);
});
