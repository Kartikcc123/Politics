const { execSync } = require('child_process');
const fs = require('fs');

function parseWardPdfBbox(pdfPath) {
  const xml = execSync(`pdftotext -bbox "${pdfPath}" -`, { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 });
  
  // Extract pages
  const pageRegex = /<page\s+width="([\d.]+)"\s+height="([\d.]+)">([\s\S]*?)<\/page>/g;
  let pageMatch;
  let pageIndex = 0;
  
  const allVoters = [];
  let headerInfo = {
    district: '',
    panchayatSamiti: '',
    gramPanchayat: '',
    wardNumber: '',
    village: ''
  };

  while ((pageMatch = pageRegex.exec(xml)) !== null) {
    pageIndex++;
    const pageWidth = parseFloat(pageMatch[1]);
    const pageHeight = parseFloat(pageMatch[2]);
    const pageContent = pageMatch[3];

    // Extract words with bbox
    const wordRegex = /<word\s+xMin="([\d.]+)"\s+yMin="([\d.]+)"\s+xMax="([\d.]+)"\s+yMax="([\d.]+)">([^<]+)<\/word>/g;
    let wMatch;
    const words = [];
    while ((wMatch = wordRegex.exec(pageContent)) !== null) {
      words.push({
        xMin: parseFloat(wMatch[1]),
        yMin: parseFloat(wMatch[2]),
        xMax: parseFloat(wMatch[3]),
        yMax: parseFloat(wMatch[4]),
        text: wMatch[5].trim()
      });
    }

    if (pageIndex === 1) {
      // Cover page
      const fullText = words.map(w => w.text).join(' ');
      const wardM = fullText.match(/(?:ररडर|वार्ड)\s*(?:कमरपक|क्रमांक)?\s*[:\s]+(\d+)/i) || pdfPath.match(/Ward\s*No-?0*(\d+)/i);
      if (wardM) headerInfo.wardNumber = String(parseInt(wardM[1], 10));
      continue;
    }

    // Check if voter listing page (has voter cards)
    // Voter cards start below y = 130 and end above y = 800
    // Standard 3 columns:
    // Col 0: x in [30, 215]
    // Col 1: x in [215, 395]
    // Col 2: x in [395, 575]
    
    // Find horizontal separator lines or row bands:
    // Rows typically have cards of height ~65. Let's find cards by detecting EPICs or Serials or grid cells.
    // Let's filter words that belong to the card region
    const cardWords = words.filter(w => w.yMin >= 130 && w.yMax <= 805 && w.xMin >= 25 && w.xMax <= 585);
    if (cardWords.length === 0) continue;

    // Group words into columns
    const cols = [
      cardWords.filter(w => w.xMin < 215),
      cardWords.filter(w => w.xMin >= 215 && w.xMin < 395),
      cardWords.filter(w => w.xMin >= 395)
    ];

    // For each column, group into cards by detecting EPIC / Serial headers
    cols.forEach((colWords, colIdx) => {
      if (colWords.length === 0) return;
      
      // Sort words top to bottom
      colWords.sort((a, b) => a.yMin - b.yMin || a.xMin - b.xMin);

      // Find card starting anchors: words that match EPIC regex OR numbers at the top left of each card
      // In Rajasthan voter lists, each card starts with a Serial number at top-left, and EPIC at top-right or next to it.
      // Let's group words into vertical slices / cards.
      // Let's identify the serial numbers in this column:
      // A serial number is an integer (1..2000) or 'O' + integer, appearing at the top-left of a card.
      
      const cardsInCol = [];
      let currentCard = null;

      for (let i = 0; i < colWords.length; i++) {
        const w = colWords[i];
        const isSerialCandidate = /^[OESR]?\d{1,4}$/.test(w.text) && (i === 0 || (w.yMin - colWords[i-1].yMin > 25));
        const isEpicCandidate = /(?:[A-Z]{3}\d{7})|(?:RJ\/\d+\/\d+\/\d+)/.test(w.text);

        // If this word is a serial candidate at the top of a new card
        if (isSerialCandidate && (!currentCard || (w.yMin - currentCard.startY > 35))) {
          if (currentCard) cardsInCol.push(currentCard);
          currentCard = {
            startY: w.yMin,
            words: [w]
          };
        } else if (currentCard) {
          currentCard.words.push(w);
        } else {
          currentCard = {
            startY: w.yMin,
            words: [w]
          };
        }
      }
      if (currentCard) cardsInCol.push(currentCard);

      // Now parse each card
      for (const card of cardsInCol) {
        const cWords = card.words;
        const text = cWords.map(w => w.text).join(' ');
        
        // Serial
        let serial = '';
        let isDeleted = false;
        const sMatch = text.match(/^([OESR]?\s*\d{1,4})/);
        if (sMatch) {
          const rawS = sMatch[1].replace(/\s+/g, '');
          if (/^[OESR]/.test(rawS)) isDeleted = true;
          serial = rawS.replace(/^[OESR]/, '');
        } else {
          // fallback: look for first number
          const firstNum = cWords.find(w => /^\d{1,4}$/.test(w.text));
          if (firstNum) serial = firstNum.text;
        }

        // EPIC
        const epicMatch = text.match(/(?:[A-Z]{3}\d{7})|(?:RJ\/\d+\/\d+\/\d+)/);
        const epic = epicMatch ? epicMatch[0] : '';

        // Name
        let name = '';
        const nameM = text.match(/(?:नरम|नाम)\s*:\s*([^:]+?)(?=(?:नपतर|पिता|पनत|पति|मरतर|माता|मकरन|मकान|Photo|Available|$))/);
        if (nameM) name = nameM[1].replace(/Photo\s*is\s*Available/gi, '').trim();

        // Guardian
        let guardian = '';
        let relationType = 'father';
        const guardM = text.match(/(?:(नपतर|पिता|पनत|पति|मरतर|माता)\s*कर?\s*नरम|पिता|पति|माता)\s*:\s*([^:]+?)(?=(?:मकरन|मकान|आजच|आयु|Photo|$))/);
        if (guardM) {
          if (/(?:पनत|पति)/.test(guardM[1])) relationType = 'husband';
          else if (/(?:मरतर|माता)/.test(guardM[1])) relationType = 'mother';
          guardian = guardM[2].replace(/Photo\s*is\s*Available/gi, '').trim();
        }

        // House
        let house = '';
        const houseM = text.match(/(?:मकरन|मकान)\s*(?:सपखजर|संख्या)?\s*:\s*([^:]+?)(?=(?:आजच|आयु|Photo|$))/);
        if (houseM) house = houseM[1].replace(/Photo\s*is\s*Available/gi, '').trim();

        // Age & Gender
        let age = null;
        let gender = 'male';
        const ageM = text.match(/(?:आजच|आयु)\s*:\s*(\d+)/);
        if (ageM) age = parseInt(ageM[1], 10);
        if (/(?:सल|स्त्री|F|महिला)/i.test(text)) gender = 'female';

        if (serial || epic) {
          allVoters.push({
            pageNumber: pageIndex,
            serial: serial || '',
            epic: epic || '',
            name,
            guardianName: guardian,
            relationType,
            houseNumber: house,
            age,
            gender,
            isDeleted
          });
        }
      }
    });
  }

  return {
    headerInfo,
    voters: allVoters
  };
}

const res = parseWardPdfBbox('C:\\Users\\Ashish Sharma\\Downloads\\THALA\\THALA-Ward No-001.pdf');
console.log(`Parsed ${res.voters.length} total voter cards from THALA Ward 1!`);
console.log('Sample 1..10:');
console.log(res.voters.slice(0, 10));
console.log('Sample last 5:');
console.log(res.voters.slice(-5));
