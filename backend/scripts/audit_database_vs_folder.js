const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const TARGET_HOST = process.env.TARGET_HOST || '187.127.173.42';
const TARGET_PORT = process.env.TARGET_PORT ? parseInt(process.env.TARGET_PORT, 10) : 5003;
const IS_HTTPS = TARGET_PORT === 443;
const FOLDER_PATH = process.argv[2] || 'D:\\Randeep Trivedi Voter list\\Final Publication 21.02.2026';

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
      timeout: 30000
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); } catch(e) { resolve({ status: res.statusCode, raw: d }); }
      });
    });
    req.on('error', reject);
    if (bodyData) req.write(bodyData);
    req.end();
  });
}

async function runAudit() {
  console.log('========================================================================');
  console.log('🔍 CONSTITUENCY VOTER DATABASE AUDIT & MISSING DATA DETECTOR');
  console.log('========================================================================\n');
  console.log(`📁 PDF Folder   : ${FOLDER_PATH}`);
  console.log(`🌐 Live Server  : ${IS_HTTPS ? 'https://' : 'http://'}${TARGET_HOST}:${TARGET_PORT}\n`);

  // 1. Admin Login
  console.log('1️⃣ Logging in to server...');
  const loginRes = await apiRequest('/api/auth/login', 'POST', JSON.stringify({
    email: process.env.ADMIN_EMAIL || 'admin@example.com',
    password: process.env.ADMIN_PASSWORD || 'AdminPass123'
  }));

  if (loginRes.status !== 200 || !loginRes.body?.token) {
    console.error('❌ Login failed:', loginRes);
    process.exit(1);
  }
  const token = loginRes.body.token;
  console.log('✅ Server Authenticated!\n');

  // 2. Scan Local PDF files
  if (!fs.existsSync(FOLDER_PATH)) {
    console.error(`❌ Folder not found: ${FOLDER_PATH}`);
    process.exit(1);
  }

  const allFiles = fs.readdirSync(FOLDER_PATH).filter(f => f.toLowerCase().endsWith('.pdf'));
  console.log(`2️⃣ Found ${allFiles.length} PDF file(s) on your computer.\n`);

  // 3. Fetch Part breakdown from Database
  console.log('3️⃣ Inspecting live database for all parts...');
  const locGroups = await apiRequest('/api/members/location-groups?limit=500', 'GET', null, token);
  const dbItems = locGroups.body?.items || [];

  // Group DB counts by partNumber
  const dbPartCounts = new Map();
  for (const item of dbItems) {
    const pNum = String(item.key?.partNumber || '').trim();
    if (pNum) {
      dbPartCounts.set(pNum, (dbPartCounts.get(pNum) || 0) + (item.count || 0));
    }
  }

  // Also query dashboard summary
  const summary = await apiRequest('/api/reports/dashboard', 'GET', null, token);
  const totalDbVoters = summary.body?.members || 0;

  // 4. Compare each PDF
  const completedParts = [];
  const missingPdfs = [];
  const lowCountParts = [];

  for (const file of allFiles) {
    const fnPartMatch = file.match(/-(?:HIN|ENG|RAJ|MAR|GUJ)-(\d{1,4})(?:\.pdf|_|$)/i) || 
                         file.match(/[-_](\d{1,4})\.pdf$/i) || 
                         file.match(/^(\d{1,4})\.pdf$/i);
    const partNum = fnPartMatch ? String(parseInt(fnPartMatch[1], 10)) : null;

    if (!partNum) {
      missingPdfs.push({ file, part: 'Unknown', count: 0, reason: 'Could not extract part number from filename' });
      continue;
    }

    const countInDb = dbPartCounts.get(partNum) || 0;

    if (countInDb >= 100) {
      completedParts.push({ file, part: partNum, count: countInDb });
    } else if (countInDb > 0) {
      lowCountParts.push({ file, part: partNum, count: countInDb });
    } else {
      missingPdfs.push({ file, part: partNum, count: 0 });
    }
  }

  // 5. Print Detailed Report
  console.log('\n========================================================================');
  console.log('📊 AUDIT SUMMARY REPORT');
  console.log('========================================================================');
  console.log(`🎯 Total Voters in Database  : ${totalDbVoters.toLocaleString()}`);
  console.log(`📁 Total PDFs in Folder      : ${allFiles.length}`);
  console.log(`✅ Fully Uploaded Parts (OK) : ${completedParts.length} PDFs`);
  console.log(`⚠️ Partial Parts (Low Count) : ${lowCountParts.length} PDFs`);
  console.log(`❌ Missing / Pending Upload  : ${missingPdfs.length} PDFs`);
  console.log('========================================================================\n');

  if (missingPdfs.length > 0) {
    console.log('❌ MISSING PARTS LIST (Need to be Uploaded):');
    const missingPartNums = missingPdfs.map(m => m.part).filter(p => p !== 'Unknown').sort((a,b) => Number(a)-Number(b));
    console.log(`   Part Numbers: ${missingPartNums.join(', ')}\n`);

    console.log('   First 10 Missing PDF Files:');
    missingPdfs.slice(0, 10).forEach((m, i) => {
      console.log(`   ${i + 1}. [भाग ${m.part}] -> ${m.file}`);
    });
    if (missingPdfs.length > 10) {
      console.log(`   ... and ${missingPdfs.length - 10} more PDFs.`);
    }
  }

  if (lowCountParts.length > 0) {
    console.log('\n⚠️ PARTIAL PARTS (Re-upload recommended):');
    lowCountParts.forEach(p => {
      console.log(`   - [भाग ${p.part}] -> Only ${p.count} voters in DB (${p.file})`);
    });
  }

  console.log('\n========================================================================');
  console.log('🚀 TO UPLOAD ONLY THE MISSING PARTS AUTOMATICALLY:');
  console.log(`   Run: node scripts/run_bulk_100_pdfs.js "${FOLDER_PATH}"`);
  console.log('   (The runner will auto-skip completed ones and only process missing parts!)');
  console.log('========================================================================\n');
}

runAudit().catch(e => {
  console.error('Audit error:', e.message);
});
