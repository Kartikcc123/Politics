const https = require('https');

const targetHost = 'politics.mathxmedia.tech';

function apiRequest(urlPath, method = 'GET', bodyData = null, token = '') {
  return new Promise((resolve, reject) => {
    const headers = {};
    if (token) headers['Authorization'] = 'Bearer ' + token;
    if (bodyData) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(bodyData);
    }

    const req = https.request({
      hostname: targetHost,
      path: urlPath,
      method: method,
      family: 4,
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

function checkS3Url(url) {
  return new Promise((resolve) => {
    try {
      const u = new URL(url);
      const req = https.request({
        hostname: u.hostname,
        path: u.pathname,
        method: 'HEAD',
        family: 4,
        timeout: 5000
      }, (res) => {
        resolve({ status: res.statusCode, exists: res.statusCode === 200 });
      });
      req.on('error', (e) => resolve({ status: 0, error: e.message }));
      req.on('timeout', () => { req.destroy(); resolve({ status: 0, error: 'timeout' }); });
      req.end();
    } catch (e) {
      resolve({ status: 0, error: e.message });
    }
  });
}

async function inspectMahendraPuri() {
  console.log('Logging in to live server...');
  const login = await apiRequest('/api/auth/login', 'POST', JSON.stringify({
    email: 'admin@example.com',
    password: 'AdminPass123'
  }));
  const token = login.body?.token;

  console.log('\n--- Inspecting Mahendra Puri (SNE0834366) ---');
  const r = await apiRequest('/api/members?q=SNE0834366', 'GET', null, token);
  const items = r.body?.data || r.body?.members || r.body || [];
  console.log(`Found ${items.length} records:`);
  for (const m of items) {
    console.log(JSON.stringify(m, null, 2));

    if (m.photo) {
      const cardDerived = m.photo.replace('-photo-', '-card-');
      console.log('\nChecking derived cardImage in S3:', cardDerived);
      const s3Check = await checkS3Url(cardDerived);
      console.log('S3 card check result:', s3Check);
    }
  }
}

inspectMahendraPuri();
