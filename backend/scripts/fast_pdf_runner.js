const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { ocrPdf } = require('../src/utils/pdfOcr');
const { safeSectionMap } = require('../src/controllers/importController');

// High-speed OCR engine defaults
process.env.OCR_DPI = process.env.OCR_DPI || '200';
process.env.OCR_CELL_CONCURRENCY = process.env.OCR_CELL_CONCURRENCY || '8';

const DEFAULT_FOLDER = 'D:\\Randeep Trivedi Voter list\\Final Publication 21.02.2026';
const TARGET_HOST = process.env.TARGET_HOST || '187.127.173.42';
const TARGET_PORT = process.env.TARGET_PORT ? parseInt(process.env.TARGET_PORT, 10) : 5003;
const IS_HTTPS = TARGET_PORT === 443;

const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 30 });
const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 30 });

function apiRequest(urlPath, method = 'GET', bodyData = null, token = '') {
  return new Promise((resolve, reject) => {
    const client = IS_HTTPS ? https : http;
    const headers = {};
    if (token) headers['Authorization'] = 'Bearer ' + token;
    if (bodyData) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(bodyData);
    }
    const req = client.request({
      hostname: TARGET_HOST,
      port: TARGET_PORT,
      path: urlPath,
      method,
      headers,
      agent: IS_HTTPS ? httpsAgent : httpAgent,
      timeout: 60000
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); } catch(e) { resolve({ status: res.statusCode, raw: d }); }
      });
    });
    req.on('timeout', () => { req.destroy(new Error('ETIMEDOUT')); });
    req.on('error', reject);
    if (bodyData) req.write(bodyData);
    req.end();
  });
}

async function safeApiRequest(urlPath, method = 'GET', bodyData = null, token = '', maxRetries = 8) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await apiRequest(urlPath, method, bodyData, token);
      if (res.status === 502 || res.status === 503 || res.status === 504) {
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 1000 * attempt));
          continue;
        }
      }
      return res;
    } catch (err) {
      if (attempt < maxRetries) {
        process.stdout.write(`\n   ⚠️ Network reconnecting (attempt ${attempt}/${maxRetries}: ${err.message})...`);
        await new Promise(r => setTimeout(r, 1500 * attempt));
        continue;
      }
      return { status: 500, error: err.message };
    }
  }
  return { status: 500, error: 'Max retries exceeded' };
}

// Parse parts input from CLI (e.g. "55-99", "1,2,4", "missing", "all")
function parseRequestedParts(args, allPdfFiles) {
  const partsSet = new Set();
  const rawTarget = args[0] || 'missing';

  if (rawTarget.toLowerCase() === 'all') {
    for (let p = 1; p <= 350; p++) partsSet.add(p);
    return { partsSet, mode: 'all' };
  }

  if (rawTarget.toLowerCase() === 'missing') {
    return { partsSet: null, mode: 'missing' };
  }

  // Parse comma-separated and ranges e.g. "55-99,105,110-120"
  const tokens = rawTarget.split(',');
  for (const tok of tokens) {
    const cleanTok = tok.trim();
    if (cleanTok.includes('-')) {
      const [startStr, endStr] = cleanTok.split('-');
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      if (!isNaN(start) && !isNaN(end)) {
        for (let p = Math.min(start, end); p <= Math.max(start, end); p++) {
          partsSet.add(p);
        }
      }
    } else {
      const num = parseInt(cleanTok, 10);
      if (!isNaN(num)) partsSet.add(num);
    }
  }

  return { partsSet, mode: 'custom' };
}

// Locate PDF file by Part Number
function findPdfForPart(folder, partNum, allFiles) {
  // 1. Direct standard pattern match
  const standardName = `2026-EROLLGEN-S20-179-SIR-FinalRoll-Revision1-HIN-${partNum}.pdf`;
  const standardPath = path.join(folder, standardName);
  if (fs.existsSync(standardPath)) return standardPath;

  // 2. Search pattern in all files in folder
  for (const f of allFiles) {
    const fnPartMatch = f.match(/-(?:HIN|ENG|RAJ|MAR|GUJ)-(\d{1,4})(?:\.pdf|_|$)/i) || 
                         f.match(/[-_](\d{1,4})\.pdf$/i) || 
                         f.match(/^(\d{1,4})\.pdf$/i);
    if (fnPartMatch && parseInt(fnPartMatch[1], 10) === partNum) {
      return path.join(folder, f);
    }
  }
  return null;
}

