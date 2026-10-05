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

async function checkPart67AndHouse470() {
  const login = await apiRequest('/api/auth/login', 'POST', JSON.stringify({
    email: 'admin@example.com',
    password: 'AdminPass123'
  }));
  const token = login.body?.token;

  console.log('Checking other family members in House 470 / Trivedi in Raipur:');
  const r1 = await apiRequest('/api/members?village=%E0%A4%B0%E0%A4%BE%E0%A4%AF%E0%A4%AA%E0%A5%81%E0%A4%B0&q=470', 'GET', null, token);
  for (const m of (r1.body || [])) {
    console.log(`- ${m.name} s/o ${m.guardianName}, House: ${m.houseNumber}, Part: ${m.partNumber}, Ward: ${m.wardNumber || m.municipalWardNumbers || '-'}, VidhanSerial: ${m.voterSerial}, WardSerial: ${m.wardVoterSerial || '-'}`);
  }

  console.log('\nChecking Ranadeep Kumar Trivedi (father):');
  const r2 = await apiRequest('/api/members?village=%E0%A4%B0%E0%A4%BE%E0%A4%AF%E0%A4%AA%E0%A5%81%E0%A4%B0&q=%E0%A4%B0%E0%A4%A3%E0%A4%A6%E0%A5%80%E0%A4%AA', 'GET', null, token);
  for (const m of (r2.body || [])) {
    console.log(`- ${m.name} s/o ${m.guardianName}, EPIC: ${m.voterId}, Part: ${m.partNumber}, Ward: ${m.wardNumber || m.municipalWardNumbers || '-'}, Serial: ${m.voterSerial}`);
  }
}

checkPart67AndHouse470();
