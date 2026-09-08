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

async function inspect() {
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

  const res = await apiRequest('/api/members?rollType=all&limit=1000', token);
  const members = Array.isArray(res.body) ? res.body : (res.body?.items || res.body?.members || []);

  const pdfMembers = members.filter(m => m.photo || m.sourceDocument?.ocrCardImage || m.sourceDocument?.type === 'pdf');
  console.log(`Found ${pdfMembers.length} members with PDF source / photo out of ${members.length}`);

  if (pdfMembers.length > 0) {
    console.log('PDF Member Sample:', JSON.stringify(pdfMembers[0], null, 2));
  }
}

inspect().catch(console.error);
