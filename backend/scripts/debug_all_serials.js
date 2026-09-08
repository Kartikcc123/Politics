const https = require('https');
const targetHost = 'politics.mathxmedia.tech';

function apiRequest(urlPath, method = 'GET', bodyData = null, token = '') {
  return new Promise((resolve, reject) => {
    const headers = {};
    if (bodyData) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(bodyData);
    }
    if (token) headers['Authorization'] = 'Bearer ' + token;

    const req = https.request({
      hostname: targetHost,
      path: urlPath,
      method: method,
      headers: headers
    }, (res) => {
      let buf = '';
      res.on('data', d => buf += d);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(buf) }); }
        catch(e) { resolve({ status: res.statusCode, raw: buf }); }
      });
    });
    req.on('error', reject);
    if (bodyData) req.write(bodyData);
    req.end();
  });
}

async function checkSerials() {
  const loginRes = await apiRequest('/api/auth/login', 'POST', JSON.stringify({ email: 'admin@example.com', password: 'AdminPass123' }));
  const token = loginRes.body?.token;
  console.log('Login Token:', token ? 'SUCCESS' : 'FAILED status=' + loginRes.status);

  // Fetch all voters
  const res = await apiRequest('/api/members?limit=300', 'GET', null, token);
  const items = Array.isArray(res.body) ? res.body : (res.body?.items || []);

  console.log(`Total Voters in VPS DB: ${items.length}\n`);

  console.log('-----------------------------------------------------------------------------------------------------------------------');
  console.log('#'.padEnd(5) + 'Serial (क्रमांक)'.padEnd(18) + 'Voter ID'.padEnd(18) + 'Name (नाम)'.padEnd(20) + 'House'.padEnd(10) + 'Section');
  console.log('-----------------------------------------------------------------------------------------------------------------------');

  items.forEach((m, idx) => {
    const num = String(idx + 1).padEnd(5);
    const s = String(m.voterSerial || '-').padEnd(18);
    const epic = String(m.voterId || 'N/A').padEnd(18);
    const name = String(m.name || '').padEnd(20).slice(0, 19);
    const house = String(m.houseNumber || '-').padEnd(10).slice(0, 9);
    const sec = String(m.sectionName || '-').slice(0, 30);
    console.log(`${num}${s}${epic}${name}${house}${sec}`);
  });
  console.log('-----------------------------------------------------------------------------------------------------------------------');
}

checkSerials().catch(console.error);
