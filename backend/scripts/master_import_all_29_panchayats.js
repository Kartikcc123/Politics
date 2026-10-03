const mongoose = require('mongoose');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const Member = require('../src/models/Member');
const { decodeSecHindi } = require('../src/utils/secHindiDecoder');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://187.127.173.42:27017/political_crm';

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

function parseWardPdfFull(pdfPath, gpHindi, defaultVillage) {
  let xml = '';
  try {
    xml = execSync(`pdftotext -bbox "${pdfPath}" -`, { encoding: 'utf8', maxBuffer: 100 * 1024 * 1024 });
  } catch (err) {
    console.error(`Error reading ${pdfPath}:`, err.message);
    return [];
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

    // Skip summary / signature last page
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

    // Skip pages with fewer than 3 serials (cover pages, section indices)
    if (serialCandidates.length < 3) continue;

    // Cluster cards
    const cards = [];
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

      // Extract EPIC
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

      cards.push({
        serial: sc.serial,
        isDeleted: sc.isDeleted,
        epic,
        words: cardWords
      });
    }

    // Parse Fields for each card
    cards.forEach(card => {
      const rawCardText = card.words.map(w => w.text).join(' ');
      const cleanCard = decodeSecHindi(rawCardText);
      let serial = card.serial;

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

      // Ignore phantom cards that have neither name nor epic
      if (!name && !card.epic && !guardian) {
        return;
      }

      allVoters.push({
        pageNumber: pageIndex,
        serial: serial || '',
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
    });
  }

  // Deduplicate by serial, preserving non-deleted
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

function discoverAll29Pdfs() {
  const downloadsDir = 'C:\\Users\\Ashish Sharma\\Downloads';
  const result = {};

  function walk(dir) {
    const files = fs.readdirSync(dir);
    for (const f of files) {
      const full = path.join(dir, f);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        walk(full);
      } else if (f.toLowerCase().endsWith('.pdf') && (f.includes('Ward') || f.includes('No-'))) {
        const m = f.match(/([A-Za-z\s-]+?)-Ward\s*No-?0*(\d+)\.pdf/i);
        if (m) {
          const rawGp = m[1].trim().toUpperCase();
          const wardNo = parseInt(m[2], 10);
          if (GP_CONFIG[rawGp]) {
            if (!result[rawGp]) result[rawGp] = {};
            result[rawGp][wardNo] = full;
          }
        }
      }
    }
  }

  walk(downloadsDir);
  return result;
}

async function runMasterSync() {
  console.log('Connecting to MongoDB:', MONGO_URI);
  await mongoose.connect(MONGO_URI);
  console.log('MongoDB Connected successfully!\n');

  // Clean out any previously generated phantom placeholder voters
  const deletedPhantoms = await Member.deleteMany({
    name: /^मतदाता\s*#/i,
    hasAssemblyMembership: false
  });
  console.log(`Cleaned up ${deletedPhantoms.deletedCount} phantom placeholder voter entries from database.`);

  console.log('======================================================');
  console.log('STARTING COMPLETE MASTER SYNC (CLEAN NAMES & SERIALS) FOR ALL 29 PANCHAYATS');
  console.log('======================================================\n');

  const allPanchayats = discoverAll29Pdfs();
  const summaryReport = [];

  for (const [gpKey, wardsObj] of Object.entries(allPanchayats)) {
    const config = GP_CONFIG[gpKey];
    const gpHindi = config.hindi;
    const defaultVillage = config.defaultVillage;
    const wardNos = Object.keys(wardsObj).map(Number).sort((a,b) => a - b);

    console.log(`\n------------------------------------------------------`);
    console.log(`Processing Gram Panchayat: ${gpHindi} (${gpKey}) [${wardNos.length} Wards]`);
    console.log(`------------------------------------------------------`);

    let gpMatched = 0;
    let gpCreated = 0;
    const wardStats = [];

    // Parse all wards for this GP
    const allGpvoters = [];
    const allEpics = new Set();

    for (const wardNo of wardNos) {
      const pdfPath = wardsObj[wardNo];
      const voters = parseWardPdfFull(pdfPath, gpHindi, defaultVillage);
      allGpvoters.push({ wardNo: String(wardNo), pdfPath, voters });
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

    // Process each ward
    for (const item of allGpvoters) {
      const wardNo = item.wardNo;
      const voters = item.voters;
      let wardMatched = 0;
      let wardCreated = 0;
      let bulkOps = [];

      for (const v of voters) {
        if (v.isDeleted) continue; // Skip deleted voter cards

        const serialStr = String(v.serial || '');
        const wardStr = String(wardNo);

        if (v.epic && existingMap.has(v.epic)) {
          // Existing Assembly Member Match
          const existing = existingMap.get(v.epic);
          const updateFields = {
            hasMunicipalMembership: true,
            gramPanchayat: gpHindi,
            village: v.villageName || defaultVillage,
            wardNumber: wardStr,
            wardVoterSerial: serialStr,
            [`wardSerialMap.${wardStr}`]: serialStr
          };
          if (serialStr) {
            updateFields.voterSerial = serialStr;
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
          // New Ward-Only Member
          const newDoc = {
            contactType: 'voter',
            name: v.name || `मतदाता #${serialStr}`,
            relativeName: v.guardianName || '',
            guardianName: v.guardianName || '',
            relationType: v.relationType || 'father',
            houseNumber: v.houseNumber || '',
            age: v.age || null,
            gender: v.gender || 'male',
            voterId: v.epic || '',
            voterSerial: serialStr,
            wardVoterSerial: serialStr,
            wardSerialMap: { [wardStr]: serialStr },
            gramPanchayat: gpHindi,
            village: v.villageName || defaultVillage,
            wardNumber: wardStr,
            municipalWardNumbers: [wardStr],
            hasMunicipalMembership: true,
            hasAssemblyMembership: false,
            sourceDocument: {
              type: 'pdf',
              file: path.basename(item.pdfPath),
              rawText: `Ward ${wardStr} Serial ${serialStr}`
            }
          };

          if (v.epic) {
            const setFields = {
              wardVoterSerial: serialStr,
              voterSerial: serialStr,
              gramPanchayat: gpHindi,
              village: v.villageName || defaultVillage,
              wardNumber: wardStr,
              hasMunicipalMembership: true
            };
            if (v.name) setFields.name = v.name;
            if (v.guardianName) {
              setFields.guardianName = v.guardianName;
              setFields.relativeName = v.guardianName;
            }
            if (v.relationType) setFields.relationType = v.relationType;
            if (v.houseNumber) setFields.houseNumber = v.houseNumber;
            if (v.age) setFields.age = v.age;
            if (v.gender) setFields.gender = v.gender;

            bulkOps.push({
              updateOne: {
                filter: { voterId: v.epic },
                update: {
                  $set: setFields,
                  $setOnInsert: {
                    contactType: 'voter',
                    hasAssemblyMembership: false,
                    wardSerialMap: { [wardStr]: serialStr },
                    municipalWardNumbers: [wardStr],
                    sourceDocument: {
                      type: 'pdf',
                      file: path.basename(item.pdfPath),
                      rawText: `Ward ${wardStr} Serial ${serialStr}`
                    }
                  }
                },
                upsert: true
              }
            });
          } else {
            bulkOps.push({
              insertOne: {
                document: newDoc
              }
            });
          }
          wardCreated++;
        }

        if (bulkOps.length >= 1000) {
          await Member.bulkWrite(bulkOps, { ordered: false });
          bulkOps = [];
        }
      }

      if (bulkOps.length > 0) {
        await Member.bulkWrite(bulkOps, { ordered: false });
      }

      const totalWardLive = wardMatched + wardCreated;
      gpMatched += wardMatched;
      gpCreated += wardCreated;

      wardStats.push({
        ward: wardNo,
        village: voters[0] ? voters[0].villageName : defaultVillage,
        liveVoters: totalWardLive,
        matched: wardMatched,
        created: wardCreated,
        serialRange: voters.length > 0 ? `#${voters[0].serial}..#${voters[voters.length-1].serial}` : '-'
      });
    }

    console.log(`✅ ${gpHindi} Complete! Total: ${gpMatched + gpCreated} (Matched: ${gpMatched}, New: ${gpCreated})`);

    summaryReport.push({
      gpKey,
      gpHindi,
      wardsCount: wardNos.length,
      totalLive: gpMatched + gpCreated,
      matched: gpMatched,
      created: gpCreated,
      wardStats
    });
  }

  console.log(`\n======================================================`);
  console.log(`ALL 29 PANCHAYATS CLEAN RE-IMPORT COMPLETED!`);
  console.log(`======================================================\n`);

  fs.writeFileSync(
    path.join(__dirname, 'master_29_panchayats_summary.json'),
    JSON.stringify(summaryReport, null, 2),
    'utf8'
  );

  await mongoose.disconnect();
}

runMasterSync().catch(err => {
  console.error('Fatal error during clean re-import:', err);
  process.exit(1);
});
