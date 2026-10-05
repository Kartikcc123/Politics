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

async function inspectRekhaAndKanhaiya() {
  console.log('Logging in to live server...');
  const login = await apiRequest('/api/auth/login', 'POST', JSON.stringify({
    email: 'admin@example.com',
    password: 'AdminPass123'
  }));
  const token = login.body?.token;

  console.log('\n--- 1. Inspecting Rekha (SNE1296086) ---');
  const r1 = await apiRequest('/api/members?q=SNE1296086', 'GET', null, token);
  console.log('Rekha records found:', JSON.stringify(r1.body, null, 2));

  console.log('\n--- 2. Inspecting Kanhaiya Lal (SNE0559104) ---');
  const r2 = await apiRequest('/api/members?q=SNE0559104', 'GET', null, token);
  console.log('Kanhaiya Lal records found:', JSON.stringify(r2.body, null, 2));

  // Check if there are other records for Rekha in Narayankheda
  console.log('\n--- 3. Checking other records for Rekha in Narayan Kheda ---');
  const r3 = await apiRequest('/api/members?village=%E0%A4%A8%E0%A4%BE%E0%A4%B0%E0%A4%BE%E0%A4%AF%E0%A4%A3%E0%A4%96%E0%A5%87%E0%A4%A1%E0%A4%BC%E0%A4%BE&q=%E0%A4%B0%E0%A5%87%E0%A4%96%E0%A4%BE', 'GET', null, token);
  for (const m of (r3.body || [])) {
    console.log(`- ${m.name} s/o ${m.guardianName}, EPIC: ${m.voterId}, Photo: ${m.photo || 'NO PHOTO'}, Card: ${m.cardImage || 'NO CARD'}`);
  }
}

inspectRekhaAndKanhaiya();
