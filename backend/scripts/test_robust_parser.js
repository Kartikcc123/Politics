const { execSync } = require('child_process');
const fs = require('fs');

function parseWardPdfRobust(pdfPath) {
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
    if (pageIndex <= 2) continue; // Skip cover and index pages

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

    // Filter words in body (ignore top header y < 135 and bottom footer y > 795)
    const bodyWords = words.filter(w => w.yMin >= 135 && w.yMax <= 795);
    if (bodyWords.length === 0) continue;

    // Find all epic or serial anchor words
    // In voter cards, EPIC words are at yMin of the card top
    const epicWords = bodyWords.filter(w => epicPattern.test(w.text));
    
    // Also find serial candidates near top of cards
    // Cluster y-coordinates of anchors to determine row bands
    const anchorYs = [];
    bodyWords.forEach(w => {
      if (epicPattern.test(w.text) || (/^[OESR]?\d{1,4}$/.test(w.text) && (w.xMin < 60 || (w.xMin > 210 && w.xMin < 240) || (w.xMin > 380 && w.xMin < 415)))) {
        anchorYs.push(w.yMin);
      }
    });

    if (anchorYs.length === 0) continue;

    // Cluster anchorYs within 10 points
    anchorYs.sort((a, b) => a - b);
    const rowTops = [];
    anchorYs.forEach(y => {
      if (rowTops.length === 0 || y - rowTops[rowTops.length - 1] > 20) {
        rowTops.push(y);
      }
    });

    // For each row band:
    for (let r = 0; r < rowTops.length; r++) {
      const rTop = rowTops[r];
      const rBottom = (r < rowTops.length - 1) ? rowTops[r + 1] : rTop + 73.0;

      // 3 Columns:
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

        // Sort cell words in reading order
        cellWords.sort((a, b) => {
          if (Math.abs(a.yMin - b.yMin) > 4) return a.yMin - b.yMin;
          return a.xMin - b.xMin;
        });

        const cellText = cellWords.map(w => w.text).join(' ');

        // Extract EPIC
        const epicMatch = cellText.match(epicPattern);
        
        // Extract Serial
        let serial = '';
        let isDeleted = false;

        // Serial is at the top left of the card
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

        if (!serial && !epicMatch) continue;

        const epic = epicMatch ? epicMatch[0].trim() : '';

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
          epic,
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

  // Sort by serial number
  allVoters.sort((a, b) => (Number(a.serial) || 0) - (Number(b.serial) || 0));
  return {
    wardNumber,
    villageName,
    voters: allVoters
  };
}

// Test on Ward 1
const res = parseWardPdfRobust('C:\\Users\\Ashish Sharma\\Downloads\\THALA\\THALA-Ward No-001.pdf');
console.log(`Ward 1: ${res.voters.length} voters parsed.`);
const deletedCount = res.voters.filter(v => v.isDeleted).length;
console.log(`Active: ${res.voters.length - deletedCount}, Deleted: ${deletedCount}`);
console.log(`Serials range: #${res.voters[0]?.serial} [${res.voters[0]?.epic}] -> #${res.voters[res.voters.length - 1]?.serial} [${res.voters[res.voters.length - 1]?.epic}]`);
console.log('\nFirst 5 voters:');
console.log(res.voters.slice(0, 5));
console.log('\nLast 5 voters:');
console.log(res.voters.slice(-5));
