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

async function checkPhotos() {
  const login = await apiRequest('/api/auth/login', 'POST', JSON.stringify({
    email: 'admin@example.com',
    password: 'AdminPass123'
  }));
  const token = login.body.token;

  console.log('1. Searching for all records with voterId=KDY1228386:');
  const r1 = await apiRequest('/api/members?q=KDY1228386', 'GET', null, token);
  console.log(JSON.stringify(r1.body, null, 2));

  console.log('\n2. Searching for all records with name=भेरू and father=भाजा:');
  const r2 = await apiRequest('/api/members?q=%E0%A4%AD%E0%A5%87%E0%A4%B0%E0%A5%82', 'GET', null, token);
  const bheeraMatches = (r2.body || []).filter(m => m.village === 'भींटा' || m.guardianName?.includes('भाजा'));
  console.log('Matches in Bheeta:', bheeraMatches.map(m => ({
    name: m.name,
    voterId: m.voterId,
    guardianName: m.guardianName,
    partNumber: m.partNumber,
    voterSerial: m.voterSerial,
    wardNumber: m.wardNumber,
    wardVoterSerial: m.wardVoterSerial,
    photo: m.photo
  })));

  // Check 5 other missing photo voters in Bheeta Ward 2
  const missingVoterIds = ['SNE0947788', 'SNE0682948', 'SNE1536200', 'KDY0955864', 'KDY0955880', 'KDY0955328'];
  console.log('\n3. Checking other missing voter IDs:');
  for (const vid of missingVoterIds) {
    const res = await apiRequest(`/api/members?q=${vid}`, 'GET', null, token);
    const list = res.body || [];
    console.log(`- ${vid}: found ${list.length} records:`, list.map(m => ({ name: m.name, part: m.partNumber, ward: m.wardNumber, photo: m.photo || 'NO PHOTO' })));
  }
}

checkPhotos();
