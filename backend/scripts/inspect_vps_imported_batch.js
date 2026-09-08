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

async function inspectVps() {
  console.log('1. Logging in to Live VPS Server...');
  const loginRes = await apiRequest('/api/auth/login', 'POST', JSON.stringify({
    email: 'admin@example.com',
    password: 'AdminPass123'
  }));

  if (loginRes.status !== 200 || !loginRes.body?.token) {
    console.error('Login failed:', loginRes);
    process.exit(1);
  }
  const token = loginRes.body.token;

  console.log('2. Fetching all members from VPS DB...');
  const membersRes = await apiRequest('/api/members?rollType=all&sortBy=createdAt&sortOrder=desc&limit=100', 'GET', null, token);
  const members = Array.isArray(membersRes.body) ? membersRes.body : (membersRes.body?.items || membersRes.body?.members || []);

  console.log(`\n========================================================================`);
  console.log(`   LIVE VPS RECENTLY IMPORTED VOTERS INSPECTION (Count: ${members.length})`);
  console.log(`========================================================================\n`);

  console.log('---------------------------------------------------------------------------------------------------------------------------------------------');
  console.log(
    'S.No'.padEnd(8) +
    'Voter ID'.padEnd(18) +
    'Name (नाम)'.padEnd(20) +
    'Guardian (पिता/पति)'.padEnd(20) +
    'House'.padEnd(10) +
    'Section (अनुभाग)'.padEnd(30) +
    'Review Reasons'
  );
  console.log('---------------------------------------------------------------------------------------------------------------------------------------------');

  // Filter members created recently or sort by serial for the uploaded batch
  const batch = members.slice(0, 60).sort((a,b) => (a.voterSerial || 0) - (b.voterSerial || 0));

  batch.forEach((v) => {
    const serial = String(v.voterSerial || '-').padEnd(8);
    const epic = String(v.voterId || 'N/A').padEnd(18);
    const name = String(v.name || '').padEnd(20).slice(0, 19);
    const guardian = String(v.guardianName || '').padEnd(20).slice(0, 19);
    const house = String(v.houseNumber || '-').padEnd(10).slice(0, 9);
    const section = String(v.sectionName || '-').padEnd(30).slice(0, 29);
    const reasons = Array.isArray(v.reviewReasons) ? v.reviewReasons.join(', ') : '';

    console.log(`${serial}${epic}${name}${guardian}${house}${section}${reasons}`);
  });
  console.log('---------------------------------------------------------------------------------------------------------------------------------------------\n');
}

inspectVps().catch(console.error);
