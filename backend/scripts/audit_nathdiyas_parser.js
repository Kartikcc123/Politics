const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

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
  let villageName = 'नाथड़ियास';
  const wardFileM = pdfPath.match(/Ward\s*No-?0*(\d+)/i);
  if (wardFileM) wardNumber = String(parseInt(wardFileM[1], 10));

  if (['6', '7'].includes(wardNumber)) villageName = 'आसपुर';
  else villageName = 'नाथड़ियास';

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

const dir = 'C:\\Users\\Ashish Sharma\\Downloads\\Nathdiyas';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.pdf')).sort((a, b) => {
  const numA = parseInt(a.match(/\d+/)?.[0] || '0', 10);
  const numB = parseInt(b.match(/\d+/)?.[0] || '0', 10);
  return numA - numB;
});

console.log(`\n=== AUDITING ALL 7 WARDS OF GRAM PANCHAYAT NATHDIYAS ===\n`);
let grandTotal = 0;
let grandActive = 0;
let grandDeleted = 0;

for (const file of files) {
  const fullPath = path.join(dir, file);
  const parsed = parseWardPdfFull(fullPath);
  const activeCount = parsed.voters.filter(v => !v.isDeleted).length;
  const deletedCount = parsed.voters.filter(v => v.isDeleted).length;
  const withEpic = parsed.voters.filter(v => Boolean(v.epic)).length;
  const minSerial = parsed.voters[0]?.serial || '-';
  const maxSerial = parsed.voters[parsed.voters.length - 1]?.serial || '-';

  grandTotal += parsed.voters.length;
  grandActive += activeCount;
  grandDeleted += deletedCount;

  console.log(`📌 Ward ${parsed.wardNumber.padStart(2)} (${parsed.villageName.padEnd(8)}) | Total: ${String(parsed.voters.length).padStart(3)} | Active: ${String(activeCount).padStart(3)} | Del: ${String(deletedCount).padStart(2)} | EPICs: ${String(withEpic).padStart(3)} | Serials: #${minSerial}..#${maxSerial}`);
}

console.log(`\n------------------------------------------------------------`);
console.log(`GRAND TOTAL: ${grandTotal} Voters (Active: ${grandActive}, Deleted: ${grandDeleted}) across 7 Wards of GP NATHDIYAS`);