async function processSinglePdf(pdfPath, partNum, token, index, total) {
  const fileName = path.basename(pdfPath);
  console.log(`\n========================================================================`);
  console.log(`🚀 [${index + 1}/${total}] PROCESSING PART ${partNum}: ${fileName}`);
  console.log(`========================================================================`);

  const startTime = Date.now();
  let lastLoggedPage = -1;
  const cachePath = `${pdfPath}.ocr.json`;

  try {
    let result = null;
    if (fs.existsSync(cachePath)) {
      try {
        const raw = fs.readFileSync(cachePath, 'utf8');
        result = JSON.parse(raw);
        console.log(`   ⚡ Loaded OCR from disk cache (${(result.records || result.voterRecords || []).length} voters)`);
      } catch (cacheErr) {
        console.warn(`   ⚠️ Cache unreadable, re-running OCR:`, cacheErr.message);
      }
    }

    if (!result) {
      result = await ocrPdf(pdfPath, fileName, {
        onProgress: (progress) => {
          if (progress.phase === 'ocr' && progress.processedPages !== lastLoggedPage) {
            lastLoggedPage = progress.processedPages;
            const pct = Math.round((progress.processedPages / progress.totalPages) * 100) || 0;
            process.stdout.write(`\r   [भाग ${partNum}] [${fileName}] Page ${progress.processedPages}/${progress.totalPages} (${pct}%) | ${progress.processedCards || 0} cards`);
          }
        }
      });
      try {
        fs.writeFileSync(cachePath, JSON.stringify(result), 'utf8');
      } catch (_) {}
    }

    console.log('\n');
    const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
    const records = result.records || result.voterRecords || [];
    const header = result.header || {};
    const docSectionMap = safeSectionMap(header.sectionMap || {});

    console.log(`   ✅ OCR Done in ${durationSec}s. Found ${records.length} voters (Assembly: ${header.assemblyName || 'सहाड़ा'}, Part: ${partNum})`);

    if (records.length === 0) {
      console.log(`   ⚠️ No voter records found in Part ${partNum}.`);
      return;
    }

    function readImageBase64(...candidates) {
      for (const c of candidates) {
        if (!c || typeof c !== 'string') continue;
        const cleanPath = c.replace(/^[/\\]?uploads[/\\]?/i, '');
        const pathsToTry = [
          c,
          path.resolve(c),
          path.join(process.cwd(), c),
          path.join(process.cwd(), 'uploads', cleanPath),
          path.join(__dirname, '..', 'uploads', cleanPath),
        ];
        for (const p of pathsToTry) {
          try {
            if (fs.existsSync(p) && fs.statSync(p).isFile() && fs.statSync(p).size > 0) {
              return `data:image/jpeg;base64,${fs.readFileSync(p).toString('base64')}`;
            }
          } catch (_) {}
        }
      }
      return '';
    }

    let attachedImages = 0;
    const membersList = records.map(r => {
      const cardB64 = readImageBase64(r.localCardImage, r.cardImage);
      const photoB64 = readImageBase64(r.localPhoto, r.photo);
      if (cardB64 || photoB64) attachedImages++;
      return {
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
        assemblyNumber: '179',
        partNumber: String(partNum),
        village: header.village || '',
        cardImage: cardB64,
        photo: photoB64
      };
    });

    const CHUNK_SIZE = 5;
    let totalImported = 0;
    console.log(`   📤 Uploading ${membersList.length} voters (${attachedImages} images attached) to database in chunks of ${CHUNK_SIZE}...`);

    for (let cIdx = 0; cIdx < membersList.length; cIdx += CHUNK_SIZE) {
      const chunk = membersList.slice(cIdx, cIdx + CHUNK_SIZE);
      const importPayload = {
        header: {
          assemblyNumber: '179',
          assemblyName: header.assemblyName || 'सहाड़ा',
          partNumber: String(partNum),
          village: header.village || '',
          postOffice: header.postOffice || '',
          policeStation: header.policeStation || '',
          tehsil: header.tehsil || '',
          district: header.district || '',
          pinCode: header.pinCode || '',
          sectionMap: docSectionMap
        },
        members: chunk
      };

      let uploadRes = await safeApiRequest('/api/import/members/json', 'POST', JSON.stringify(importPayload), token, 8);

      if (uploadRes.status === 200 || uploadRes.status === 201) {
        totalImported += chunk.length;
        process.stdout.write(`\r   ✅ Chunk ${Math.floor(cIdx / CHUNK_SIZE) + 1}/${Math.ceil(membersList.length / CHUNK_SIZE)} saved (${totalImported}/${membersList.length} voters)...`);
      } else {
        console.warn(`\n   ⚠️ Chunk ${Math.floor(cIdx / CHUNK_SIZE) + 1} status ${uploadRes.status}. Retrying individual members...`);
        let synced = 0;
        for (const m of chunk) {
          if (!m.voterId && !m.name) continue;
          let res = await safeApiRequest('/api/import/members/json', 'POST', JSON.stringify({ header: importPayload.header, members: [m] }), token, 5);
          if (res.status === 200 || res.status === 201) synced++;
        }
        totalImported += synced;
      }
    }

    console.log(`\n   🎉 Database Import Complete for Part ${partNum}! (Saved ${totalImported} voters in DB)`);
    try {
      await safeApiRequest('/api/families/rebuild', 'POST', null, token, 2);
    } catch (_) {}
    if (fs.existsSync(cachePath)) {
      try { fs.unlinkSync(cachePath); } catch (_) {}
    }
  } catch (err) {
    console.error(`\n   ❌ ERROR processing Part ${partNum}:`, err.message);
  }
}

