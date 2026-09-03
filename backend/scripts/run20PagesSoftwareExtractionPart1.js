const fs = require('fs');
const path = require('path');
const { ocrPdf } = require('../src/utils/pdfOcr');

const pdfPath = 'C:\\Users\\Ashish Sharma\\.gemini\\antigravity-ide\\brain\\7be5e028-530a-44f5-bdc2-2aee9654fb23\\.user_uploaded\\media_1788370349778.pdf';
const targetDir = 'D:\\data';
if (!fs.existsSync(targetDir)) {
  try { fs.mkdirSync(targetDir, { recursive: true }); } catch (e) {}
}

const outputPath = fs.existsSync(targetDir)
  ? path.join(targetDir, 'bhita_part1_20pages_software_extraction.json')
  : path.join(__dirname, 'bhita_part1_20pages_software_extraction.json');

console.log('========================================================================');
console.log(' 20-PAGE SOFTWARE OCR EXTRACTION & AUDIT - PART 1 (BHITA, PAGES 3 TO 22)');
console.log(' DOCUMENT: 179-सहाडा (सामान्य), भाग संख्या: 1 - भीटा                        ');
console.log('========================================================================\n');

async function runExtraction() {
  try {
    console.log(`Starting 20-Page Software OCR Processing on: ${pdfPath}`);
    // Run Low Memory OCR on PDF Pages 3 to 22
    const result = await ocrPdf(pdfPath, '179_bhita_part1.pdf', {
      firstPage: 3,
      lastPage: 22
    });

    console.log(`\nOCR Processing Complete!`);
    const records = result.voterRecords || [];
    console.log(`Total Extracted Voters Count: ${records.length}`);

    const payload = {
      metadata: {
        title: "निर्वाचक नामावली 2026 S20 राजस्थान",
        assemblyNumber: "179",
        assemblyName: "सहाडा (सामान्य)",
        partNumber: "1",
        boothName: "भाग संख्या 1 - भीटा",
        extractionMode: "20-Page Software Engine Extraction with 69,000 Name Dictionary",
        startPage: 3,
        endPage: 22,
        totalExtractedRecords: records.length,
        timestamp: new Date().toISOString()
      },
      records: records
    };

    fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2), 'utf8');
    console.log(`Saved 20-Page JSON Output at: ${outputPath}`);
  } catch (err) {
    console.error(`Error during 20-Page OCR Extraction:`, err);
  }
}

runExtraction();
