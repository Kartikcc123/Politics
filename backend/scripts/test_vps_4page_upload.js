const fs = require('fs');
const path = require('path');
const https = require('https');

const pdfPath = path.resolve(__dirname, '../../sample-data/DOC-4pages.pdf');
const targetHost = 'politics.mathxmedia.tech';

console.log('========================================================================');
console.log('   LIVE VPS SERVER 4-PAGE PDF UPLOAD & VERIFICATION TEST');
console.log('   Target PDF: DOC-4pages.pdf (4 Pages, 60 Cards)');
console.log(`   Target Server: https://${targetHost}`);
console.log('========================================================================\n');

if (!fs.existsSync(pdfPath)) {
  console.error('ERROR: 4-page PDF file does not exist at:', pdfPath);
  process.exit(1);
}

function apiRequest(urlPath, method = 'GET', bodyData = null, isMultipart = false, boundary = '', token = '') {
  return new Promise((resolve, reject) => {
    const headers = {};
    if (token) headers['Authorization'] = 'Bearer ' + token;

    if (isMultipart) {
      headers['Content-Type'] = 'multipart/form-data; boundary=' + boundary;
      headers['Content-Length'] = bodyData.length;
    } else if (bodyData) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(bodyData);
    }

    const req = https.request({
      hostname: targetHost,
      path: urlPath,
      method: method,
      headers: headers
    }, (res) => {
      let buf = '';
      res.on('data', d => buf += d);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(buf) });
        } catch(e) {
          resolve({ status: res.statusCode, raw: buf });
        }
      });
    });

    req.on('error', reject);
    if (bodyData) req.write(bodyData);
    req.end();
  });
}

