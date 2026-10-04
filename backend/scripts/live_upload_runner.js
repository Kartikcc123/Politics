const fs = require('fs');
const path = require('path');
const https = require('https');

const TARGET_HOST = 'politics.mathxmedia.tech';
const pdfPath = path.resolve(__dirname, '../../sample-data/DOC-3pages.pdf');

function request(urlPath, method = 'GET', data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: TARGET_HOST,
      path: urlPath,
      method,
      headers,
    }, res => {
      let buf = '';
      res.on('data', chunk => buf += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(buf) });
        } catch (_) {
          resolve({ status: res.statusCode, raw: buf });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function main() {
  console.log('====================================================');
  console.log('🚀 LIVE SERVER PDF UPLOAD & OCR VERIFICATION');
  console.log('Host: https://' + TARGET_HOST);
  console.log('====================================================');

  // 1. Log in
  console.log('1. Logging in as Admin...');
  const loginRes = await request('/api/auth/login', 'POST', JSON.stringify({
    email: 'admin@example.com',
    password: 'AdminPass123'
  }), { 'Content-Type': 'application/json' });

  const token = loginRes.body?.token;
  if (!token) {
    console.error('❌ Login failed:', loginRes.body || loginRes.raw);
    process.exit(1);
  }
  console.log('✅ Logged in successfully. Token acquired.');

  // 2. Prepare upload
  const stat = fs.statSync(pdfPath);
  const uploadId = 'live-test-' + Date.now();
  const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
  const fileBuffer = fs.readFileSync(pdfPath);

  const header = Buffer.from(
    '--' + boundary + '\r\n' +
    'Content-Disposition: form-data; name="file"; filename="DOC-3pages.pdf"\r\n' +
    'Content-Type: application/pdf\r\n\r\n'
  );
  const footer = Buffer.from('\r\n--' + boundary + '--\r\n');
  const multipartBody = Buffer.concat([header, fileBuffer, footer]);

  console.log(`\n2. Uploading DOC-3pages.pdf (${(stat.size / 1024).toFixed(2)} KB)...`);
  console.log(`   Upload ID: ${uploadId}`);

  const uploadRes = await request(
    `/api/import/members/pdf?asyncImport=true&uploadId=${uploadId}`,
    'POST',
    multipartBody,
    {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'multipart/form-data; boundary=' + boundary,
      'Content-Length': multipartBody.length,
    }
  );

  console.log('   Upload Status Code:', uploadRes.status);
  console.log('   Upload Response:', uploadRes.body || uploadRes.raw);

  if (uploadRes.status !== 200 && uploadRes.status !== 202) {
    console.error('❌ Upload failed.');
    process.exit(1);
  }

  // 3. Poll progress
  console.log('\n3. Tracking Live OCR Progress...');
  const startTime = Date.now();
  let completed = false;

  for (let i = 1; i <= 60; i++) {
    await new Promise(r => setTimeout(r, 3000));
    const st = await request(`/api/import/status/${uploadId}`, 'GET', null, {
      'Authorization': 'Bearer ' + token,
    });
    const d = st.body || {};
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);

    console.log(
      `   [${elapsed}s | Poll ${i}] Status: ${d.status || 'waiting'} | ` +
      `Stage: "${d.stage || ''}" | Pages: ${d.ocrPagesProcessed || 0}/${d.ocrPagesTotal || 0} | ` +
      `Cards: ${d.ocrCardsProcessed || 0}/${d.ocrCardsTotal || 0}`
    );

    if (d.status === 'completed') {
      completed = true;
      console.log('\n🎉 LIVE OCR IMPORT COMPLETED SUCCESSFULLY in ' + elapsed + 's!');
      if (d.result) {
        console.log('Result summary:', JSON.stringify(d.result, null, 2));
      }
      break;
    }
    if (d.status === 'failed') {
      console.error('\n❌ Import failed with stage:', d.stage);
      break;
    }
  }

  // 4. Fetch members from live database
  console.log('\n4. Fetching created voters from live database...');
  const membersRes = await request('/api/members?limit=35', 'GET', null, {
    'Authorization': 'Bearer ' + token,
  });
  const members = membersRes.body?.items || membersRes.body?.members || (Array.isArray(membersRes.body) ? membersRes.body : []);
  console.log(`✅ Total members retrieved: ${members.length}`);

  if (members.length > 0) {
    console.log('\nSample Voters from Live DB:');
    members.slice(0, 10).forEach((m, idx) => {
      console.log(` ${idx + 1}. S.No: ${m.voterSerial || '-'} | EPIC: ${m.voterId || '-'} | Name: ${m.name} | Guardian: ${m.guardianName} | House: ${m.houseNumber} | Photo: ${m.photo ? 'YES' : 'NO'}`);
    });
  }

  console.log('\n====================================================');
  console.log('TEST COMPLETE');
  console.log('====================================================');
}

main().catch(console.error);
