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

async function upload3PagesChunked() {
  console.log('========================================================================');
  console.log('   UPLOADING 3-PAGE BHEETA PDF TO LIVE SERVER (CHUNKED MODE)');
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

  const fileBuffer = fs.readFileSync(pdfPath);
  const uploadId = 'live-test-' + Date.now();
  const chunkSize = 1 * 1024 * 1024; // 1MB chunks
  const totalChunks = Math.ceil(fileBuffer.length / chunkSize);
  const totalBytes = fileBuffer.length;

  console.log(`2. Uploading ${totalChunks} chunk(s) (${(totalBytes / 1024 / 1024).toFixed(2)} MB) for uploadId: ${uploadId}...`);

  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, totalBytes);
    const chunk = fileBuffer.slice(start, end);

    const chunkRes = await request(`/api/import/members/pdf/chunks/${uploadId}/${i}`, 'PUT', chunk, {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/octet-stream',
      'Content-Length': chunk.length,
      'X-Total-Chunks': String(totalChunks),
      'X-Total-Bytes': String(totalBytes)
    });
    console.log(`   Chunk ${i + 1}/${totalChunks} -> HTTP ${chunkRes.status}`);
  }

  console.log('\n3. Completing chunked upload (Triggers Background OCR)...');
  const completeRes = await request(`/api/import/members/pdf/chunks/${uploadId}/complete`, 'POST', JSON.stringify({ filename: 'DOC-3pages.pdf' }), {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  });

  console.log('   Complete HTTP Status:', completeRes.status);
  console.log('   Complete Response:', completeRes.body || completeRes.raw);

  console.log(`\n4. Polling background OCR import progress for uploadId: ${uploadId}...`);
  let isDone = false;
  for (let attempt = 1; attempt <= 90; attempt++) {
    await new Promise(r => setTimeout(r, 3000));
    const statusRes = await request(`/api/import/status/${uploadId}`, 'GET', null, { 'Authorization': 'Bearer ' + token });
    const current = statusRes.body || {};
    console.log(`   [Poll ${attempt}] Stage: "${current.stage || 'N/A'}" | Status: ${current.status || 'processing'} | OCR Pages: ${current.ocrPagesProcessed || 0}/${current.ocrPagesTotal || 0} | Processed: ${current.processed || 0}/${current.total || 0}`);
    
    if (current.status === 'completed' || current.status === 'failed') {
      isDone = true;
      console.log(`\n   Import Job Finished with status: ${current.status}`);
      break;
    }
  }

  console.log('\n5. Running Final Verification on Live Database Voter Images...\n');
  const verifyRes = await request('/api/members?rollType=all&sortBy=voterSerial&limit=1000', 'GET', null, { 'Authorization': 'Bearer ' + token });
  const members = Array.isArray(verifyRes.body) ? verifyRes.body : (verifyRes.body?.items || verifyRes.body?.members || []);
  
  let withPhoto = 0;
  let photo200Count = 0;

  for (const m of members) {
    const photoUrl = m.photo || (m.sourceDocument && m.sourceDocument.photo);
    if (photoUrl) {
      withPhoto++;
      const testRes = await request(photoUrl, 'GET', null, { 'Authorization': 'Bearer ' + token });
      const ok = testRes.status >= 200 && testRes.status < 400;
      if (ok) photo200Count++;
      console.log(`• Voter [${m.voterSerial}] ${m.name} (EPIC: ${m.voterId}) -> Photo: ${photoUrl} | Status: ${testRes.status} ${ok ? '✅ OK' : '❌ FAIL'}`);
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

upload3PagesChunked().catch(console.error);
