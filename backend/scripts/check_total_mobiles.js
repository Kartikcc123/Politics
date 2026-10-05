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

async function checkAllMobiles() {
  const login = await apiRequest('/api/auth/login', 'POST', JSON.stringify({
    email: 'admin@example.com',
    password: 'AdminPass123'
  }));
  const token = login.body?.token;

  console.log('1. Checking total database mobile stats...');
  // Query all members with mobile
  const r = await apiRequest('/api/members?limit=10000', 'GET', null, token);
  const allMembers = r.body?.data || r.body?.members || r.body || [];
  
  const withMobile = allMembers.filter(m => m.mobile && String(m.mobile).trim() !== '' && String(m.mobile).trim() !== '-');
  console.log(`Sample set size: ${allMembers.length}`);
  console.log(`Sample with mobile: ${withMobile.length}`);

  const byGp = {};
  for (const m of withMobile) {
    const gp = m.gramPanchayat || m.village || 'Unknown';
    byGp[gp] = (byGp[gp] || 0) + 1;
  }
  console.log('Mobiles by Gram Panchayat / Village:', byGp);
}

checkAllMobiles();
