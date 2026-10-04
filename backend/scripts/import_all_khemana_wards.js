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
  let villageName = 'खेमाणा';
  const wardFileM = pdfPath.match(/Ward\s*No-?0*(\d+)/i);
  if (wardFileM) wardNumber = String(parseInt(wardFileM[1], 10));

  if (wardNumber === '1') villageName = 'सुरजियों का खेड़ा';
  else villageName = 'खेमाणा';

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
    const usedSerials = new Set();
    const usedEpics = new Set();

    for (const sa of serialAnchors) {
      let col = 0;
      if (sa.xMin > 350) col = 2;
      else if (sa.xMin > 180) col = 1;

      const matchingEpic = epicWords.find(ew => 
        !usedEpics.has(ew) &&
        Math.abs(ew.yMin - sa.yMin) < 30 &&
        ((col === 0 && ew.xMin < 210) ||
         (col === 1 && ew.xMin >= 190 && ew.xMin < 390) ||
         (col === 2 && ew.xMin >= 370))
      );

      const rawText = sa.text;
      const isDeleted = /^[OESR]/.test(rawText);
      const serialNum = parseInt(rawText.replace(/^[OESR]/, ''), 10);

      if (serialNum > 0 && serialNum < 2500) {
        usedSerials.add(sa);
        if (matchingEpic) usedEpics.add(matchingEpic);

        cardAnchors.push({
          col,
          yTop: sa.yMin - 12,
          serial: serialNum,
          epic: matchingEpic ? matchingEpic.text : null,
          isDeleted
        });
      }
    }

    for (const ew of epicWords) {
      if (usedEpics.has(ew)) continue;
      let col = 0;
      if (ew.xMin > 350) col = 2;
      else if (ew.xMin > 180) col = 1;

      cardAnchors.push({
        col,
        yTop: ew.yMin - 12,
        serial: null,
        epic: ew.text,
        isDeleted: false
      });
      usedEpics.add(ew);
    }

    const colBounds = [
      { minX: 25, maxX: 205 },
      { minX: 205, maxX: 380 },
      { minX: 380, maxX: 565 }
    ];

    for (let c = 0; c < 3; c++) {
      const colCards = cardAnchors.filter(a => a.col === c);
      colCards.sort((a, b) => a.yTop - b.yTop);

      for (let i = 0; i < colCards.length; i++) {
        const current = colCards[i];
        const nextY = (i < colCards.length - 1) ? colCards[i + 1].yTop : 795;
        const boxYMin = Math.max(135, current.yTop);
        const boxYMax = Math.min(795, nextY);

        const cardWords = bodyWords.filter(w => 
          w.xMin >= colBounds[c].minX - 5 &&
          w.xMax <= colBounds[c].maxX + 5 &&
          w.yMin >= boxYMin - 2 &&
          w.yMax <= boxYMax + 2
        );

        cardWords.sort((a, b) => {
          if (Math.abs(a.yMin - b.yMin) > 4) return a.yMin - b.yMin;
          return a.xMin - b.xMin;
        });

        const lines = [];
        let curLine = [];
        let curY = -1;
        for (const w of cardWords) {
          if (curY === -1 || Math.abs(w.yMin - curY) < 5) {
            curLine.push(w);
            curY = w.yMin;
          } else {
            lines.push(curLine);
            curLine = [w];
            curY = w.yMin;
          }
        }
        if (curLine.length > 0) lines.push(curLine);

        let name = '';
        let guardianName = '';
        let relationType = 'father';
        let houseNumber = '';
        let age = null;
        let gender = 'male';

        const cardText = cardWords.map(w => w.text).join(' ');

        if (/\b(ववलोवपत|ववलोशपत|ननरसत|Deleted)\b/i.test(cardText)) {
          current.isDeleted = true;
        }

        for (const line of lines) {
          const lText = line.map(w => w.text).join(' ');

          const nameM = lText.match(/(?:मतदाता\s*का\s*नाम|मतदरतर\s*कक\s*नरम|नरम|नाम)\s*[:;\-]?\s*(.+)/);
          if (nameM && !name) {
            name = cleanText(nameM[1]);
          }

          const relM = lText.match(/(?:वपता\s*का\s*नाम|वपतर\s*कक\s*नरम|पनत\s*का\s*नाम|पनत\s*कक\s*नरम|माता\s*का\s*नाम|अभिावक\s*का\s*नाम)\s*[:;\-]?\s*(.+)/);
          if (relM && !guardianName) {
            guardianName = cleanText(relM[1]);
            if (/पनत/i.test(lText)) relationType = 'husband';
            else if (/माता/i.test(lText)) relationType = 'mother';
            else relationType = 'father';
          }

          const houseM = lText.match(/(?:मकान\s*संख्या|मककन\s*सपखजर|गृह\s*संख्या)\s*[:;\-]?\s*([^\s,]+)/);
          if (houseM && !houseNumber) {
            houseNumber = cleanText(houseM[1]);
          }

          const ageM = lText.match(/(?:उम्र|आयु|आय)\s*[:;\-]?\s*(\d{1,3})/);
          if (ageM && !age) {
            age = parseInt(ageM[1], 10);
          }

          if (/(?:ललग|ललंग|शलग|Gender)\s*[:;\-]?\s*(?:महिला|स्त्री|मदिला|Female|F)/i.test(lText) || /\b(महिला|स्त्री)\b/i.test(lText)) {
            gender = 'female';
          } else if (/(?:ललग|ललंग|शलग|Gender)\s*[:;\-]?\s*(?:पुरुष|पु|Male|M)/i.test(lText) || /\b(पुरुष)\b/i.test(lText)) {
            gender = 'male';
          }
        }

        if (name && !guardianName) {
          const secondLine = lines[1] ? lines[1].map(w => w.text).join(' ') : '';
          const relM2 = secondLine.match(/[:;\-]?\s*(.+)/);
          if (relM2) {
            guardianName = cleanText(relM2[1]);
          }
        }

        allVoters.push({
          page: pageIndex,
          col: c,
          serial: current.serial,
          epic: current.epic,
          name,
          guardianName,
          relationType,
          houseNumber,
          age,
          gender,
          isDeleted: current.isDeleted,
          wardNumber,
          villageName
        });
      }
    }
  }

  // Deduplicate and resolve serials
  const uniqueVoters = [];
  const seenKeys = new Set();

  allVoters.sort((a, b) => {
    if (a.serial && b.serial) return a.serial - b.serial;
    if (a.serial) return -1;
    if (b.serial) return 1;
    return a.page - b.page;
  });

  let maxSerial = 0;
  for (const v of allVoters) {
    if (v.serial && v.serial > maxSerial) maxSerial = v.serial;
  }

  let nextSerial = 1;
  for (const v of allVoters) {
    let key = v.serial ? `S_${v.serial}` : (v.epic ? `E_${v.epic}` : `P_${v.page}_C_${v.col}_${v.name}`);
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);

    if (!v.serial) {
      v.serial = nextSerial;
    }
    nextSerial = Math.max(nextSerial, v.serial + 1);

    uniqueVoters.push(v);
  }

  uniqueVoters.sort((a, b) => a.serial - b.serial);

  return {
    wardNumber,
    villageName,
    voters: uniqueVoters
  };
}

