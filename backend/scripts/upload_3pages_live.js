const fs = require('fs');
const path = require('path');
const https = require('https');

const targetHost = 'politics.mathxmedia.tech';
const pdfPath = path.resolve(__dirname, '../../sample-data/DOC-3pages.pdf');

function request(urlPath, method = 'GET', bodyData = null, headers = {}) {
  return new Promise((resolve, reject) => {
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

async function upload3Pages() {
  console.log('========================================================================');
  console.log('   UPLOADING 3-PAGE BHEETA PDF TO LIVE SERVER & VERIFYING IMAGES');
  console.log('========================================================================\n');

  console.log('1. Logging in to Live VPS Server...');
  const loginRes = await request('/api/auth/login', 'POST', JSON.stringify({
    email: 'admin@example.com',
    password: 'AdminPass123'
  }), { 'Content-Type': 'application/json' });

  if (loginRes.status !== 200 || !loginRes.body?.token) {
    console.error('Login Failed:', loginRes);
    process.exit(1);
  }
  const token = loginRes.body.token;
  console.log('   ✅ Admin Login Successful!\n');

  console.log('2. Preparing multipart upload payload for DOC-3pages.pdf...');
  const fileBuffer = fs.readFileSync(pdfPath);
  const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
  const headerStr = '--' + boundary + '\r\n' +
    'Content-Disposition: form-data; name="file"; filename="DOC-3pages.pdf"\r\n' +
    'Content-Type: application/pdf\r\n\r\n';
  const footerStr = '\r\n--' + boundary + '--\r\n';
  
  const payload = Buffer.concat([
    Buffer.from(headerStr),
    fileBuffer,
    Buffer.from(footerStr)
  ]);

  console.log(`   Uploading ${(fileBuffer.length / (1024 * 1024)).toFixed(2)} MB to https://${targetHost}/api/import/members/pdf ...`);

  const uploadRes = await request('/api/import/members/pdf', 'POST', payload, {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'multipart/form-data; boundary=' + boundary,
    'Content-Length': payload.length
  });

  console.log('   Upload HTTP Status:', uploadRes.status);
  console.log('   Upload Response:', uploadRes.body || uploadRes.raw);

  const uploadId = uploadRes.body?.uploadId;
  if (uploadId) {
    console.log(`\n3. Polling import job status for uploadId: ${uploadId}...`);
    for (let attempt = 1; attempt <= 60; attempt++) {
      await new Promise(r => setTimeout(r, 3000));
      const statusRes = await request(`/api/import/status/${uploadId}`, 'GET', null, { 'Authorization': 'Bearer ' + token });
      const current = statusRes.body || {};
      console.log(`   [Attempt ${attempt}] Stage: ${current.stage || 'N/A'} | Status: ${current.status || 'processing'} | OCR Pages: ${current.ocrPagesProcessed || 0}/${current.ocrPagesTotal || 0} | Processed: ${current.processed || 0}/${current.total || 0}`);
      if (current.status === 'completed' || current.status === 'failed') {
        console.log(`\n   Import Job Finished with status: ${current.status}`);
        break;
      }
    }
  }

  console.log('\n4. Running Verification on Live Database Voter Images...\n');
  const verifyRes = await request('/api/members?rollType=all&sortBy=voterSerial&limit=1000', 'GET', null, { 'Authorization': 'Bearer ' + token });
  const members = Array.isArray(verifyRes.body) ? verifyRes.body : (verifyRes.body?.items || verifyRes.body?.members || []);
  
  let withPhoto = 0;
  let photo200Count = 0;

  for (const m of members) {
    const photoUrl = m.photo || (m.sourceDocument && m.sourceDocument.photo);
    if (photoUrl) {
      withPhoto++;
      // Test HTTP status of photo URL
      let testPath = photoUrl;
      if (photoUrl.startsWith('/')) testPath = photoUrl;
      const testRes = await request(testPath, 'GET', null, { 'Authorization': 'Bearer ' + token });
      const ok = testRes.status >= 200 && testRes.status < 400;
      if (ok) photo200Count++;
      console.log(`• Voter [${m.voterSerial}] ${m.name} (EPIC: ${m.voterId}) -> Photo: ${photoUrl} | HTTP Status: ${testRes.status} ${ok ? '✅ OK' : '❌ FAIL'}`);
    }
  }

  console.log('\n========================================================================');
  console.log('                    FINAL LIVE VERIFICATION REPORT                       ');
  console.log('========================================================================');
  console.log(` • Total Voters in Live DB: ${members.length}`);
  console.log(` • Voters with Photo URL: ${withPhoto} / ${members.length}`);
  console.log(` • Photo URLs Returning HTTP 200 OK: ${photo200Count} / ${withPhoto}`);
  console.log('========================================================================\n');
}

upload3Pages().catch(console.error);
