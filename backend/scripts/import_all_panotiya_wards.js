const mongoose = require('mongoose');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const Member = require('../src/models/Member');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://187.127.173.42:27017/political_crm';

function cleanText(text) {
  if (!text) return '';
  return text
    .replace(/Photo\s*is\s*Available/gi, '')
    .replace(/Available/gi, '')
    .replace(/Photo/gi, '')
    .replace(/is/gi, '')
    .trim();
}

function parseWardPdfFull(pdfPath) {
  const xml = execSync(`pdftotext -bbox "${pdfPath}" -`, { encoding: 'utf8', maxBuffer: 100 * 1024 * 1024 });
  const pageRegex = /<page\s+width="([\d.]+)"\s+height="([\d.]+)">([\s\S]*?)<\/page>/g;
  let pageMatch;
  let pageIndex = 0;
  
  let wardNumber = '1';
  let villageName = 'पानोतिया';
  const wardFileM = pdfPath.match(/Ward\s*No-?0*(\d+)/i);
  if (wardFileM) wardNumber = String(parseInt(wardFileM[1], 10));

  if (['4', '5', '6', '7'].includes(wardNumber)) villageName = 'जोगरास';
  else villageName = 'पानोतिया';

  const epicPattern = /^(?:[A-Z]{3}\d{7})|(?:RJ\/\d+\/\d+\/\d+)$/;
  const allVoters = [];

  while ((pageMatch = pageRegex.exec(xml)) !== null) {
    pageIndex++;
    if (pageIndex <= 2) continue;

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
    if (/कुल\s*मतदाताओं\s*की\s*संख्या|ननरररचककत\s*कक\s*सपखजर|हस्ताक्षर|हसतरकजर|Summary/i.test(fullPageText) && !words.some(w => epicPattern.test(w.text))) {
      continue;
    }

    const bodyWords = words.filter(w => w.yMin >= 135 && w.yMax <= 795);
    if (bodyWords.length === 0) continue;

    const epicWords = bodyWords.filter(w => epicPattern.test(w.text));
    const serialAnchors = bodyWords.filter(w => 
      /^[OESR]?\d{1,4}$/.test(w.text) &&
      (w.xMin < 65 || (w.xMin > 210 && w.xMin < 240) || (w.xMin > 380 && w.xMin < 415))
    );

    const cardAnchors = [];
    const usedWords = new Set();

    epicWords.forEach(epicWord => {
      let matchedSerialWord = serialAnchors.find(s => 
        !usedWords.has(s) &&
        s.xMin < epicWord.xMin && (epicWord.xMin - s.xMin) < 70 &&
        Math.abs(s.yMin - epicWord.yMin) < 8
      );

      let isDeleted = false;
      let serial = '';

      if (matchedSerialWord) {
        usedWords.add(matchedSerialWord);
        const raw = matchedSerialWord.text;
        if (/^[OESR]/.test(raw)) isDeleted = true;
        serial = raw.replace(/^[OESR]/, '');
      }

      const delPrefix = bodyWords.find(w => 
        ['O', 'E', 'S', 'R'].includes(w.text) &&
        w.xMin < epicWord.xMin && (epicWord.xMin - w.xMin) < 80 &&
        Math.abs(w.yMin - epicWord.yMin) < 8
      );
      if (delPrefix) isDeleted = true;

      let colLeft = 25, colRight = 205;
      if (epicWord.xMin >= 200 && epicWord.xMin < 380) {
        colLeft = 205; colRight = 380;
      } else if (epicWord.xMin >= 380) {
        colLeft = 380; colRight = 565;
      }

      cardAnchors.push({
        anchorY: Math.min(epicWord.yMin, matchedSerialWord ? matchedSerialWord.yMin : epicWord.yMin),
        colLeft,
        colRight,
        epic: epicWord.text,
        serial,
        isDeleted
      });
    });

    serialAnchors.forEach(sWord => {
      if (usedWords.has(sWord)) return;
      const raw = sWord.text;
      const isDel = /^[OESR]/.test(raw);
      const sVal = raw.replace(/^[OESR]/, '');

      let colLeft = 25, colRight = 205;
      if (sWord.xMin >= 200 && sWord.xMin < 380) {
        colLeft = 205; colRight = 380;
      } else if (sWord.xMin >= 380) {
        colLeft = 380; colRight = 565;
      }

      if (!cardAnchors.some(ca => Math.abs(ca.anchorY - sWord.yMin) < 15 && Math.abs(ca.colLeft - colLeft) < 10)) {
        cardAnchors.push({
          anchorY: sWord.yMin,
          colLeft,
          colRight,
          epic: '',
          serial: sVal,
          isDeleted: isDel
        });
      }
    });

    cardAnchors.forEach(card => {
      const cardWords = bodyWords.filter(w => 
        w.xMin >= card.colLeft - 5 && w.xMax <= card.colRight + 5 &&
        w.yMin >= card.anchorY - 4 && w.yMin < card.anchorY + 70
      );

      cardWords.sort((a, b) => {
        if (Math.abs(a.yMin - b.yMin) > 4) return a.yMin - b.yMin;
        return a.xMin - b.xMin;
      });

      const cellText = cardWords.map(w => w.text).join(' ');

      let serial = card.serial;
      if (!serial) {
        for (let i = 0; i < Math.min(cardWords.length, 4); i++) {
          const m = cardWords[i].text.match(/^([OESR]?\s*(\d{1,4}))$/);
          if (m) {
            serial = m[2];
            break;
          }
        }
      }

      const numS = Number(serial);
      if ((!numS || numS < 1 || numS > 2000) && !card.epic) {
        return;
      }

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
        villageName
      });
    });
  }

  const uniqueBySerial = new Map();
  allVoters.forEach(v => {
    if (v.serial) {
      if (!uniqueBySerial.has(v.serial) || (!uniqueBySerial.get(v.serial).epic && v.epic)) {
        uniqueBySerial.set(v.serial, v);
      }
    } else if (v.epic) {
      uniqueBySerial.set(`epic:${v.epic}`, v);
    }
  });

  const finalVoters = Array.from(uniqueBySerial.values());
  finalVoters.sort((a, b) => (Number(a.serial) || 0) - (Number(b.serial) || 0));

  return {
    wardNumber,
    villageName,
    voters: finalVoters
  };
}

