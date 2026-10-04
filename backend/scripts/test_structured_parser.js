const { execSync } = require('child_process');
const { decodeSecHindi } = require('../src/utils/secHindiDecoder');

function parseCardBox(cardWords) {
  // Sort words by yMin, then xMin
  const sorted = [...cardWords].sort((a,b) => {
    if (Math.abs(a.yMin - b.yMin) > 4) return a.yMin - b.yMin;
    return a.xMin - b.xMin;
  });

  // 1. Extract EPIC
  let epic = '';
  const epicWord = sorted.find(w => /[A-Z]{2,4}\/?\d{6,10}|RJ\/\d{2}\/\d{2,4}\/\d{5,8}/i.test(w.text));
  if (epicWord) {
    const m = epicWord.text.match(/[A-Z]{2,4}\/?\d{6,10}|RJ\/\d{2}\/\d{2,4}\/\d{5,8}/i);
    if (m) epic = m[0].toUpperCase();
  }

  // 2. Identify Lines
  const lines = [];
  let currentLine = [];
  let currentY = null;

  for (const w of sorted) {
    // Ignore photo watermark words
    if (/^(?:Photo|is|Available)$/i.test(w.text)) continue;

    if (currentY === null || Math.abs(w.yMin - currentY) <= 5) {
      currentLine.push(w);
      if (currentY === null) currentY = w.yMin;
    } else {
      if (currentLine.length > 0) lines.push(currentLine);
      currentLine = [w];
      currentY = w.yMin;
    }
  }
  if (currentLine.length > 0) lines.push(currentLine);

  // Group line texts
  const lineTexts = lines.map(line => line.map(w => w.text).join(' '));
  const fullRawText = lineTexts.join(' ');

  // Serial is the number on the top line (line 0)
  let serial = '';
  let isDeleted = false;
  if (lines.length > 0) {
    const topWords = lines[0];
    const sWord = topWords.find(w => /^[OESR]?\d{1,4}$/.test(w.text) && !/[A-Z]{3}/.test(w.text));
    if (sWord) {
      if (/^[OESR]/.test(sWord.text)) isDeleted = true;
      serial = sWord.text.replace(/^[OESR]/, '');
    }
  }

  // Name extraction
  let name = '';
  const nameM = fullRawText.match(/(?:नरम|नाम)\s*:\s*([^:]+?)(?=(?:नपतर|पिता|पनत|पति|मरतर|माता|मकरन|मकान|आजच|आयु|ललग|लिंग|$))/);
  if (nameM) {
    name = decodeSecHindi(nameM[1].trim());
  }

  // Guardian extraction
  let guardian = '';
  let relationType = 'father';
  const guardM = fullRawText.match(/(?:(नपतर|पिता|पनत|पति|मरतर|माता)\s*(?:कर|का)?\s*(?:नरम|नाम)?)\s*:\s*([^:]+?)(?=(?:मकरन|मकान|आजच|आयु|ललग|लिंग|$))/);
  if (guardM) {
    if (/(?:पनत|पति)/.test(guardM[1])) relationType = 'husband';
    else if (/(?:मरतर|माता)/.test(guardM[1])) relationType = 'mother';
    guardian = decodeSecHindi(guardM[2].trim());
  }

  // House extraction
  let houseNumber = '';
  const houseM = fullRawText.match(/(?:मकरन|मकान)\s*(?:सपखजर|संख्या)?\s*:\s*([^:]+?)(?=(?:आजच|आयु|ललग|लिंग|$))/);
  if (houseM) {
    houseNumber = decodeSecHindi(houseM[1].trim());
  }

  // Age & Gender
  let age = null;
  const ageM = fullRawText.match(/(?:आजच|आयु)\s*:\s*(\d+)/);
  if (ageM) age = parseInt(ageM[1], 10);

  let gender = 'male';
  if (/(?:सल|स्त्री|महिला|F)/.test(fullRawText)) gender = 'female';

  return {
    serial: serial ? parseInt(serial, 10) : null,
    isDeleted,
    epic,
    name,
    guardianName: guardian,
    relationType,
    houseNumber,
    age,
    gender
  };
}

