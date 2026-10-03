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

function cleanText(text) {
  if (!text) return '';
  const cleaned = text
    .replace(/Photo\s*is\s*Available/gi, '')
    .replace(/Available/gi, '')
    .replace(/Photo/gi, '')
    .replace(/is/gi, '')
    .trim();
  return decodeSecHindi(cleaned);
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
        const extractedVillage = cleanText(villM[1]);
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
    const pageText = words.map(w => w.text).join(' ');
    if (pageText.includes('कुल पृष्ठ') || pageText.includes('हस्ताक्षर') || pageText.includes('कुल मतदाता') || words.length < 15) {
      continue;
    }

    // Identify Card Boxes across 3 columns
    const serialCandidates = [];
    for (const w of words) {
      if (w.yMin > 60 && w.yMin < 750) {
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

      // Check multi-word EPIC e.g. "RJ/20/152/ 109187"
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
      const cellText = card.words.map(w => w.text).join(' ');
      let serial = card.serial;

      let name = '';
      const nameM = cellText.match(/(?:नरम|नाम)\s*:\s*([^:]+?)(?=(?:नपतर|पिता|पनत|पति|मरतर|माता|मकरन|मकान|Photo|Available|$))/);
      if (nameM) name = cleanText(nameM[1]);

      let guardian = '';
      let relationType = 'father';
      const guardM = cellText.match(/(?:(नपतर|पिता|पनत|पति|मरतर|माता)\s*कर?\s*नरम|पिता|पति|माता)\s*:\s*([^:]+?)(?=(?:मकरन|मकान|आजच|आयु|Photo|$))/);
      if (guardM) {
        if (/(?:पनत|पति)/.test(guardM[1])) relationType = 'husband';
        else if (/(?:मरतर|माता)/.test(guardM[1])) relationType = 'mother';
        guardian = cleanText(guardM[2]);
      }

      let house = '';
      const houseM = cellText.match(/(?:मकरन|मकान)\s*(?:सपखजर|संख्या)?\s*:\s*([^:]+?)(?=(?:आजच|आयु|Photo|$))/);
      if (houseM) house = cleanText(houseM[1]);

      let age = null;
      let gender = 'male';
      const ageM = cellText.match(/(?:आजच|आयु)\s*:\s*(\d+)/);
      if (ageM) age = parseInt(ageM[1], 10);
      if (/(?:सल|स्त्री|F|महिला)/i.test(cellText)) gender = 'female';

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
  const unique = [];
  const bySerial = new Map();
  for (const v of allVoters) {
    if (v.serial) {
      if (!bySerial.has(v.serial) || (!v.isDeleted && bySerial.get(v.serial).isDeleted)) {
        bySerial.set(v.serial, v);
      }
    } else {
      unique.push(v);
    }
  }

  return Array.from(bySerial.values()).concat(unique).sort((a,b) => (a.serial||0) - (b.serial||0));
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

  console.log('======================================================');
  console.log('STARTING COMPLETE MASTER SYNC & REPAIR OF ALL 29 PANCHAYATS');
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

    let gpTotalCards = 0;
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
            bulkOps.push({
              updateOne: {
                filter: { voterId: v.epic },
                update: { $setOnInsert: newDoc },
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
      gpTotalCards += voters.length;

      wardStats.push({
        ward: wardNo,
        village: voters[0] ? voters[0].villageName : defaultVillage,
        liveVoters: totalWardLive,
        matched: wardMatched,
        created: wardCreated,
        serialRange: voters.length > 0 ? `#1..#${voters[voters.length-1].serial}` : '-'
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
  console.log(`ALL 29 PANCHAYATS IMPORT AND FIX COMPLETED SUCCESSFULLY!`);
  console.log(`======================================================\n`);

  console.log(`FINAL REPORT SUMMARY TABLE:`);
  console.log(`---------------------------------------------------------------------------------------`);
  console.log(`GP NAME           | WARDS | TOTAL LIVE | MATCHED (ASSEMBLY) | NEW WARD ONLY | % MATCH`);
  console.log(`---------------------------------------------------------------------------------------`);
  let grandLive = 0;
  let grandMatched = 0;
  let grandCreated = 0;
  for (const rep of summaryReport) {
    grandLive += rep.totalLive;
    grandMatched += rep.matched;
    grandCreated += rep.created;
    const matchPct = rep.totalLive > 0 ? ((rep.matched / rep.totalLive) * 100).toFixed(1) + '%' : '0%';
    console.log(`${rep.gpHindi.padEnd(17)} | ${String(rep.wardsCount).padStart(5)} | ${String(rep.totalLive).padStart(10)} | ${String(rep.matched).padStart(18)} | ${String(rep.created).padStart(13)} | ${matchPct.padStart(7)}`);
  }
  console.log(`---------------------------------------------------------------------------------------`);
  const grandPct = grandLive > 0 ? ((grandMatched / grandLive) * 100).toFixed(1) + '%' : '0%';
  console.log(`GRAND TOTAL       |       | ${String(grandLive).padStart(10)} | ${String(grandMatched).padStart(18)} | ${String(grandCreated).padStart(13)} | ${grandPct.padStart(7)}`);
  console.log(`---------------------------------------------------------------------------------------\n`);

  // Write summary JSON artifact for frontend verification
  fs.writeFileSync(
    path.join(__dirname, 'master_29_panchayats_summary.json'),
    JSON.stringify(summaryReport, null, 2),
    'utf8'
  );
  console.log('Saved summary report to backend/scripts/master_29_panchayats_summary.json');

  await mongoose.disconnect();
}

runMasterSync().catch(err => {
  console.error('Fatal error during master sync:', err);
  process.exit(1);
});
