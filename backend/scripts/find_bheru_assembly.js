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

async function findBheruAssembly() {
  const login = await apiRequest('/api/auth/login', 'POST', JSON.stringify({
    email: 'admin@example.com',
    password: 'AdminPass123'
  }));
  const token = login.body.token;

  // Search for houseNumber=53 in Bheeta
  console.log('Searching for houseNumber=53 in Bheeta on live server:');
  const rHouse = await apiRequest('/api/members?village=%E0%A4%AD%E0%A5%80%E0%A4%82%E0%A4%9F%E0%A4%BE&q=53&limit=50', 'GET', null, token);
  const houseMembers = (rHouse.body?.data || rHouse.body?.members || rHouse.body || []);
  console.log(`Found ${houseMembers.length} members for query '53' in Bheeta:`);
  for (const m of houseMembers) {
    console.log(`- ${m.name} s/o ${m.guardianName || m.relativeName}, House: ${m.houseNumber}, EPIC: ${m.voterId}, VidhanSerial: ${m.voterSerial}, WardSerial: ${m.wardVoterSerial}, Ward: ${m.wardNumber}, Part: ${m.partNumber}, Photo: ${m.photo ? m.photo.slice(0, 70) : 'NONE'}`);
  }

  // Also check if any voter with EPIC starting with KDY1228 or similar exists
  const rEpic = await apiRequest('/api/members?q=1228386', 'GET', null, token);
  console.log('\nSearch for 1228386:', rEpic.body);

  // Search for Bhaja in Bheeta
  const rBhaja = await apiRequest('/api/members?village=%E0%A4%AD%E0%A5%80%E0%A4%82%E0%A4%9F%E0%A4%BE&q=%E0%A4%AD%E0%A4%BE%E0%A4%9C%E0%A4%BE', 'GET', null, token);
  console.log('\nSearch for Bhaja:', (rBhaja.body || []).map(m => ({ name: m.name, guardian: m.guardianName, voterId: m.voterId, photo: m.photo })));
}

findBheruAssembly();
