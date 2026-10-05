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

async function testMatchingBheru() {
  const login = await apiRequest('/api/auth/login', 'POST', JSON.stringify({
    email: 'admin@example.com',
    password: 'AdminPass123'
  }));
  const token = login.body.token;

  // Specific check for Bheru KDY1228386
  const m = {
    name: 'भेरू',
    voterId: 'KDY1228386',
    voterSerial: '113',
    houseNumber: '53',
    guardianName: 'भाजा',
    village: 'भींटा',
    gramPanchayat: 'भींटा',
    wardNumber: '2'
  };

  console.log('Testing resolution for Bheru (KDY1228386)...');

  // Query 1: Find by EPIC
  const byEpic = await apiRequest(`/api/members?q=${encodeURIComponent(m.voterId)}`, 'GET', null, token);
  console.log('By EPIC count:', (byEpic.body || []).length);

  // Query 2: Find in Bheeta by voterSerial 113
  const bySerial = await apiRequest(`/api/members?village=%E0%A4%AD%E0%A5%80%E0%A4%82%E0%A4%9F%E0%A4%BE&voterSerial=113`, 'GET', null, token);
  console.log('By Serial count:', (bySerial.body || []).length);
  for (const c of (bySerial.body || [])) {
    console.log('  Candidate by serial:', { name: c.name, guardian: c.guardianName, epic: c.voterId, photo: c.photo });
  }

  // Query 3: Find in Bheeta by house 53 or guardian भाजा/भजा
  const byBhaja = await apiRequest(`/api/members?village=%E0%A4%AD%E0%A5%80%E0%A4%82%E0%A4%9F%E0%A4%BE&q=%E0%A4%AD%E0%A4%9C%E0%A4%BE`, 'GET', null, token);
  for (const c of (byBhaja.body || [])) {
    console.log('  Candidate by guardian भजा:', { name: c.name, guardian: c.guardianName, epic: c.voterId, photo: c.photo });
  }
}

testMatchingBheru();
