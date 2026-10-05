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

async function searchGovindDasAndCard() {
  const login = await apiRequest('/api/auth/login', 'POST', JSON.stringify({
    email: 'admin@example.com',
    password: 'AdminPass123'
  }));
  const token = login.body?.token;

  console.log('1. Searching for Govind Das in Narayankheda:');
  const r1 = await apiRequest('/api/members?village=%E0%A4%96%E0%A4%BE%E0%A4%9F%E0%A5%8D%E0%A4%AF%E0%A4%BE%20%E0%A4%95%E0%A4%BE%20%E0%A4%96%E0%A5%87%E0%A4%A1%E0%A4%BC%E0%A4%BE&limit=50', 'GET', null, token);
  for (const m of (r1.body || [])) {
    console.log(`- ${m.name} s/o ${m.guardianName}, House: ${m.houseNumber}, EPIC: ${m.voterId}, Photo: ${m.photo ? 'YES' : 'NO'}, Card: ${m.cardImage ? 'YES' : 'NO'}`);
  }

  console.log('\n2. Searching for SNE0692756 (Kanhaiya Lal assembly record):');
  const r2 = await apiRequest('/api/members?q=SNE0692756', 'GET', null, token);
  console.log(JSON.stringify(r2.body, null, 2));
}

searchGovindDasAndCard();
