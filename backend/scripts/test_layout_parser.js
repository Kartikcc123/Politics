const { execSync } = require('child_process');
const fs = require('fs');
const { decodeSecHindi } = require('../src/utils/secHindiDecoder');

function parsePdfWithLayout(pdfPath) {
  const txt = execSync(`pdftotext -layout -enc UTF-8 "${pdfPath}" -`, { maxBuffer: 25 * 1024 * 1024 }).toString('utf8');
  const pages = txt.split('\x0c'); // form feed separates pages
  
  const voters = [];
  let currentVillage = '';

  for (let pIdx = 0; pIdx < pages.length; pIdx++) {
    const pNum = pIdx + 1;
    if (pNum < 3 || pIdx === pages.length - 1) continue; // skip first 2 intro pages and last summary page

    const lines = pages[pIdx].split('\n');
    let lineIdx = 0;

    while (lineIdx < lines.length) {
      const line = lines[lineIdx];

      // Check for village header line like "बरहहण ममहललर,जयगररस" or "कच मररतत कक बसतल,सलर"
      if (line.includes(',') && !line.includes(':') && !line.includes('आजच') && !line.includes('ररजज') && !line.includes('नजलर') && !line.includes('पपचरजत') && !line.includes('गरमपपचरजत')) {
        const vHeader = line.trim();
        if (vHeader.length > 3) {
          currentVillage = decodeSecHindi(vHeader.split(',').pop().trim());
        }
      }

      // Check if this line starts a row of cards (contains serial + EPIC or Photo is Available)
      if (/([A-Z]{3}\d{7}|RJ\/\d+\/\d+\/\d+)/.test(line)) {
        // Collect the next 6-8 lines belonging to this 3-column card block
        const blockLines = lines.slice(lineIdx, lineIdx + 7);
        
        // Define 3 column horizontal slices
        const colSlices = [
          { min: 0, max: 48 },
          { min: 48, max: 92 },
          { min: 92, max: 150 }
        ];

        for (const col of colSlices) {
          const cardText = blockLines.map(l => l.slice(col.min, col.max).trim()).join('\n');
          if (!/([A-Z]{3}\d{7}|RJ\/\d+\/\d+\/\d+)/.test(cardText)) continue;

          // Parse card
          const isDeleted = /विलोप|निरस्त|हटाया|Delet/i.test(cardText);
          
          let serial = null;
          let epic = null;
          const epicMatch = cardText.match(/(\d+)?\s*([A-Z]{3}[0-9]{7}|RJ\/\d+\/\d+\/\d+)/i);
          if (epicMatch) {
            if (epicMatch[1]) serial = parseInt(epicMatch[1], 10);
            epic = epicMatch[2].toUpperCase();
          }

          let name = '';
          const nameMatch = cardText.match(/(?:नाम|नरम)\s*[:;]?\s*([^\n\r]+)/i);
          if (nameMatch) {
            let rawName = nameMatch[1].split(/(?:पिता|पति|माता|Photo|लिंग|ललग|मकान|मकरन|आजच|सपखजर|उम्र|आयु)/i)[0].trim();
            rawName = rawName.replace(/^\d+\s*/, '').replace(/[:;]/g, '').trim();
            if (!/^\d+$/.test(rawName)) {
              name = decodeSecHindi(rawName);
            }
          }

          let relationType = 'father';
          let guardianName = '';
          const relMatch = cardText.match(/(पिता|पति|माता|नपतर|पनत|मरतर)\s*(?:का\s*नाम|कर\s*नरम)?\s*[:;]?\s*([^\n\r]+)/i);
          if (relMatch) {
            const relWord = relMatch[1];
            if (/पति|पनत/i.test(relWord)) relationType = 'husband';
            else if (/माता|मरतर/i.test(relWord)) relationType = 'mother';
            else relationType = 'father';

            let rawRel = relMatch[2].split(/(?:मकान|मकरन|सपखजर|लिंग|ललग|आजच|उम्र|आयु|Photo)/i)[0].trim();
            rawRel = rawRel.replace(/[:;]/g, '').trim();
            guardianName = decodeSecHindi(rawRel);
          }

          let houseNumber = '';
          const houseMatch = cardText.match(/(?:मकान\s*संख्या|मकरन\s*सपखजर|मकान\s*नं|गृह\s*संख्या)\s*[:;]?\s*([^\n\r]+)/i);
          if (houseMatch) {
            let rawH = houseMatch[1].split(/(?:आयु|उम्र|लिंग|आजच|ललग|Photo)/i)[0].trim();
            rawH = rawH.replace(/(?:पिता|पति|माता|नाम|नरम|नपतर|पनत)/gi, '').trim();
            houseNumber = decodeSecHindi(rawH);
          }

          let age = null;
          const ageMatch = cardText.match(/(?:आयु|उम्र|आजच)\s*[:;]?\s*(\d{1,3})/i);
          if (ageMatch) age = parseInt(ageMatch[1], 10);

          let gender = '';
          if (/महिला|स्त्री|\bसल\b|female/i.test(cardText)) gender = 'female';
          else if (/पुरुष|\bपचरष\b|\bपचरुष\b|male/i.test(cardText)) gender = 'male';

          voters.push({
            serial,
            epic,
            name,
            relationType,
            guardianName,
            houseNumber,
            age,
            gender,
            isDeleted,
            villageName: currentVillage,
            page: pNum
          });
        }

        lineIdx += 6; // advance past the card block
      } else {
        lineIdx++;
      }
    }
  }

  // Deduplicate and fill missing contiguous serials
  const unique = [];
  const seenEpics = new Set();
  for (const v of voters) {
    if (v.epic) {
      if (seenEpics.has(v.epic)) continue;
      seenEpics.add(v.epic);
    }
    unique.push(v);
  }

  for (let i = 0; i < unique.length; i++) {
    if (!unique[i].serial) {
      unique[i].serial = i + 1;
    }
  }

  return unique;
}

// Test on Panotiya Ward 4
const voters = parsePdfWithLayout("C:\\Users\\Ashish Sharma\\Downloads\\panotiya\\PANOTIYA-Ward No-004.pdf");
console.log(`Extracted ${voters.length} voters from Panotiya Ward 4.`);
console.log('First 15 voters:');
voters.slice(0, 15).forEach(v => console.log(v));

console.log('Last 5 voters:');
voters.slice(-5).forEach(v => console.log(v));
