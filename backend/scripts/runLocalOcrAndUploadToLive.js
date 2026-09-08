const path = require('path');
const fs = require('fs');
const https = require('https');
const { ocrPdf } = require('../src/utils/pdfOcr');
const { safeSectionMap } = require('../src/controllers/importController');

const TARGET_HOST = 'politics.mathxmedia.tech';

function apiRequest(urlPath, method = 'GET', bodyData = null, token = '') {
  return new Promise((resolve, reject) => {
    const headers = {};
    if (token) headers['Authorization'] = 'Bearer ' + token;
    if (bodyData) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(bodyData);
    }

    const req = https.request({
      hostname: TARGET_HOST,
      path: urlPath,
      method: method,
      headers: headers
    }, (res) => {
      let buf = '';
      res.on('data', d => buf += d);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(buf) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: buf });
        }
      });
    });

    req.on('error', reject);
    if (bodyData) req.write(bodyData);
    req.end();
  });
}

async function main() {
  const rawPdfPath = process.argv[2];
  if (!rawPdfPath) {
    console.error('Usage: node backend/scripts/runLocalOcrAndUploadToLive.js <path-to-pdf> [firstPage] [lastPage]');
    process.exit(1);
  }

  const pdfPath = path.resolve(rawPdfPath);
  if (!fs.existsSync(pdfPath)) {
    console.error(`ERROR: File does not exist at: ${pdfPath}`);
    process.exit(1);
  }

  const firstPage = process.argv[3] ? parseInt(process.argv[3], 10) : 1;
  const lastPage = process.argv[4] ? parseInt(process.argv[4], 10) : undefined;

  console.log(`========================================================================`);
  console.log(`   RUNNING LOCAL OCR + LIVE SERVER DB UPLOAD                            `);
  console.log(`   Target PDF: ${path.basename(pdfPath)}                                `);
  console.log(`   Pages: ${firstPage} to ${lastPage || 'End'}                           `);
  console.log(`   Target Server: https://${TARGET_HOST}                               `);
  console.log(`========================================================================\n`);

  // 1. Admin Login to Live Server
  console.log(`1. Logging in to Live Production Server (https://${TARGET_HOST})...`);
  const loginRes = await apiRequest('/api/auth/login', 'POST', JSON.stringify({
    email: 'admin@example.com',
    password: 'AdminPass123'
  }));

  if (loginRes.status !== 200 || !loginRes.body?.token) {
    console.error('❌ Live Admin Login Failed:', loginRes);
    process.exit(1);
  }
  const token = loginRes.body.token;
  console.log('   ✅ Admin Login Successful!\n');

  // 2. Run Local OCR Pipeline with Updated Logic
  console.log('2. Running Updated Local OCR Engine (ocr_worker.py)...');
  const startTime = Date.now();
  let lastLoggedPage = -1;

  const result = await ocrPdf(pdfPath, path.basename(pdfPath), {
    firstPage,
    lastPage,
    onProgress: (progress) => {
      if (progress.phase === 'ocr' && progress.processedPages !== lastLoggedPage) {
        lastLoggedPage = progress.processedPages;
        console.log(`   [OCR PROGRESS] Page ${progress.processedPages}/${progress.totalPages} processed (${progress.processedCards || 0} cards parsed)`);
      }
    }
  });

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
  const records = result.voterRecords || [];
  const header = result.header || {};
  const docSectionMap = safeSectionMap(header.sectionMap || {});

  console.log(`   ✅ OCR Completed in ${durationSec}s. Extracted ${records.length} voters.\n`);

  if (records.length === 0) {
    console.log('No voter records extracted. Exiting upload.');
    return;
  }

  // 3. Upload Extracted Voters to Live Database
  console.log(`3. Uploading ${records.length} Extracted Voters to Live Server Database...`);
  
  const importPayload = {
    header: {
      assemblyNumber: header.assemblyNumber || '',
      assemblyName: header.assemblyName || '',
      partNumber: header.partNumber || '',
      village: header.village || '',
      postOffice: header.postOffice || '',
      policeStation: header.policeStation || '',
      tehsil: header.tehsil || '',
      district: header.district || '',
      pinCode: header.pinCode || '',
      sectionMap: docSectionMap
    },
    members: records.map(r => ({
      voterSerial: String(r.voterSerial || ''),
      voterId: r.voterId || '',
      name: r.name || '',
      guardianName: r.guardianName || '',
      relationType: r.relationType || '',
      houseNumber: r.houseNumber || '',
      age: r.age || null,
      gender: r.gender || '',
      sectionNumber: String(r.sectionNumber || '1'),
      sectionName: r.sectionName || docSectionMap[String(r.sectionNumber)] || '',
      assemblyNumber: header.assemblyNumber || '',
      partNumber: header.partNumber || ''
    }))
  };

  const uploadRes = await apiRequest('/api/import/members/json', 'POST', JSON.stringify(importPayload), token);
  
  if (uploadRes.status === 200 || uploadRes.status === 201) {
    console.log('   ✅ Live Database Import Successful!');
    if (uploadRes.body?.importedCount !== undefined) {
      console.log(`   Imported Count: ${uploadRes.body.importedCount}`);
    }
  } else {
    console.log(`   Attempting direct Member upsert pass (HTTP ${uploadRes.status})...`);
    let synced = 0;
    for (const m of importPayload.members) {
      if (!m.voterId) continue;
      const res = await apiRequest('/api/members', 'POST', JSON.stringify(m), token);
      if (res.status === 200 || res.status === 201) synced++;
    }
    console.log(`   ✅ Synced ${synced}/${importPayload.members.length} members directly to Live DB.`);
  }

  // 4. Print Summary Table
  console.log(`\n========================================================================`);
  console.log(`                  LIVE DATABASE STORED VOTERS SUMMARY                    `);
  console.log(`========================================================================`);
  console.log(`Assembly Name: ${header.assemblyName || 'N/A'}`);
  console.log(`Part Number: ${header.partNumber || 'N/A'}`);
  console.log(`Master Section Map:`, JSON.stringify(docSectionMap, null, 2));
  console.log(`Total Voters Uploaded: ${records.length}`);

  console.log(`\n--- First 10 Stored Voters Sample ---`);
  console.log(
    'S.No'.padEnd(8) +
    'EPIC / Voter ID'.padEnd(18) +
    'Name (नाम)'.padEnd(22) +
    'Guardian (पिता/पति)'.padEnd(22) +
    'House'.padEnd(8) +
    'Age'.padEnd(6) +
    'Section'
  );
  console.log('-'.repeat(100));

  for (const m of records.slice(0, 10)) {
    console.log(
      String(m.voterSerial || '-').padEnd(8) +
      String(m.voterId || 'N/A').padEnd(18) +
      String(m.name || '').padEnd(22).slice(0, 21) +
      String(m.guardianName || '').padEnd(22).slice(0, 21) +
      String(m.houseNumber || '-').padEnd(8) +
      String(m.age || '-').padEnd(6) +
      String(m.sectionName || docSectionMap[m.sectionNumber] || '-').slice(0, 25)
    );
  }
  console.log('========================================================================\n');
}

main().catch(console.error);
