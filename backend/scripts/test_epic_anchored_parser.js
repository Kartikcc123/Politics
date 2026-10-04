const { execSync } = require('child_process');
const { decodeSecHindi } = require('../src/utils/secHindiDecoder');

function parseWardPdfEpicAnchored(pdfPath) {
  const xml = execSync(`pdftotext -bbox "${pdfPath}" -`, { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 });
  const pageRegex = /<page\s+width="([\d.]+)"\s+height="([\d.]+)">([\s\S]*?)<\/page>/g;
  let pageMatch;
  let pageIndex = 0;
  
  const epicPattern = /(?:[A-Z]{2,4}\/?\d{6,10})|(?:RJ\/\d{2}\/\d{2,4}\/\d{5,8})/i;
  const allVoters = [];

  while ((pageMatch = pageRegex.exec(xml)) !== null) {
    pageIndex++;
    if (pageIndex <= 2) continue; // skip cover

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

    // 1. Identify all EPIC tokens
    const epicWords = bodyWords.filter(w => epicPattern.test(w.text));
    
    // 2. Identify top serial anchors
    const serialWords = bodyWords.filter(w =>
      /^[OESR]?\d{1,4}$/.test(w.text) &&
      (w.xMin < 65 || (w.xMin > 200 && w.xMin < 250) || (w.xMin > 375 && w.xMin < 430))
    );

    const usedSerials = new Set();
    const cards = [];

    // For each EPIC word, find its matching serial number
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

      // Check for standalone deletion marker
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

    // Also catch cards without EPIC (if serial exists without epic)
    for (const sw of serialWords) {
      if (!usedSerials.has(sw)) {
        // Check if this is an age
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

        // Check if this card has name
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

    // Parse details for all cards on this page
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

      allVoters.push({
        page: card.page,
        serial: card.serial,
        epic: card.epic,
        name,
        guardianName: guardian,
        relationType,
        houseNumber: house,
        age,
        gender,
        isDeleted: card.isDeleted
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

  const result = Array.from(bySerial.values()).sort((a,b) => (a.serial||0) - (b.serial||0));
  console.log(`\n=== RESULT FOR ${pdfPath} ===`);
  console.log(`Total voters parsed: ${result.length}`);
  const serials = result.map(v => v.serial).filter(Boolean);
  console.log(`Serial range: ${Math.min(...serials)} to ${Math.max(...serials)}`);
  
  // Check for any missing serials in sequence
  const missing = [];
  const serialSet = new Set(serials);
  for (let i = Math.min(...serials); i <= Math.max(...serials); i++) {
    if (!serialSet.has(i)) missing.push(i);
  }
  console.log(`Missing serials in range (${missing.length}):`, missing.slice(0, 15));
  console.log('Sample first 5:');
  result.slice(0, 5).forEach(v => {
    console.log(`   #${v.serial} | EPIC: ${v.epic} | Name: "${v.name}" | Rel: ${v.relationType} "${v.guardianName}" | House: ${v.houseNumber} | Age: ${v.age} | ${v.isDeleted ? 'DELETED' : 'ACTIVE'}`);
  });
  console.log('Sample last 5:');
  result.slice(-5).forEach(v => {
    console.log(`   #${v.serial} | EPIC: ${v.epic} | Name: "${v.name}" | Rel: ${v.relationType} "${v.guardianName}" | House: ${v.houseNumber} | Age: ${v.age} | ${v.isDeleted ? 'DELETED' : 'ACTIVE'}`);
  });
  return result;
}

parseWardPdfEpicAnchored('C:\\Users\\Ashish Sharma\\Downloads\\THALA\\THALA-Ward No-001.pdf');
parseWardPdfEpicAnchored('C:\\Users\\Ashish Sharma\\Downloads\\Raipur\\RAIPUR-Ward No-001.pdf');
parseWardPdfEpicAnchored('C:\\Users\\Ashish Sharma\\Downloads\\5\\CHAROT-Ward No-001.pdf');
