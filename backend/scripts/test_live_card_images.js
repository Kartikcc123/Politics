const https = require('https');

const targetHost = 'politics.mathxmedia.tech';

function apiRequest(urlPath, token = '') {
  return new Promise((resolve, reject) => {
    const headers = {};
    if (token) headers['Authorization'] = 'Bearer ' + token;

    const req = https.request({
      hostname: targetHost,
      path: urlPath,
      method: 'GET',
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
    req.end();
  });
}

function checkUrl(url, token = '') {
  return new Promise((resolve) => {
    let hostname = targetHost;
    let path = url;

    if (url.includes('amazonaws.com/')) {
      const key = url.split('amazonaws.com/')[1];
      path = `/media/s3/${key}`;
    }

    const headers = {};
    if (token) headers['Authorization'] = 'Bearer ' + token;

    const req = https.request({
      hostname: hostname,
      path: path,
      method: 'GET',
      headers: headers
    }, (res) => {
      let size = 0;
      res.on('data', chunk => size += chunk.length);
      res.on('end', () => resolve({ status: res.statusCode, size, path }));
    });

    req.on('error', (err) => resolve({ status: 0, error: err.message, path }));
    req.end();
  });
}

async function runTest() {
  console.log('1. Logging in to Live VPS Server...');
  const loginRes = await new Promise((resolve, reject) => {
    const data = JSON.stringify({ email: 'admin@example.com', password: 'AdminPass123' });
    const req = https.request({
      hostname: targetHost,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': data.length }
    }, (res) => {
      let buf = '';
      res.on('data', d => buf += d);
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(buf) }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });

  const token = loginRes.body.token;

  console.log('2. Fetching voter records from Live Server DB...');
  const res = await apiRequest('/api/members?rollType=all&limit=1000', token);
  const members = Array.isArray(res.body) ? res.body : (res.body?.items || res.body?.members || []);

  const votersWithCards = members.filter(m => (m.sourceDocument && m.sourceDocument.ocrCardImage) || m.ocrCardImage || m.cardImage);

  console.log(`Found ${votersWithCards.length} voters with Voter Card Images on Live Server!\n`);

  console.log('---------------------------------------------------------------------------------------------------------');
  console.log('                             LIVE SERVER VOTER CARD IMAGE VERIFICATION                                   ');
  console.log('---------------------------------------------------------------------------------------------------------');

  for (let i = 0; i < Math.min(votersWithCards.length, 10); i++) {
    const v = votersWithCards[i];
    const cardUrl = (v.sourceDocument && v.sourceDocument.ocrCardImage) || v.ocrCardImage || v.cardImage;
    const check = await checkUrl(cardUrl, token);

    console.log(`• Voter #${i+1}: [${v.voterSerial}] ${v.name} (EPIC: ${v.voterId || 'N/A'})`);
    console.log(`  └─ Card Image HTTP Status: ${check.status === 200 ? '✅ 200 OK' : '❌ FAIL ' + check.status} (${(check.size / 1024).toFixed(2)} KB)`);
    console.log(`  └─ Proxy URL: https://${targetHost}${check.path}`);
  }
  console.log('---------------------------------------------------------------------------------------------------------\n');
}

runTest().catch(console.error);