async function run() {
  console.log('Connecting to MongoDB:', MONGO_URI);
  await mongoose.connect(MONGO_URI);
  console.log('Connected successfully!');

  const dir = 'C:\\Users\\Ashish Sharma\\Downloads\\KHEMANA-';
  const files = fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith('.pdf')).sort();

  console.log(`Found ${files.length} Ward PDFs in ${dir}`);

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

  console.log(`Parsed ${parsedWards.length} Wards, total unique EPICs: ${allEpics.size}`);
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
                gramPanchayat: 'खेमाणा',
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
              gramPanchayat: 'खेमाणा',
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
  console.log(`ALL 7 WARDS OF KHEMANA IMPORT FINISHED SUCCESSFULLY!`);
  console.log(`Grand Total Live Voters: ${grandTotal}`);
  console.log(`Direct Assembly Matches: ${grandMatched}`);
  console.log(`Newly Created Ward Voters: ${grandCreated}`);
  console.log(`======================================================\n`);

  // Verification report
  console.log('=== VERIFYING KHEMANA WARDS IN LIVE DATABASE ===\n');
  for (let w = 1; w <= 7; w++) {
    const wardStr = String(w);
    const count = await Member.countDocuments({ gramPanchayat: 'खेमाणा', municipalWardNumbers: wardStr });
    const samples = await Member.find({ gramPanchayat: 'खेमाणा', municipalWardNumbers: wardStr })
      .sort({ wardVoterSerial: 1 })
      .limit(2)
      .select('name guardianName relationType houseNumber age gender voterId voterSerial wardVoterSerial village');
    
    console.log(`Ward ${wardStr}: ${count} live voters`);
    samples.forEach((s, idx) => {
      console.log(`   Sample ${idx + 1}: [Kramank: #${s.wardVoterSerial || s.voterSerial}] [EPIC: ${s.voterId || '-'}] ${s.name} (${s.guardianName}) | M:${s.houseNumber} | Age:${s.age} | ${s.gender} | ${s.village}`);
    });
  }

  const totalKhemana = await Member.countDocuments({ gramPanchayat: 'खेमाणा' });
  console.log(`\nTotal Voters in GP 'खेमाणा': ${totalKhemana}`);

  await mongoose.disconnect();
}

run().catch(err => {
  console.error('Fatal error during import:', err);
  process.exit(1);
});
