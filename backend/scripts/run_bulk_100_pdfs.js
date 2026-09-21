const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { ocrPdf } = require('../src/utils/pdfOcr');
const { safeSectionMap } = require('../src/controllers/importController');

// Configuration
const DEFAULT_FOLDER = path.resolve(__dirname, '../uploads/bulk_pdfs');
const TARGET_HOST = process.env.TARGET_HOST || 'politics.mathxmedia.tech';
const CONCURRENCY = parseInt(process.env.BULK_CONCURRENCY || '2', 10);

function apiRequest(urlPath, method = 'GET', bodyData = null, token = '') {
  return new Promise((resolve, reject) => {
    const isHttps = TARGET_HOST !== 'localhost' && !TARGET_HOST.startsWith('127.0.0.1');
    const client = isHttps ? https : http;
    const headers = {};
    if (token) headers['Authorization'] = 'Bearer ' + token;
    if (bodyData) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(bodyData);
    }

    const req = client.request({
      hostname: TARGET_HOST,
      port: isHttps ? 443 : 5000,
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

async function processSinglePdf(pdfPath, token, index, total, progressTracker) {
  const fileName = path.basename(pdfPath);
  console.log(`\n========================================================================`);
  console.log(`🚀 [${index + 1}/${total}] STARTING PDF: ${fileName}`);
  console.log(`========================================================================`);

  const startTime = Date.now();
  let lastLoggedPage = -1;

  try {
    const result = await ocrPdf(pdfPath, fileName, {
      onProgress: (progress) => {
        if (progress.phase === 'ocr' && progress.processedPages !== lastLoggedPage) {
          lastLoggedPage = progress.processedPages;
          const pct = Math.round((progress.processedPages / progress.totalPages) * 100) || 0;
          process.stdout.write(`\r   [${fileName}] Page ${progress.processedPages}/${progress.totalPages} (${pct}%) | ${progress.processedCards || 0} cards`);
        }
      }
    });

    console.log('\n');
    const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
    const records = result.records || result.voterRecords || [];
    const header = result.header || {};
    const docSectionMap = safeSectionMap(header.sectionMap || {});

    console.log(`   ✅ OCR Done in ${durationSec}s. Found ${records.length} voters (Assembly: ${header.assemblyName || '-'}, Part: ${header.partNumber || '-'})`);

    if (records.length === 0) {
      console.log(`   ⚠️ No voter records found in ${fileName}. Marking done.`);
      progressTracker.recordCompleted(fileName, 0, durationSec);
      return;
    }

    // Fallback extraction from filename if OCR header missed them
    const fnAsmMatch = fileName.match(/S\d+-(\d+)/i);
    const fnPartMatch = fileName.match(/-(\d+)\.pdf$/i);
    const effAsmNum = header.assemblyNumber || (fnAsmMatch ? fnAsmMatch[1] : '179');
    const effPartNum = header.partNumber || (fnPartMatch ? fnPartMatch[1] : '');

    // Upload to Server
    console.log(`   📤 Uploading ${records.length} voters to database...`);
    const importPayload = {
      header: {
        assemblyNumber: effAsmNum,
        assemblyName: header.assemblyName || 'सहाड़ा',
        partNumber: effPartNum,
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
        assemblyNumber: effAsmNum,
        partNumber: effPartNum,
        village: header.village || ''
      }))
    };

    const uploadRes = await apiRequest('/api/import/members/json', 'POST', JSON.stringify(importPayload), token);
    if (uploadRes.status === 200 || uploadRes.status === 201) {
      console.log(`   🎉 Database Import Complete for ${fileName}! (Saved ${importPayload.members.length} voters in DB)`);
      progressTracker.recordCompleted(fileName, records.length, durationSec);
    } else {
      console.log(`   ⚠️ JSON batch status ${uploadRes.status} (${uploadRes.body?.message || uploadRes.body?.error || 'error'}). Syncing individually...`);
      let synced = 0;
      for (const m of importPayload.members) {
        if (!m.voterId) continue;
        const res = await apiRequest('/api/members', 'POST', JSON.stringify(m), token);
        if (res.status === 200 || res.status === 201) synced++;
      }
      if (synced > 0) {
        console.log(`   ✅ Synced ${synced}/${importPayload.members.length} members directly.`);
        progressTracker.recordCompleted(fileName, synced, durationSec);
      } else {
        throw new Error(`Upload to database failed (Server returned ${uploadRes.status}: ${uploadRes.body?.message || uploadRes.body?.error || 'Internal Error'}). Ensure VPS backend is updated!`);
      }
    }
  } catch (err) {
    console.error(`\n   ❌ ERROR processing ${fileName}:`, err.message);
    progressTracker.recordFailed(fileName, err.message);
  }
}

class ProgressTracker {
  constructor(folderPath) {
    this.progressFilePath = path.join(folderPath, 'bulk_import_progress.json');
    this.state = {
      completed: {}, // filename -> { count, timeSec, timestamp }
      failed: {},    // filename -> { error, timestamp }
      totalImportedVoters: 0
    };
    this.load();
  }

  load() {
    if (fs.existsSync(this.progressFilePath)) {
      try {
        const raw = fs.readFileSync(this.progressFilePath, 'utf8');
        this.state = JSON.parse(raw);
      } catch (_) {}
    }
  }

  save() {
    try {
      fs.writeFileSync(this.progressFilePath, JSON.stringify(this.state, null, 2), 'utf8');
    } catch (_) {}
  }

  isCompleted(fileName) {
    return Boolean(this.state.completed[fileName]);
  }

  recordCompleted(fileName, count, durationSec) {
    this.state.completed[fileName] = {
      count,
      durationSec,
      timestamp: new Date().toISOString()
    };
    delete this.state.failed[fileName];
    this.state.totalImportedVoters = Object.values(this.state.completed).reduce((acc, c) => acc + (c.count || 0), 0);
    this.save();
  }

  recordFailed(fileName, errorMessage) {
    this.state.failed[fileName] = {
      error: errorMessage,
      timestamp: new Date().toISOString()
    };
    this.save();
  }
}

async function main() {
  const targetPath = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_FOLDER;

  console.log('========================================================================');
  console.log('⚡ HIGH-SPEED BULK VOTER PDF RUNNER (100+ PDFs BATCH ENGINE)');
  console.log('Target Path  :', targetPath);
  console.log('Target Server:', `https://${TARGET_HOST}`);
  console.log('Concurrency  :', `${CONCURRENCY} PDFs in Parallel`);
  console.log('========================================================================\n');

  if (!fs.existsSync(targetPath)) {
    console.log(`Path does not exist: ${targetPath}`);
    process.exit(1);
  }

  const stat = fs.statSync(targetPath);
  let pdfFiles = [];
  let trackingFolder = targetPath;

  if (stat.isFile()) {
    if (!targetPath.toLowerCase().endsWith('.pdf')) {
      console.log(`❌ Selected file is not a PDF: ${targetPath}`);
      process.exit(1);
    }
    pdfFiles = [targetPath];
    trackingFolder = path.dirname(targetPath);
  } else {
    // Directory: Find all PDFs
    const allFiles = fs.readdirSync(targetPath);
    pdfFiles = allFiles
      .filter(f => f.toLowerCase().endsWith('.pdf'))
      .map(f => path.join(targetPath, f));
  }

  if (pdfFiles.length === 0) {
    console.log(`❌ No PDF files found in folder: ${targetPath}`);
    console.log(`Please copy your voter list PDFs into this folder and run again.`);
    process.exit(0);
  }

  console.log(`Found ${pdfFiles.length} PDF file(s) to process.`);

  // Progress tracker
  const isForce = process.argv.includes('--force') || process.argv.includes('-f');
  const tracker = new ProgressTracker(trackingFolder);
  const pendingPdfs = isForce ? pdfFiles : pdfFiles.filter(p => !tracker.isCompleted(path.basename(p)));
  const alreadyDone = isForce ? 0 : (pdfFiles.length - pendingPdfs.length);

  console.log(`Status: ${alreadyDone} already completed | ${pendingPdfs.length} remaining to process.${isForce ? ' (FORCE MODE)' : ''}`);
  console.log(`Total Voters in Tracker: ${tracker.state.totalImportedVoters}`);

  if (pendingPdfs.length === 0) {
    console.log(`\n🎉 All ${pdfFiles.length} PDFs have already been successfully processed and imported!`);
    process.exit(0);
  }

  // 1. Admin Login
  console.log(`\nLogging in as Admin to https://${TARGET_HOST}...`);
  const loginRes = await apiRequest('/api/auth/login', 'POST', JSON.stringify({
    email: process.env.ADMIN_EMAIL || 'admin@example.com',
    password: process.env.ADMIN_PASSWORD || 'AdminPass123'
  }));

  if (loginRes.status !== 200 || !loginRes.body?.token) {
    console.error('❌ Login failed:', loginRes);
    process.exit(1);
  }
  const token = loginRes.body.token;
  console.log('✅ Admin Login Successful. Token acquired.\n');

  // Process files with worker queue
  let cursor = 0;
  const batchStart = Date.now();

  const worker = async () => {
    while (cursor < pendingPdfs.length) {
      const idx = cursor;
      cursor += 1;
      const pdfPath = pendingPdfs[idx];
      await processSinglePdf(pdfPath, token, alreadyDone + idx, pdfFiles.length, tracker);
    }
  };

  const pool = Array.from({ length: Math.min(CONCURRENCY, pendingPdfs.length) }, () => worker());
  await Promise.all(pool);

  const totalTimeMinutes = ((Date.now() - batchStart) / 1000 / 60).toFixed(1);
  console.log(`\n========================================================================`);
  console.log(`🏁 BULK IMPORT COMPLETED!`);
  console.log(`   Processed: ${pendingPdfs.length} PDFs in ${totalTimeMinutes} minutes.`);
  console.log(`   Total Voters in Database: ${tracker.state.totalImportedVoters}`);
  console.log(`   Status Saved to: ${tracker.progressFilePath}`);
  console.log(`========================================================================\n`);
}

main().catch(err => {
  console.error('Fatal bulk error:', err);
  process.exit(1);
});