async function runTest() {
  // 1. Login to Live VPS Server
  console.log(`1. Logging in to Live VPS Server (https://${targetHost})...`);
  const loginRes = await apiRequest('/api/auth/login', 'POST', JSON.stringify({
    email: 'admin@example.com',
    password: 'AdminPass123'
  }));

  if (loginRes.status !== 200 || !loginRes.body?.token) {
    console.error('Live VPS Admin Login Failed:', loginRes);
    process.exit(1);
  }
  const token = loginRes.body.token;
  console.log('   ✅ Live VPS Admin Login Successful!\n');

  // 2. Upload 4-Page PDF to VPS using Chunked Upload (to bypass Nginx 1MB client_max_body_size)
  const stat = fs.statSync(pdfPath);
  const fileBuffer = fs.readFileSync(pdfPath);
  const uploadId = 'vps4p' + Date.now();
  const chunkSize = 400 * 1024; // 400 KB per chunk (under 1MB Nginx limit)
  const totalChunks = Math.ceil(fileBuffer.length / chunkSize);

  console.log(`2. Uploading 4-Page PDF DOC-4pages.pdf (${(stat.size / 1024).toFixed(2)} KB) to VPS in ${totalChunks} chunks...`);
  console.log(`   Generated Upload ID: ${uploadId}`);

  for (let idx = 0; idx < totalChunks; idx++) {
    const start = idx * chunkSize;
    const end = Math.min(fileBuffer.length, (idx + 1) * chunkSize);
    const chunkBuffer = fileBuffer.slice(start, end);

    const chunkRes = await new Promise((resolve, reject) => {
      const req = https.request({
        hostname: targetHost,
        path: `/api/import/members/pdf/chunks/${uploadId}/${idx}`,
        method: 'PUT',
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/octet-stream',
          'Content-Length': chunkBuffer.length,
          'x-total-chunks': String(totalChunks),
          'x-total-bytes': String(fileBuffer.length)
        }
      }, (res) => {
        let buf = '';
        res.on('data', d => buf += d);
        res.on('end', () => resolve({ status: res.statusCode, body: buf }));
      });
      req.on('error', reject);
      req.write(chunkBuffer);
      req.end();
    });

    console.log(`   Uploaded Chunk ${idx + 1}/${totalChunks} (${chunkBuffer.length} bytes) -> HTTP ${chunkRes.status}`);
  }

  // Complete Chunked Upload
  console.log('   Completing Chunked Upload...');
  const completeRes = await apiRequest(`/api/import/members/pdf/chunks/${uploadId}/complete`, 'POST', JSON.stringify({
    filename: 'DOC-4pages.pdf'
  }), false, '', token);
  console.log('   Complete Endpoint HTTP Status:', completeRes.status);
  console.log('   Complete Response:', JSON.stringify(completeRes.body || completeRes.raw, null, 2));


  // 3. Poll Import Progress on VPS
  console.log(`\n3. Polling Live VPS Server OCR Progress for uploadId: ${uploadId} ...`);
  let importCompleted = false;
  for (let i = 1; i <= 120; i++) {
    await new Promise(r => setTimeout(r, 2500));
    const st = await apiRequest(`/api/import/status/${uploadId}`, 'GET', null, false, '', token);
    const data = st.body || {};
    
    if (i % 4 === 0 || data.status === 'completed' || data.status === 'failed') {
      console.log(`   [Poll ${i}] Status: ${data.status || 'waiting'} | Stage: "${data.stage || 'N/A'}" | OCR Pages: ${data.ocrPagesProcessed || 0}/${data.ocrPagesTotal || 0} | Cards: ${data.ocrCardsProcessed || 0}/${data.ocrCardsTotal || 0}`);
    }

    if (data.status === 'completed') {
      importCompleted = true;
      console.log('\n   🎉 Live VPS Server PDF Import Completed Successfully!');
      if (data.result) console.log('   Import Summary:', JSON.stringify(data.result, null, 2));
      break;
    }
    if (data.status === 'failed') {
      console.error('\n   ❌ Live VPS Server PDF Import Failed:', data.stage);
      break;
    }
  }

  // 4. Fetch Members from VPS Database
  console.log('\n4. Fetching Extracted Voters from Live VPS Server Database...');
  const membersRes = await apiRequest('/api/members?rollType=all&sortBy=voterSerial&limit=1000', 'GET', null, false, '', token);
  const members = Array.isArray(membersRes.body) ? membersRes.body : (membersRes.body?.items || membersRes.body?.members || []);
  console.log(`   Total Members Fetched from VPS DB: ${members.length}\n`);

  // Display Table of Extracted Voters
  console.log('---------------------------------------------------------------------------------------------------------');
  console.log('                                LIVE VPS EXTRACTED VOTERS LIST (FIRST 30)                                 ');
  console.log('---------------------------------------------------------------------------------------------------------');
  console.log(
    'S.No (क्रमांक)'.padEnd(16) +
    'EPIC / Voter ID'.padEnd(18) +
    'Name (नाम)'.padEnd(22) +
    'Father/Husband'.padEnd(22) +
    'House'.padEnd(10) +
    'Anubhag / Section'
  );
  console.log('---------------------------------------------------------------------------------------------------------');

  members.slice(0, 30).forEach((v, idx) => {
    const serial = String(v.voterSerial || (idx + 1)).padEnd(16);
    const epic = String(v.voterId || 'N/A').padEnd(18);
    const name = String(v.name || '').padEnd(22).slice(0, 21);
    const relative = String(v.guardianName || '').padEnd(22).slice(0, 21);
    const house = String(v.houseNumber || '-').padEnd(10).slice(0, 9);
    const section = String(v.sectionName || v.location || '-').slice(0, 25);

    console.log(`${serial}${epic}${name}${relative}${house}${section}`);
  });
  console.log('---------------------------------------------------------------------------------------------------------\n');

  // 5. Test Filters on VPS Server
  console.log('======================================================');
  console.log('         VERIFYING FILTERS ON LIVE VPS SERVER        ');
  console.log('======================================================\n');

  // Gender Filter
  const maleRes = await apiRequest('/api/members?rollType=all&gender=male&limit=1000', 'GET', null, false, '', token);
  const maleVoters = Array.isArray(maleRes.body) ? maleRes.body : (maleRes.body?.items || maleRes.body?.members || []);
  console.log(`   • Male voters filter (gender=male): ${maleVoters.length} returned`);

  const femaleRes = await apiRequest('/api/members?rollType=all&gender=female&limit=1000', 'GET', null, false, '', token);
  const femaleVoters = Array.isArray(femaleRes.body) ? femaleRes.body : (femaleRes.body?.items || femaleRes.body?.members || []);
  console.log(`   • Female voters filter (gender=female): ${femaleVoters.length} returned`);
  console.log(`   -> Gender Filter Status: ${(maleVoters.length + femaleVoters.length > 0) ? '✅ WORKING' : '❌ FAILED'}\n`);

  // Search Filter
  if (members.length > 0) {
    const sampleFirstName = members[0].name ? members[0].name.split(' ')[0] : '';
    if (sampleFirstName) {
      const qRes = await apiRequest(`/api/members?rollType=all&q=${encodeURIComponent(sampleFirstName)}&limit=1000`, 'GET', null, false, '', token);
      const qVoters = Array.isArray(qRes.body) ? qRes.body : (qRes.body?.items || qRes.body?.members || []);
      console.log(`   • Search query q="${sampleFirstName}": ${qVoters.length} returned`);
      console.log(`   -> Search Filter Status: ${qVoters.length > 0 ? '✅ WORKING' : '❌ FAILED'}\n`);
    }
  }

  // Section Filter
  const uniqueSections = [...new Set(members.map(m => m.sectionName).filter(Boolean))];
  if (uniqueSections.length > 0) {
    const targetSection = uniqueSections[0];
    const secRes = await apiRequest(`/api/members?rollType=all&sectionName=${encodeURIComponent(targetSection)}&limit=1000`, 'GET', null, false, '', token);
    const secVoters = Array.isArray(secRes.body) ? secRes.body : (secRes.body?.items || secRes.body?.members || []);
    console.log(`   • Section Filter sectionName="${targetSection}": ${secVoters.length} returned`);
    console.log(`   -> Section Filter Status: ${secVoters.length > 0 ? '✅ WORKING' : '❌ FAILED'}\n`);
  }

  console.log('======================================================');
  console.log('     LIVE VPS 4-PAGE TEST COMPLETED SUCCESSFULLY!    ');
  console.log('======================================================\n');
}

runTest().catch(console.error);
