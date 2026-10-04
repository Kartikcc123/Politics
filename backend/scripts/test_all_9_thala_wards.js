const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function parseWardPdf(pdfPath) {
  const xml = execSync(`pdftotext -bbox "${pdfPath}" -`, { encoding: 'utf8', maxBuffer: 100 * 1024 * 1024 });
  
  const pageRegex = /<page\s+width="([\d.]+)"\s+height="([\d.]+)">([\s\S]*?)<\/page>/g;
  let pageMatch;
  let pageIndex = 0;
  
  const allVoters = [];
  let wardNumber = '1';
  let villageName = 'थला';

  const wardFileM = pdfPath.match(/Ward\s*No-?0*(\d+)/i);
  if (wardFileM) wardNumber = String(parseInt(wardFileM[1], 10));

  if (['6', '7'].includes(wardNumber)) villageName = 'पिथलपुरा';
  else if (['8', '9'].includes(wardNumber)) villageName = 'मोखमपुरा';

  const epicPattern = /(?:[A-Z]{3}\d{7})|(?:RJ\/\d+\/\d+\/\d+)/;

  while ((pageMatch = pageRegex.exec(xml)) !== null) {
    pageIndex++;
    if (pageIndex <= 2) continue; // Skip cover & index

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
    // Skip summary / stats page
    if (/कुल\s*मतदाताओं\s*की\s*संख्या|ननरररचककत\s*कक\s*सपखजर|हस्ताक्षर|हसतरकजर|Summary/i.test(fullPageText) && !epicPattern.test(fullPageText)) {
      continue;
    }

    // Filter words in body
    const bodyWords = words.filter(w => w.yMin >= 135 && w.yMax <= 795);
    if (bodyWords.length === 0) continue;

    // Cluster row anchors
    const anchorYs = [];
    bodyWords.forEach(w => {
      if (epicPattern.test(w.text) || (/^[OESR]?\d{1,4}$/.test(w.text) && (w.xMin < 65 || (w.xMin > 210 && w.xMin < 240) || (w.xMin > 380 && w.xMin < 415)))) {
        anchorYs.push(w.yMin);
      }
    });

    if (anchorYs.length === 0) continue;

    anchorYs.sort((a, b) => a - b);
    const rowTops = [];
    anchorYs.forEach(y => {
      if (rowTops.length === 0 || y - rowTops[rowTops.length - 1] > 20) {
        rowTops.push(y);
      }
    });

    for (let r = 0; r < rowTops.length; r++) {
      const rTop = rowTops[r];
      const rBottom = (r < rowTops.length - 1) ? rowTops[r + 1] : rTop + 73.0;

      const cols = [
        { colIdx: 0, minX: 25, maxX: 205 },
        { colIdx: 1, minX: 205, maxX: 380 },
        { colIdx: 2, minX: 380, maxX: 565 }
      ];

      for (const col of cols) {
        const cellWords = bodyWords.filter(w => 
          w.xMin >= col.minX - 5 && w.xMax <= col.maxX + 5 &&
          w.yMin >= rTop - 6 && w.yMin < rBottom - 6
        );

        if (cellWords.length === 0) continue;

        cellWords.sort((a, b) => {
          if (Math.abs(a.yMin - b.yMin) > 4) return a.yMin - b.yMin;
          return a.xMin - b.xMin;
        });

        const cellText = cellWords.map(w => w.text).join(' ');

        // Skip non-card cells
        const epicMatch = cellText.match(epicPattern);
        
        let serial = '';
        let isDeleted = false;

        // Serial is at top-left of cell
        for (let i = 0; i < Math.min(cellWords.length, 5); i++) {
          const w = cellWords[i];
          const m = w.text.match(/^([OESR]?\s*(\d{1,4}))$/);
          if (m) {
            const raw = m[1].replace(/\s+/g, '');
            if (/^[OESR]/.test(raw)) isDeleted = true;
            serial = m[2];
            break;
          }
        }

        if (!serial) {
          const topWords = cellWords.slice(0, 4);
          const topText = topWords.map(w => w.text).join('');
          const m = topText.match(/([OESR]?)(\d{1,4})/);
          if (m) {
            if (m[1]) isDeleted = true;
            serial = m[2];
          }
        }

        // Only keep valid card
        const numSerial = Number(serial);
        if (!numSerial || numSerial > 3000 || numSerial < 1) {
          if (!epicMatch) continue;
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

        allVoters.push({
          pageNumber: pageIndex,
          serial: serial || '',
          epic: epicMatch ? epicMatch[0].trim() : '',
          name,
          guardianName: guardian,
          relationType,
          houseNumber: house,
          age,
          gender,
          isDeleted,
          wardNumber,
          villageName
        });
      }
    }
  }

  // Deduplicate by serial if any duplicates
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

const dir = 'C:\\Users\\Ashish Sharma\\Downloads\\THALA';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.pdf')).sort();

console.log(`Found ${files.length} Ward PDFs in ${dir}:`);
const results = [];

for (const file of files) {
  const fullPath = path.join(dir, file);
  const parsed = parseWardPdf(fullPath);
  const activeCount = parsed.voters.filter(v => !v.isDeleted).length;
  const deletedCount = parsed.voters.filter(v => v.isDeleted).length;
  const withEpic = parsed.voters.filter(v => Boolean(v.epic)).length;
  const minSerial = parsed.voters[0]?.serial || '-';
  const maxSerial = parsed.voters[parsed.voters.length - 1]?.serial || '-';

  console.log(`📁 ${file}: Ward ${parsed.wardNumber} (${parsed.villageName}) -> Total: ${parsed.voters.length} (Active: ${activeCount}, Del: ${deletedCount}, EPICs: ${withEpic}) | Serials: #${minSerial} to #${maxSerial}`);
  results.push(parsed);
}