function testPdfStructured(pdfPath) {
  console.log('Testing structured parsing for:', pdfPath);
  const xml = execSync(`pdftotext -bbox "${pdfPath}" -`, { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 });
  const pageRegex = /<page\s+width="([\d.]+)"\s+height="([\d.]+)">([\s\S]*?)<\/page>/g;
  let pageMatch;
  let pIdx = 0;
  const allVoters = [];

  while ((pageMatch = pageRegex.exec(xml)) !== null) {
    pIdx++;
    if (pIdx <= 2) continue; // Skip cover/index

    const pageXml = pageMatch[3];
    const wordRegex = /<word\s+xMin="([\d.]+)"\s+yMin="([\d.]+)"\s+xMax="([\d.]+)"\s+yMax="([\d.]+)">([\s\S]*?)<\/word>/g;
    let wMatch;
    const words = [];
    while ((wMatch = wordRegex.exec(pageXml)) !== null) {
      words.push({
        xMin: parseFloat(wMatch[1]),
        yMin: parseFloat(wMatch[2]),
        xMax: parseFloat(wMatch[3]),
        yMax: parseFloat(wMatch[4]),
        text: wMatch[5].trim()
      });
    }

    // Skip signature page
    const pageText = words.map(w => w.text).join(' ');
    if (pageText.includes('हस्ताक्षर') || pageText.includes('ननरररचककत') && !words.some(w => /[A-Z]{3}\d{7}/.test(w.text))) {
      continue;
    }

    // Find card top anchors (serial numbers at the top line of card)
    // In 3 column layout:
    // col 0: x in [25, 75]
    // col 1: x in [205, 265]
    // col 2: x in [380, 445]
    // ONLY check words at the top of a card row (rows are roughly at y = 160, 250, 325, 400, 470, 540, 615, 685, 755)
    // A serial number must be preceded or followed on the same line by an EPIC OR be on top row of box
    // And NOT have 'आजच' on the same y-level!
    const rowAnchors = [];
    for (const w of words) {
      if (w.yMin >= 130 && w.yMin <= 780 && /^[OESR]?\d{1,4}$/.test(w.text)) {
        let col = -1;
        if (w.xMin >= 25 && w.xMin <= 75) col = 0;
        else if (w.xMin >= 205 && w.xMin <= 265) col = 1;
        else if (w.xMin >= 380 && w.xMin <= 445) col = 2;

        if (col !== -1) {
          // Check if there is 'आजच' or 'आयु' within 5pt of yMin - if so, this is an AGE, NOT a serial!
          const isAge = words.some(other =>
            (other.text.includes('आजच') || other.text.includes('आयु')) &&
            Math.abs(other.yMin - w.yMin) <= 6 &&
            Math.abs(other.xMin - w.xMin) < 50
          );
          if (!isAge) {
            rowAnchors.push({ ...w, col, num: parseInt(w.text.replace(/^[OESR]/, ''), 10) });
          }
        }
      }
    }

    // Sort rowAnchors by serial
    rowAnchors.sort((a,b) => a.num - b.num);

    for (const anchor of rowAnchors) {
      let cardXMin, cardXMax;
      if (anchor.col === 0) { cardXMin = 25; cardXMax = 205; }
      else if (anchor.col === 1) { cardXMin = 205; cardXMax = 380; }
      else { cardXMin = 380; cardXMax = 565; }

      const cardYMin = anchor.yMin - 8;
      const cardYMax = anchor.yMin + 72;

      const cardWords = words.filter(w =>
        w.xMin >= cardXMin - 5 &&
        w.xMax <= cardXMax + 10 &&
        w.yMin >= cardYMin &&
        w.yMax <= cardYMax
      );

      const parsed = parseCardBox(cardWords);
      if (parsed.serial || parsed.epic || parsed.name) {
        allVoters.push(parsed);
      }
    }
  }

  console.log(`Parsed total voters: ${allVoters.length}`);
  console.log('Sample voters:');
  allVoters.slice(0, 10).forEach(v => {
    console.log(`   #${String(v.serial).padEnd(3)} | EPIC: ${String(v.epic).padEnd(16)} | Name: "${v.name}" | Rel: ${v.relationType} "${v.guardianName}" | House: "${v.houseNumber}" | Age: ${v.age} | ${v.gender}`);
  });

  // Check serial continuity
  const serials = allVoters.map(v => v.serial).filter(Boolean);
  const minS = Math.min(...serials);
  const maxS = Math.max(...serials);
  console.log(`Serials range: ${minS} to ${maxS}, Total unique serials: ${new Set(serials).size}`);
}

testPdfStructured('C:\\Users\\Ashish Sharma\\Downloads\\THALA\\THALA-Ward No-001.pdf');
testPdfStructured('C:\\Users\\Ashish Sharma\\Downloads\\Raipur\\RAIPUR-Ward No-001.pdf');
