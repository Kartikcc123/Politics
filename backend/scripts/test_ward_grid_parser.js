const { execSync } = require('child_process');
const fs = require('fs');

function parseWardPdfGrid(pdfPath) {
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

  const colBounds = [
    { min: 25, max: 205 },
    { min: 205, max: 380 },
    { min: 380, max: 565 }
  ];

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

    // Filter words belonging to the voter cards grid (y between 145 and 765)
    const gridWords = words.filter(w => w.yMin >= 145 && w.yMax <= 765 && w.xMin >= 25 && w.xMax <= 565);
    if (gridWords.length === 0) continue;

    // Find all row anchors (top-left serial numbers or top EPIC words)
    // Anchor lines are at y ≈ 162, 234, 306, 378, 450, 522, 594, 666, 738
    // Let's identify the row bands dynamically or by standard step
    // Height per row is ~72.3. Top starts around 155.
    
    // We can partition the page into 8 rows (or up to 10 rows):
    const rowStep = 72.35;
    const startY = 150.0;
    
    // For each col and row cell:
    for (let r = 0; r < 9; r++) {
      const rowMinY = startY + r * rowStep;
      const rowMaxY = rowMinY + rowStep;

      for (let c = 0; c < 3; c++) {
        const colMinX = colBounds[c].min;
        const colMaxX = colBounds[c].max;

        const cellWords = gridWords.filter(w => 
          w.xMin >= colMinX - 5 && w.xMax <= colMaxX + 5 &&
          w.yMin >= rowMinY - 8 && w.yMax <= rowMaxY + 8
        );

        if (cellWords.length === 0) continue;

        // Sort cell words reading order (top to bottom, left to right)
        cellWords.sort((a, b) => {
          if (Math.abs(a.yMin - b.yMin) > 4) return a.yMin - b.yMin;
          return a.xMin - b.xMin;
        });

        const cellText = cellWords.map(w => w.text).join(' ');

        // Check if this cell contains a voter card
        const epicMatch = cellText.match(/(?:[A-Z]{3}\d{7})|(?:RJ\/\d+\/\d+\/\d+)/);
        
        // Find serial number: usually the first number or word starting with [OESR]?\d+
        let serial = '';
        let isDeleted = false;

        // Look at top words of cell (first 4 words)
        for (let i = 0; i < Math.min(cellWords.length, 5); i++) {
          const wText = cellWords[i].text;
          const sMatch = wText.match(/^([OESR]?\s*\d{1,4})$/);
          if (sMatch) {
            const raw = sMatch[1].replace(/\s+/g, '');
            if (/^[OESR]/.test(raw)) isDeleted = true;
            serial = raw.replace(/^[OESR]/, '');
            break;
          }
        }

        if (!serial) {
          const m = cellText.match(/^([OESR]?\s*\d{1,4})/);
          if (m) {
            const raw = m[1].replace(/\s+/g, '');
            if (/^[OESR]/.test(raw)) isDeleted = true;
            serial = raw.replace(/^[OESR]/, '');
          }
        }

        if (!serial && !epicMatch) {
          // Empty cell / placeholder
          continue;
        }

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
          row: r + 1,
          col: c + 1,
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

const res1 = parseWardPdfGrid('C:\\Users\\Ashish Sharma\\Downloads\\THALA\\THALA-Ward No-001.pdf');
console.log(`\n=== THALA WARD 1 PARSE RESULTS ===`);
console.log(`Total voters parsed: ${res1.voters.length}`);
console.log(`Serials range: ${res1.voters[0]?.serial} to ${res1.voters[res1.voters.length - 1]?.serial}`);
console.log('Sample 1..5:');
console.log(res1.voters.slice(0, 5));
console.log('Sample last 5:');
console.log(res1.voters.slice(-5));
