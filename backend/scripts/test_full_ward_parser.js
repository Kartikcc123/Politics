const { execSync } = require('child_process');

function parsePageVoters(pageContent, pageNumber, wardNumber, villageName) {
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

  // Filter words in card area
  const bodyWords = words.filter(w => w.yMin >= 135 && w.yMax <= 795);
  if (bodyWords.length === 0) return [];

  const epicPattern = /^(?:[A-Z]{3}\d{7})|(?:RJ\/\d+\/\d+\/\d+)$/;
  
  // Find all EPIC words
  const epicWords = bodyWords.filter(w => epicPattern.test(w.text));
  
  // Find all Serial anchors: numbers at x < 65, or 210 < x < 240, or 380 < x < 415
  const serialAnchors = bodyWords.filter(w => 
    /^[OESR]?\d{1,4}$/.test(w.text) &&
    (w.xMin < 65 || (w.xMin > 210 && w.xMin < 240) || (w.xMin > 380 && w.xMin < 415))
  );

  // Combine anchors: For each card, we have an anchor point (x, y)
  // Let's create card anchors
  const cardAnchors = [];

  // Group serials and epics that belong together (distance < 60 in X, distance < 8 in Y)
  const usedWords = new Set();

  epicWords.forEach(epicWord => {
    // Find matching serial
    let matchedSerialWord = serialAnchors.find(s => 
      !usedWords.has(s) &&
      s.xMin < epicWord.xMin && (epicWord.xMin - s.xMin) < 70 &&
      Math.abs(s.yMin - epicWord.yMin) < 8
    );

    // Also look for deletion indicator 'O'
    let isDeleted = false;
    let serial = '';

    if (matchedSerialWord) {
      usedWords.add(matchedSerialWord);
      const raw = matchedSerialWord.text;
      if (/^[OESR]/.test(raw)) isDeleted = true;
      serial = raw.replace(/^[OESR]/, '');
    }

    // Check if there is an isolated 'O' or 'E' or 'S' or 'R' right before serial or epic
    const delPrefix = bodyWords.find(w => 
      ['O', 'E', 'S', 'R'].includes(w.text) &&
      w.xMin < epicWord.xMin && (epicWord.xMin - w.xMin) < 80 &&
      Math.abs(w.yMin - epicWord.yMin) < 8
    );
    if (delPrefix) isDeleted = true;

    // Determine column bounds
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

  // Check for any serial anchors without EPIC (e.g. newly added voters without EPIC)
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

    // Ensure not already covered by another anchor nearby
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

  // For each card anchor, extract card words within y in [anchorY - 2, anchorY + 70]
  const votersOnPage = [];
  cardAnchors.forEach(card => {
    const cardWords = bodyWords.filter(w => 
      w.xMin >= card.colLeft - 5 && w.xMax <= card.colRight + 5 &&
      w.yMin >= card.anchorY - 4 && w.yMin < card.anchorY + 70
    );

    // Sort reading order
    cardWords.sort((a, b) => {
      if (Math.abs(a.yMin - b.yMin) > 4) return a.yMin - b.yMin;
      return a.xMin - b.xMin;
    });

    const cellText = cardWords.map(w => w.text).join(' ');

    // If serial was missing, try to find in top words
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

    // Extract Name
    let name = '';
    const nameM = cellText.match(/(?:नरम|नाम)\s*:\s*([^:]+?)(?=(?:नपतर|पिता|पनत|पति|मरतर|माता|मकरन|मकान|Photo|Available|$))/);
    if (nameM) name = nameM[1].replace(/Photo\s*is\s*Available/gi, '').trim();

    // Extract Guardian & Relation
    let guardian = '';
    let relationType = 'father';
    const guardM = cellText.match(/(?:(नपतर|पिता|पनत|पति|मरतर|माता)\s*कर?\s*नरम|पिता|पति|माता)\s*:\s*([^:]+?)(?=(?:मकरन|मकान|आजच|आयु|Photo|$))/);
    if (guardM) {
      if (/(?:पनत|पति)/.test(guardM[1])) relationType = 'husband';
      else if (/(?:मरतर|माता)/.test(guardM[1])) relationType = 'mother';
      guardian = guardM[2].replace(/Photo\s*is\s*Available/gi, '').trim();
    }

    // Extract House
    let house = '';
    const houseM = cellText.match(/(?:मकरन|मकान)\s*(?:सपखजर|संख्या)?\s*:\s*([^:]+?)(?=(?:आजच|आयु|Photo|$))/);
    if (houseM) house = houseM[1].replace(/Photo\s*is\s*Available/gi, '').trim();

    // Extract Age & Gender
    let age = null;
    let gender = 'male';
    const ageM = cellText.match(/(?:आजच|आयु)\s*:\s*(\d+)/);
    if (ageM) age = parseInt(ageM[1], 10);
    if (/(?:सल|स्त्री|F|महिला)/i.test(cellText)) gender = 'female';

    votersOnPage.push({
      pageNumber,
      serial,
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

  return votersOnPage;
}

function parseWardPdfFull(pdfPath) {
  const xml = execSync(`pdftotext -bbox "${pdfPath}" -`, { encoding: 'utf8', maxBuffer: 100 * 1024 * 1024 });
  const pageRegex = /<page\s+width="([\d.]+)"\s+height="([\d.]+)">([\s\S]*?)<\/page>/g;
  let pageMatch;
  let pageIndex = 0;
  
  let wardNumber = '1';
  let villageName = 'थला';
  const wardFileM = pdfPath.match(/Ward\s*No-?0*(\d+)/i);
  if (wardFileM) wardNumber = String(parseInt(wardFileM[1], 10));

  if (['6', '7'].includes(wardNumber)) villageName = 'पिथलपुरा';
  else if (['8', '9'].includes(wardNumber)) villageName = 'मोखमपुरा';

  const allVoters = [];

  while ((pageMatch = pageRegex.exec(xml)) !== null) {
    pageIndex++;
    if (pageIndex <= 2) continue; // Skip cover & index pages
    const pageVoters = parsePageVoters(pageMatch[3], pageIndex, wardNumber, villageName);
    allVoters.push(...pageVoters);
  }

  // Deduplicate and sort by serial number
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

const w1 = parseWardPdfFull('C:\\Users\\Ashish Sharma\\Downloads\\THALA\\THALA-Ward No-001.pdf');
console.log(`\n=== FULL WARD 1 RESULT ===`);
console.log(`Total voters parsed: ${w1.voters.length}`);
console.log(`Serials count with non-empty serial: ${w1.voters.filter(v => Boolean(v.serial)).length}`);
console.log(`Serials range: #${w1.voters[0]?.serial} to #${w1.voters[w1.voters.length - 1]?.serial}`);
console.log(`Active: ${w1.voters.filter(v => !v.isDeleted).length}, Deleted: ${w1.voters.filter(v => v.isDeleted).length}`);
console.log('\nSample 1..10:');
w1.voters.slice(0, 10).forEach(v => {
  console.log(`  #${v.serial} [EPIC: ${v.epic}] ${v.name} | G: ${v.guardianName} | H: ${v.houseNumber} | Age: ${v.age} | ${v.gender} | ${v.isDeleted ? 'DELETED' : 'ACTIVE'}`);
});
console.log('\nSample last 5:');
w1.voters.slice(-5).forEach(v => {
  console.log(`  #${v.serial} [EPIC: ${v.epic}] ${v.name} | G: ${v.guardianName} | H: ${v.houseNumber} | Age: ${v.age} | ${v.gender} | ${v.isDeleted ? 'DELETED' : 'ACTIVE'}`);
});
