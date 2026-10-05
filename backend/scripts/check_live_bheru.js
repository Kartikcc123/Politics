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

async function checkLiveVoters() {
  console.log('Logging in to live server...');
  const login = await apiRequest('/api/auth/login', 'POST', JSON.stringify({
    email: 'admin@example.com',
    password: 'AdminPass123'
  }));

  const token = login.body?.token;
  if (!token) {
    console.error('Login failed:', login);
    return;
  }
  console.log('Logged in successfully!');

  // Search for KDY1228386
  console.log('\nSearching for KDY1228386 (भेरू)...');
  const voterRes = await apiRequest('/api/members?q=KDY1228386', 'GET', null, token);
  console.log('Search result for KDY1228386:', JSON.stringify(voterRes.body, null, 2));

  // Search for Bheeta Ward 2 voters
  console.log('\nFetching sample of Bheeta Ward 2 voters...');
  const bheetaRes = await apiRequest('/api/members?village=%E0%A4%AD%E0%A5%80%E0%A4%82%E0%A4%9F%E0%A4%BE&wardNumber=2&limit=20', 'GET', null, token);
  const items = bheetaRes.body?.data || bheetaRes.body?.members || bheetaRes.body || [];
  console.log(`Found ${items.length} voters:`);
  for (const m of items.slice(0, 10)) {
    console.log(`- [${m.voterSerial || m.wardVoterSerial || '-'}] ${m.name} (${m.voterId}): photo = "${m.photo}"`);
  }

  // Count how many voters in Bheeta Ward 2 have missing or empty photo
  const allBheeta = await apiRequest('/api/members?village=%E0%A4%AD%E0%A5%80%E0%A4%82%E0%A4%9F%E0%A4%BE&wardNumber=2&limit=1000', 'GET', null, token);
  const allList = allBheeta.body?.data || allBheeta.body?.members || allBheeta.body || [];
  const missing = allList.filter(m => !m.photo || m.photo === '');
  console.log(`\nBheeta Ward 2 Total voters: ${allList.length}`);
  console.log(`Voters with photo: ${allList.length - missing.length}`);
  console.log(`Voters with MISSING photo: ${missing.length}`);
  if (missing.length > 0) {
    console.log('Sample voters with missing photo:');
    for (const m of missing.slice(0, 10)) {
      console.log(`  - वि.स. ${m.voterSerial}, वार्ड ${m.wardVoterSerial}: ${m.name} (${m.voterId}) part=${m.partNumber}`);
    }
  }
}

checkLiveVoters();