async function run() {
  console.log('Connecting to MongoDB:', MONGO_URI);
  await mongoose.connect(MONGO_URI);
  console.log('MongoDB Connected successfully!');

  const dir = 'C:\\Users\\Ashish Sharma\\Downloads\\panotiya';
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.pdf')).sort((a, b) => {
    const numA = parseInt(a.match(/\d+/)?.[0] || '0', 10);
    const numB = parseInt(b.match(/\d+/)?.[0] || '0', 10);
    return numA - numB;
  });

  console.log(`\n======================================================`);
  console.log(`STARTING FAST BULK IMPORT OF ALL 7 WARDS OF PANOTIYA`);
  console.log(`======================================================\n`);

  console.log('Parsing all 7 Ward PDFs...');
  const parsedWards = [];
  const allEpics = new Set();

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const parsed = parseWardPdfFull(fullPath);
    parsed.file = file;
    parsedWards.push(parsed);
    parsed.voters.forEach(v => {
      if (v.epic) allEpics.add(v.epic.toUpperCase());
    });
  }

  console.log(`Parsed 7 Wards, total unique EPICs: ${allEpics.size}`);
  console.log('Loading existing matching members from MongoDB...');

  const epicArray = Array.from(allEpics);
  const existingByEpic = new Map();
  for (let i = 0; i < epicArray.length; i += 1000) {
    const chunk = epicArray.slice(i, i + 1000);
    const found = await Member.find({ voterId: { $in: chunk } })
      .select('_id voterId voterSerial wardNumber wardVoterSerial wardSerialMap municipalWardNumbers gramPanchayat village');
    found.forEach(m => {
      if (m.voterId) existingByEpic.set(m.voterId.toUpperCase(), m);
    });
  }
  console.log(`Loaded ${existingByEpic.size} matching existing members from MongoDB!`);

  let grandTotal = 0;
  let grandMatched = 0;
  let grandCreated = 0;

  for (const wardData of parsedWards) {
    const wardNo = wardData.wardNumber;
    const villageName = wardData.villageName;
    console.log(`\nProcessing Ward ${wardNo} (${villageName}) [${wardData.voters.length} cards]...`);

    const bulkOps = [];
    let wardMatched = 0;
    let wardCreated = 0;

    for (const card of wardData.voters) {
      if (card.isDeleted) continue;

      const upperEpic = card.epic ? card.epic.toUpperCase() : '';
      const existing = upperEpic ? existingByEpic.get(upperEpic) : null;

      if (existing) {
        wardMatched++;
        const currentWards = Array.isArray(existing.municipalWardNumbers) ? [...existing.municipalWardNumbers] : [];
        if (!currentWards.includes(wardNo)) {
          currentWards.push(wardNo);
        }

        const wardSerialMap = existing.wardSerialMap || {};
        wardSerialMap[wardNo] = card.serial;

        bulkOps.push({
          updateOne: {
            filter: { _id: existing._id },
            update: {
              $set: {
                hasMunicipalMembership: true,
                wardNumber: wardNo,
                wardVoterSerial: card.serial,
                wardSerialMap: wardSerialMap,
                municipalWardNumbers: currentWards,
                gramPanchayat: 'पानोतिया',
                village: villageName,
                voterSerial: existing.voterSerial || card.serial
              }
            }
          }
        });
      } else {
        wardCreated++;
        bulkOps.push({
          insertOne: {
            document: {
              contactType: 'voter',
              name: card.name || `मतदाता #${card.serial}`,
              guardianName: card.guardianName || '',
              relationType: card.relationType || 'father',
              houseNumber: card.houseNumber || '',
              age: card.age || undefined,
              gender: card.gender || 'male',
              voterId: card.epic || undefined,
              voterSerial: card.serial,
              wardVoterSerial: card.serial,
              wardNumber: wardNo,
              municipalWardNumbers: [wardNo],
              wardSerialMap: { [wardNo]: card.serial },
              gramPanchayat: 'पानोतिया',
              village: villageName,
              hasMunicipalMembership: true,
              hasAssemblyMembership: false,
              sourceDocument: {
                type: 'pdf',
                file: wardData.file,
                rawText: `Ward ${wardNo} Serial ${card.serial}`
              }
            }
          }
        });
      }
    }

    if (bulkOps.length > 0) {
      await Member.bulkWrite(bulkOps, { ordered: false });
    }

    console.log(`✅ Ward ${wardNo} Done: Matched: ${wardMatched} | Created: ${wardCreated} | Total Live: ${wardMatched + wardCreated}`);
    grandTotal += (wardMatched + wardCreated);
    grandMatched += wardMatched;
    grandCreated += wardCreated;
  }

  console.log(`\n======================================================`);
  console.log(`ALL 7 WARDS OF PANOTIYA IMPORT FINISHED SUCCESSFULLY!`);
  console.log(`Grand Total Voters: ${grandTotal}`);
  console.log(`Direct Assembly Matches: ${grandMatched}`);
  console.log(`Newly Created Ward Voters: ${grandCreated}`);
  console.log(`======================================================\n`);

  // Verification report
  console.log('=== VERIFYING PANOTIYA WARDS IN LIVE DATABASE ===\n');
  for (let w = 1; w <= 7; w++) {
    const wardStr = String(w);
    const count = await Member.countDocuments({ gramPanchayat: 'पानोतिया', municipalWardNumbers: wardStr });
    const samples = await Member.find({ gramPanchayat: 'पानोतिया', municipalWardNumbers: wardStr })
      .sort({ wardVoterSerial: 1 })
      .limit(2)
      .select('name guardianName relationType houseNumber age gender voterId voterSerial wardVoterSerial village');
    
    console.log(`Ward ${wardStr}: ${count} live voters`);
    samples.forEach((s, idx) => {
      console.log(`   Sample ${idx + 1}: [Kramank: #${s.wardVoterSerial || s.voterSerial}] [EPIC: ${s.voterId || '-'}] ${s.name} (${s.guardianName}) | M:${s.houseNumber} | Age:${s.age} | ${s.gender} | ${s.village}`);
    });
  }

  const totalPanotiya = await Member.countDocuments({ gramPanchayat: 'पानोतिया' });
  console.log(`\nTotal Voters in GP 'पानोतिया': ${totalPanotiya}`);

  await mongoose.disconnect();
}

run().catch(err => {
  console.error('Fatal error during import:', err);
  process.exit(1);
});
