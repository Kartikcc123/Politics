const { execSync } = require('child_process');
const { decodeSecHindi } = require('../src/utils/secHindiDecoder');

function testParsePdf(pdfPath) {
  const xml = execSync(`pdftotext -bbox "${pdfPath}" -`, { encoding: 'utf8' });
  const pageRegex = /<page\s+width="([\d.]+)"\s+height="([\d.]+)">([\s\S]*?)<\/page>/g;
  let pm;
  let pIdx = 0;

  const validCards = [];

  while ((pm = pageRegex.exec(xml)) !== null) {
    pIdx++;
    const pXml = pm[3];
    const wordRegex = /<word\s+xMin="([\d.]+)"\s+yMin="([\d.]+)"\s+xMax="([\d.]+)"\s+yMax="([\d.]+)">([\s\S]*?)<\/word>/g;
    let wm;
    const words = [];
    while ((wm = wordRegex.exec(pXml)) !== null) {
      words.push({
        text: wm[5].trim(),
        xMin: parseFloat(wm[1]),
        yMin: parseFloat(wm[2]),
        xMax: parseFloat(wm[3]),
        yMax: parseFloat(wm[4])
      });
    }

    // Skip summary / signature last page
    const rawPageText = words.map(w => w.text).join(' ');
    const decodedPageText = decodeSecHindi(rawPageText);
    if (decodedPageText.includes('हस्ताक्षर') || decodedPageText.includes('कुल पृष्ठ') || words.length < 30) {
      continue;
    }

    // Find card serials: serials in Rajasthan SEC cards start at y >= 70
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

    // A real card page has at least 3 cards
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

      // Extract EPIC
      let epic = '';
      for (const w of cardWords) {
        if (w.yMin <= sc.y + 14) {
          const epM = w.text.match(/[A-Z]{2,4}\/?\d{6,10}|RJ\/\d{2}\/\d{2,4}\/\d{5,8}/i);
          if (epM) { epic = epM[0].toUpperCase(); break; }
        }
      }
      if (!epic) {
        const topWords = cardWords.filter(w => w.yMin <= sc.y + 14).map(w => w.text).join('');
        const epM = topWords.match(/([A-Z]{2,4}\/?\d{6,10}|RJ\/\d{2}\/\d{2,4}\/\d{5,8})/i);
        if (epM) epic = epM[1].toUpperCase();
      }

      // Decode full card text
      const rawCardText = cardWords.map(w => w.text).join(' ');
      const cleanCard = decodeSecHindi(rawCardText);

      let name = '';
      const nameM = cleanCard.match(/(?:नाम|नरम|रिम)\s*:\s*([^:]+?)(?=(?:पिता|पति|माता|नपतर|पनत|मरतर|मकान|मकरन|Photo|Available|$))/);
      if (nameM) name = nameM[1].replace(/Photo\s*is\s*Available|Available|Photo|is/gi, '').trim();

      let guardian = '';
      let relationType = 'father';
      const guardM = cleanCard.match(/(?:(पिता|पति|माता|नपतर|पनत|मरतर)\s*का?\s*नाम|पिता|पति|माता|नपतर|पनत|मरतर)\s*:\s*([^:]+?)(?=(?:मकान|मकरन|आयु|आजच|Photo|$))/);
      if (guardM) {
        if (/(?:पति|पनत)/.test(guardM[1])) relationType = 'husband';
        else if (/(?:माता|मरतर)/.test(guardM[1])) relationType = 'mother';
        guardian = guardM[2].replace(/Photo\s*is\s*Available|Available|Photo|is/gi, '').trim();
      }

      let house = '';
      const houseM = cleanCard.match(/(?:मकान|मकरन)\s*(?:संख्या|सपखजर)?\s*:\s*([^:]+?)(?=(?:आयु|आजच|Photo|$))/);
      if (houseM) house = houseM[1].replace(/Photo\s*is\s*Available|Available|Photo|is/gi, '').trim();

      let age = null;
      let gender = 'male';
      const ageM = cleanCard.match(/(?:आयु|आजच)\s*:\s*(\d+)/);
      if (ageM) age = parseInt(ageM[1], 10);
      if (/(?:सल|स्त्री|F|महिला)/i.test(cleanCard)) gender = 'female';

      // Ignore phantom cards that have neither name nor epic
      if (!name && !epic && !guardian) {
        continue;
      }

      validCards.push({
        page: pIdx,
        serial: sc.serial,
        isDeleted: sc.isDeleted,
        epic,
        name,
        guardian,
        relationType,
        house,
        age,
        gender
      });
    }
  }

  // Deduplicate by serial, preserving non-deleted
  const bySerial = new Map();
  for (const v of validCards) {
    if (!bySerial.has(v.serial) || (!v.isDeleted && bySerial.get(v.serial).isDeleted)) {
      bySerial.set(v.serial, v);
    }
  }

  return Array.from(bySerial.values()).sort((a,b) => (a.serial||0) - (b.serial||0));
}

const res = testParsePdf("C:/Users/Ashish Sharma/Downloads/5/CHAROT-Ward No-001.pdf");
console.log('Total extracted valid cards:', res.length);
console.log('Cards with missing name:', res.filter(c => !c.name).length);
console.log('Serials range:', `#${res[0].serial} to #${res[res.length-1].serial}`);
console.log('Sample first 5 clean cards:');
console.log(res.slice(0, 5));
