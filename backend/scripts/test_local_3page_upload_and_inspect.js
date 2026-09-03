const fs = require('fs');
const path = require('path');
const http = require('http');

const pdfPath = path.resolve(__dirname, '../../sample-data/DOC-3pages.pdf');

console.log('========================================================================');
console.log('   LOCAL BACKEND SERVER 3-PAGE PDF UPLOAD & INSPECTION TEST');
console.log('   Target URL: http://127.0.0.1:5000');
console.log('========================================================================\n');

if (!fs.existsSync(pdfPath)) {
  console.error('ERROR: 3-page PDF file does not exist at:', pdfPath);
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

    const req = http.request({
      hostname: '127.0.0.1',
      port: 5000,
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
  // 1. Login to Local Server
  console.log('1. Logging in to Local Backend Server (http://127.0.0.1:5000)...');
  const loginRes = await apiRequest('/api/auth/login', 'POST', JSON.stringify({
    email: 'admin@example.com',
    password: 'AdminPass123'
  }));

  if (loginRes.status !== 200 || !loginRes.body?.token) {
    console.error('Local Login Failed:', loginRes);
    process.exit(1);
  }
  const token = loginRes.body.token;
  console.log('   ✅ Local Admin Login Successful!');

  // 2. Upload 3-Page PDF
  const stat = fs.statSync(pdfPath);
  const uploadId = 'local3page' + Date.now();
  const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
  const fileBuffer = fs.readFileSync(pdfPath);

  const header = Buffer.from('--' + boundary + '\r\n' +
    'Content-Disposition: form-data; name="file"; filename="DOC-3pages.pdf"\r\n' +
    'Content-Type: application/pdf\r\n\r\n');
  const footer = Buffer.from('\r\n--' + boundary + '--\r\n');
  const multipartBody = Buffer.concat([header, fileBuffer, footer]);

  console.log(`\n2. Uploading 3-Page PDF (${(stat.size / 1024).toFixed(2)} KB) to Local Server...`);
  console.log(`   Generated Upload ID: ${uploadId}`);

  const uploadRes = await apiRequest(`/api/import/members/pdf?asyncImport=true&uploadId=${uploadId}`, 'POST', multipartBody, true, boundary, token);
  console.log('   HTTP Status:', uploadRes.status);
  console.log('   Upload Response:', JSON.stringify(uploadRes.body || uploadRes.raw, null, 2));

  // 3. Polling Local OCR Import Progress
  console.log(`\n3. Polling Local Server OCR Import Progress for uploadId: ${uploadId} ...`);
  for (let i = 1; i <= 120; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const st = await apiRequest(`/api/import/status/${uploadId}`, 'GET', null, false, '', token);
    const data = st.body || {};
    if (i % 5 === 0 || data.status === 'completed' || data.status === 'failed') {
      console.log(`   [Poll ${i}] Status: ${data.status || 'waiting'} | Stage: "${data.stage || 'N/A'}" | OCR Pages: ${data.ocrPagesProcessed || 0}/${data.ocrPagesTotal || 0} | Processed Cards: ${data.ocrCardsProcessed || 0}/${data.ocrCardsTotal || 0}`);
    }

    if (data.status === 'completed') {
      console.log('\n   🎉 Local Server PDF Import Completed Successfully!');
      if (data.result) console.log('   Import Result Summary:', JSON.stringify(data.result, null, 2));
      break;
    }
    if (data.status === 'failed') {
      console.error('\n   ❌ Local Server PDF Import Failed:', data.stage);
      break;
    }
  }

  // 4. Fetch Members from Local Database
  console.log('\n4. Fetching Voters / Members from Local Server Database...');
  const membersRes = await apiRequest('/api/members?rollType=all&sortBy=voterSerial&limit=500', 'GET', null, false, '', token);
  const members = Array.isArray(membersRes.body) ? membersRes.body : (membersRes.body?.items || membersRes.body?.members || []);

  console.log(`   Total Members Fetched from Local Database: ${members.length}`);

  // Display Table of Extracted Voters
  console.log('\n---------------------------------------------------------------------------------------------------------');
  console.log('                            LOCAL BACKEND EXTRACTED VOTERS LIST                                           ');
  console.log('---------------------------------------------------------------------------------------------------------');
  console.log(
    'S.No (क्रमांक)'.padEnd(16) +
    'EPIC / Voter ID'.padEnd(18) +
    'Name (नाम)'.padEnd(22) +
    'Father/Husband'.padEnd(22) +
    'House'.padEnd(8) +
    'Anubhag / Section'
  );
  console.log('---------------------------------------------------------------------------------------------------------');

  members.forEach((v, idx) => {
    const serial = String(v.voterSerial || (idx + 1)).padEnd(16);
    const epic = String(v.voterId || 'N/A').padEnd(18);
    const name = String(v.name || '').padEnd(22).slice(0, 21);
    const relative = String(v.guardianName || '').padEnd(22).slice(0, 21);
    const house = String(v.houseNumber || '-').padEnd(8).slice(0, 7);
    const section = String(v.sectionName || v.location || '-').slice(0, 25);

    console.log(`${serial}${epic}${name}${relative}${house}${section}`);
  });

  console.log('---------------------------------------------------------------------------------------------------------\n');
}

runTest().catch(console.error);