async function main() {
  const nonFlagArgs = process.argv.slice(2).filter(a => !a.startsWith('-'));
  const folderArg = nonFlagArgs.find(a => fs.existsSync(a) && fs.statSync(a).isDirectory()) || DEFAULT_FOLDER;
  const partsArg = nonFlagArgs.find(a => a !== folderArg) || 'missing';

  let concurrency = 2;
  const cIdx = process.argv.findIndex(a => a === '-c' || a === '--concurrency');
  if (cIdx !== -1 && process.argv[cIdx + 1]) {
    const val = parseInt(process.argv[cIdx + 1], 10);
    if (!isNaN(val) && val > 0) concurrency = val;
  }

  console.log('========================================================================');
  console.log('⚡ HIGH-SPEED SMART CONSTITUENCY VOTER PDF RUNNER');
  console.log('========================================================================');
  console.log(`📁 PDF Folder   : ${folderArg}`);
  console.log(`🎯 Target Range : ${partsArg}`);
  console.log(`⚡ Concurrency  : ${concurrency} PDFs in Parallel`);
  console.log(`🌐 Live Server  : ${IS_HTTPS ? 'https://' : 'http://'}${TARGET_HOST}:${TARGET_PORT}\n`);

  if (!fs.existsSync(folderArg)) {
    console.error(`❌ Folder does not exist: ${folderArg}`);
    process.exit(1);
  }

  const allFiles = fs.readdirSync(folderArg).filter(f => f.toLowerCase().endsWith('.pdf'));
  console.log(`Found ${allFiles.length} PDF files in folder.\n`);

  // Login to Server
  console.log('Logging in as Admin to server...');
  const loginRes = await apiRequest('/api/auth/login', 'POST', JSON.stringify({
    email: process.env.ADMIN_EMAIL || 'admin@example.com',
    password: process.env.ADMIN_PASSWORD || 'AdminPass123'
  }));

  if (loginRes.status !== 200 || !loginRes.body?.token) {
    console.error('❌ Login failed:', loginRes);
    process.exit(1);
  }
  const token = loginRes.body.token;
  console.log('✅ Admin Login Successful!\n');

  // Determine which parts to process
  let partsToProcess = [];
  const { partsSet, mode } = parseRequestedParts([partsArg], allFiles);

  if (mode === 'missing') {
    console.log('🔍 Checking database for missing parts...');
    const locGroups = await apiRequest('/api/members/location-groups?limit=1000', 'GET', null, token);
    const items = locGroups.body?.items || [];
    const dbPartCounts = new Map();
    for (const item of items) {
      const p = String(item.key?.partNumber || '').trim();
      if (p) dbPartCounts.set(p, (dbPartCounts.get(p) || 0) + (item.count || 0));
    }

    for (let p = 1; p <= 315; p++) {
      const count = dbPartCounts.get(String(p)) || 0;
      if (count < 100) partsToProcess.push(p);
    }
    console.log(`📋 Found ${partsToProcess.length} missing parts in database.\n`);
  } else if (mode === 'custom' || mode === 'all') {
    partsToProcess = Array.from(partsSet).sort((a,b) => a - b);
  }

  // Filter only parts that have existing PDF files
  const workQueue = [];
  for (const p of partsToProcess) {
    const pdfPath = findPdfForPart(folderArg, p, allFiles);
    if (pdfPath) {
      workQueue.push({ partNum: p, pdfPath });
    } else {
      console.warn(`   ⚠️ PDF for Part ${p} not found in folder. Skipping.`);
    }
  }

  console.log(`\n🏁 Total Queue to Process: ${workQueue.length} PDFs (in exact numerical order)`);
  if (workQueue.length === 0) {
    console.log('🎉 Nothing to process! All requested parts are already complete.');
    process.exit(0);
  }

  const batchStart = Date.now();
  let cursor = 0;

  const worker = async () => {
    while (cursor < workQueue.length) {
      const idx = cursor;
      cursor += 1;
      const item = workQueue[idx];
      await processSinglePdf(item.pdfPath, item.partNum, token, idx, workQueue.length);
    }
  };

  const pool = Array.from({ length: Math.min(concurrency, workQueue.length) }, () => worker());
  await Promise.all(pool);

  const totalMin = ((Date.now() - batchStart) / 1000 / 60).toFixed(1);
  console.log(`\n========================================================================`);
  console.log(`🎉 ALL REQUESTED PDFs PROCESSED IN ${totalMin} MINUTES!`);
  console.log(`========================================================================\n`);
}

main().catch(e => console.error('Fatal Runner Error:', e));
