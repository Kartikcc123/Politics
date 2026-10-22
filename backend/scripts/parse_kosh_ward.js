const fs = require('fs');
const PDFParser = require('pdf2json');
const { decodeSecHindi } = require('../src/utils/secHindiDecoder');

function parseWardPdf(pdfPath) {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser();

    pdfParser.on('pdfParser_dataError', errData => reject(errData.parserError));
    pdfParser.on('pdfParser_dataReady', pdfData => {
      try {
        const voters = [];
        // Extract ward number from filename
        const wardMatch = pdfPath.match(/Ward\s*No-?0*(\d+)/i);
        const wardNumber = wardMatch ? String(parseInt(wardMatch[1], 10)) : '1';

        console.log(`Processing ${pdfPath} (Ward ${wardNumber}) - Total Pages: ${pdfData.Pages.length}`);

        // Pages 3 onwards have voters
        for (let pageIdx = 2; pageIdx < pdfData.Pages.length; pageIdx++) {
          const page = pdfData.Pages[pageIdx];
          const pageNum = pageIdx + 1;

          // Get all texts on page
          const allTexts = page.Texts.map(t => {
            const raw = decodeURIComponent(t.R[0].T);
            return {
              x: t.x,
              y: t.y,
              w: t.w,
              raw,
              decoded: decodeSecHindi(raw).trim()
            };
          }).filter(t => t.decoded.length > 0 && t.y > 7.0 && t.y < 35.0); // card bounding box in y

          // Define 3 columns in x:
          // Col 1: x from 1.5 to 12.5
          // Col 2: x from 12.5 to 24.0
          // Col 3: x from 24.0 to 36.5
          const columns = [
            allTexts.filter(t => t.x >= 1.5 && t.x < 12.5),
            allTexts.filter(t => t.x >= 12.5 && t.x < 24.0),
            allTexts.filter(t => t.x >= 24.0 && t.x < 36.5)
          ];

          // For each column, find voter card cells
          columns.forEach((colTexts, colIdx) => {
            // Find all serial number anchors: number at the top of a card
            // In these PDFs, serial number is at y where y has a step of ~2.4 units per card row
            // Or look for EPIC numbers or serial anchors
            // Let's sort colTexts by y
            colTexts.sort((a, b) => a.y - b.y);

            // Group into card clusters based on vertical gaps
            // A card starts with a serial number or EPIC or "नाम :"
            const cardClusters = [];
            let currentCluster = [];

            // A new card typically has a serial or name or y gap > 1.8
            for (let i = 0; i < colTexts.length; i++) {
              const item = colTexts[i];
              // Check if item is a card header (e.g. integer serial number or contains EPIC)
              const isEpic = /^[A-Z]{3}\d{7}$|^RJ\/\d+\/\d+\/\d+$/i.test(item.raw);
              const isSerial = /^\d{1,4}$/.test(item.raw) && (currentCluster.length === 0 || item.y - (currentCluster[currentCluster.length - 1]?.y || 0) > 1.2);

              if ((isSerial || isEpic) && currentCluster.length > 2) {
                cardClusters.push(currentCluster);
                currentCluster = [item];
              } else {
                currentCluster.push(item);
              }
            }
            if (currentCluster.length > 0) {
              cardClusters.push(currentCluster);
            }

            // Parse each cluster
            for (const cluster of cardClusters) {
              const fullText = cluster.map(c => c.decoded).join(' ');
              const rawText = cluster.map(c => c.raw).join(' ');

              // Serial
              let serial = '';
              const serialItem = cluster.find(c => /^\d{1,4}$/.test(c.raw) && c.y <= cluster[0].y + 0.5);
              if (serialItem) serial = serialItem.raw;

              // EPIC
              let epic = '';
              const epicItem = cluster.find(c => /^[A-Z]{3}\d{7}$|^RJ\/\d+\/\d+\/\d+$/i.test(c.raw));
              if (epicItem) epic = epicItem.raw;

              // Name
              let name = '';
              const nameM = fullText.match(/नाम\s*:\s*([^:]+?)(?=(?:पिता|पति|माता|मकान|आयु|लिंग|Photo|$))/);
              if (nameM) name = cleanExtractedName(nameM[1]);

              // Guardian
              let guardian = '';
              let relationType = 'father';
              if (/पति\s*का\s*नाम/i.test(fullText)) relationType = 'husband';
              else if (/माता\s*का\s*नाम/i.test(fullText)) relationType = 'mother';

              const guardM = fullText.match(/(?:पिता|पति|माता)\s*का\s*नाम\s*:\s*([^:]+?)(?=(?:मकान|आयु|लिंग|Photo|$))/);
              if (guardM) guardian = cleanExtractedName(guardM[1]);

              // House
              let house = '';
              const houseM = fullText.match(/मकान\s*(?:संख्या)?\s*:\s*([^\s:]+)/);
              if (houseM) house = houseM[1].replace(/Photo/i, '').trim();

              // Age
              let age = null;
              const ageM = fullText.match(/आयु\s*:\s*(\d+)/);
              if (ageM) age = parseInt(ageM[1], 10);

              // Gender
              let gender = 'male';
              if (/स्त्री|महिला|F/i.test(fullText)) gender = 'female';

              if (name || serial || epic) {
                voters.push({
                  serial,
                  epic,
                  name,
                  guardianName: guardian,
                  relationType,
                  houseNumber: house,
                  age,
                  gender,
                  wardNumber,
                  page: pageNum
                });
              }
            }
          });
        }

        resolve(voters);
      } catch (e) {
        reject(e);
      }
    });

    pdfParser.loadPDF(pdfPath);
  });
}

function cleanExtractedName(str) {
  if (!str) return '';
  return str
    .replace(/Photo\s*(?:is)?\s*Available/gi, '')
    .replace(/[;:,.\-_\*\#\$\@\^\!\|\~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function run() {
  const voters = await parseWardPdf('C:/Users/pc/Downloads/koshithal/WithPhoto_KOSHITHAL-Ward No-001.pdf');
  console.log(`Parsed ${voters.length} voters from Ward 1`);
  console.log('\n--- First 15 voters ---');
  voters.slice(0, 15).forEach(v => {
    console.log(`#${v.serial} [EPIC: ${v.epic}] Name: "${v.name}" | Guardian (${v.relationType}): "${v.guardianName}" | House: "${v.houseNumber}" | Age: ${v.age} | ${v.gender}`);
  });
}

run().catch(console.error);
