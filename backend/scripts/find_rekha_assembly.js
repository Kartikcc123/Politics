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

async function findRekhaAssembly() {
  const login = await apiRequest('/api/auth/login', 'POST', JSON.stringify({
    email: 'admin@example.com',
    password: 'AdminPass123'
  }));
  const token = login.body?.token;

  console.log('1. Searching for all Govind Das in Narayankheda / Raipur:');
  const r1 = await apiRequest('/api/members?q=%E0%A4%97%E0%A5%8B%E0%A4%B5%E0%A4%BF%E0%A4%82%E0%A4%A6&limit=50', 'GET', null, token);
  for (const m of (r1.body || [])) {
    if (m.gramPanchayat?.includes('नारायण') || m.village?.includes('खाट्या') || m.village?.includes('नारायण')) {
      console.log(`- ${m.name} s/o ${m.guardianName}, House: ${m.houseNumber}, EPIC: ${m.voterId}, Photo: ${m.photo || 'NO'}, Card: ${m.cardImage || 'NO'}`);
    }
  }

  console.log('\n2. Searching for 1296086 in all members:');
  const r2 = await apiRequest('/api/members?q=1296086', 'GET', null, token);
  console.log(JSON.stringify(r2.body, null, 2));

  console.log('\n3. Searching for 12960 in all members (nearby serials):');
  const r3 = await apiRequest('/api/members?q=SNE12960', 'GET', null, token);
  for (const m of (r3.body || [])) {
    console.log(`- ${m.name} s/o ${m.guardianName}, House: ${m.houseNumber}, EPIC: ${m.voterId}, Photo: ${m.photo ? 'YES' : 'NO'}, Card: ${m.cardImage ? 'YES' : 'NO'}`);
  }
}

findRekhaAssembly();
