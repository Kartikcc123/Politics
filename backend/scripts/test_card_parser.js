const { execSync } = require('child_process');
const fs = require('fs');

function parseWardPdf(pdfPath) {
  const text = execSync(`pdftotext "${pdfPath}" -`, { encoding: 'utf8' });
  const pages = text.split('\x0c'); // Split by form feed (page delimiter)
  
  const coverPage = pages[0] || '';
  const gpMatch = coverPage.match(/(?:ग्रामपंचायत|गरमपपचरजत)\s*:\s*([^\n\r]+)/i);
  const wardMatch = coverPage.match(/(?:वार्ड क्रमांक|ररडर कमरपक)\s*:\s*(\d+)/i) || pdfPath.match(/Ward\s*No-?0*(\d+)/i);
  const villageMatch = coverPage.match(/(?:मुख्य गांव|मचखज गरपर)\s*:\s*([^\n\r]+)/i);

  const wardNumber = wardMatch ? String(Number(wardMatch[1])) : '1';
  let villageName = 'थला';
  if (['6', '7'].includes(wardNumber)) villageName = 'पिथलपुरा';
  else if (['8', '9'].includes(wardNumber)) villageName = 'मोखमपुरा';

  const voters = [];
  const epicRegex = /(?:[A-Z]{3}\d{7})|(?:RJ\/\d+\/\d+\/\d+)/;

  for (let pIdx = 2; pIdx < pages.length; pIdx++) {
    const pageText = pages[pIdx];
    if (!pageText.trim()) continue;

    // Split page text into blocks or lines
    const lines = pageText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    
    // Scan for serial numbers and EPICs
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const epicMatch = line.match(epicRegex);
      
      if (epicMatch) {
        const epic = epicMatch[0].trim();
        // Look backwards for serial number
        let serial = null;
        let isDeleted = false;

        for (let j = Math.max(0, i - 4); j <= i; j++) {
          const prev = lines[j];
          if (/^O?\s*(\d{1,4})$/.test(prev)) {
            const m = prev.match(/^O?\s*(\d{1,4})$/);
            serial = m[1];
            if (prev.startsWith('O') || prev.startsWith('E') || prev.startsWith('S') || prev.startsWith('R')) {
              isDeleted = true;
            }
            break;
          }
        }

        // Look forward for name, guardian, house, age, gender
        let name = '';
        let guardian = '';
        let house = '';
        let age = null;
        let gender = 'M';

        for (let j = i + 1; j < Math.min(lines.length, i + 12); j++) {
          const forward = lines[j];
          if (!name && /(?:नरम|नाम)\s*:\s*(.+)/.test(forward)) {
            name = forward.match(/(?:नरम|नाम)\s*:\s*(.+)/)[1].trim();
          } else if (!guardian && /(?:नपतर|पिता|पनत|पति|मरतर|माता)\s*कर?\s*नरम\s*:\s*(.+)/.test(forward)) {
            guardian = forward.match(/(?:नपतर|पिता|पनत|पति|मरतर|माता)\s*कर?\s*नरम\s*:\s*(.+)/)[1].trim();
          } else if (!house && /(?:मकरन|मकान)\s*सपखजर\s*:\s*(.+)/.test(forward)) {
            house = forward.match(/(?:मकरन|मकान)\s*सपखजर\s*:\s*(.+)/)[1].trim();
          } else if (!age && /(?:आजच|आयु)\s*:\s*(\d+)/.test(forward)) {
            age = Number(forward.match(/(?:आजच|आयु)\s*:\s*(\d+)/)[1]);
            if (/(?:सल|स्त्री|F)/i.test(forward)) gender = 'F';
          }
        }

        if (serial && !voters.some(v => v.serial === serial && v.epic === epic)) {
          voters.push({
            serial,
            epic,
            name,
            guardian,
            house,
            age,
            gender,
            isDeleted,
            wardNumber,
            villageName
          });
        }
      }
    }
  }

  // Also check if any voter cards had no EPIC (e.g. Parivardhan additions)
  // Sort by serial
  voters.sort((a, b) => Number(a.serial) - Number(b.serial));
  return {
    wardNumber,
    villageName,
    voters
  };
}

const res = parseWardPdf('C:\\Users\\Ashish Sharma\\Downloads\\THALA\\THALA-Ward No-001.pdf');
console.log(`Parsed ${res.voters.length} voters from THALA Ward 1:`);
console.log('Sample first 10:');
res.voters.slice(0, 10).forEach(v => {
  console.log(`  #${v.serial} [EPIC: ${v.epic}] ${v.name} | G: ${v.guardian} | H: ${v.house} | Age: ${v.age} | ${v.isDeleted ? 'DELETED' : 'ACTIVE'}`);
});
console.log('Sample last 5:');
res.voters.slice(-5).forEach(v => {
  console.log(`  #${v.serial} [EPIC: ${v.epic}] ${v.name} | G: ${v.guardian} | H: ${v.house} | Age: ${v.age} | ${v.isDeleted ? 'DELETED' : 'ACTIVE'}`);
});
