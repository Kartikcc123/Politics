const https = require('https');

function post(path, data) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    const req = https.request({
      hostname: 'politics.mathxmedia.tech',
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, res => {
      let buf = '';
      res.on('data', d => buf += d);
      res.on('end', () => {
        try { resolve(JSON.parse(buf)); } catch (_) { resolve(buf); }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function get(path, token) {
  return new Promise((resolve, reject) => {
    const headers = token ? { 'Authorization': 'Bearer ' + token } : {};
    const req = https.request({
      hostname: 'politics.mathxmedia.tech',
      path,
      method: 'GET',
      headers
    }, res => {
      let buf = '';
      res.on('data', d => buf += d);
      res.on('end', () => {
        try { resolve(JSON.parse(buf)); } catch (_) { resolve(buf); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  console.log('1. Checking OCR system runtime on VPS...');
  const ocrHealth = await get('/api/system/ocr');
  console.log('OCR Health:', JSON.stringify(ocrHealth, null, 2));

  console.log('\n2. Attempting login...');
  const loginRes = await post('/api/auth/login', {
    email: 'admin@example.com',
    password: 'AdminPass123'
  });
  console.log('Login result:', loginRes.user ? `Logged in as ${loginRes.user.name} (${loginRes.user.role})` : loginRes);

  if (loginRes.token) {
    console.log('\n3. Checking active import job on live server...');
    const active = await get('/api/import/active', loginRes.token);
    console.log('Active Import:', JSON.stringify(active, null, 2));

    console.log('\n4. Checking all users...');
    const users = await get('/api/auth/users', loginRes.token);
    console.log('Users count:', Array.isArray(users) ? users.length : users);
    if (Array.isArray(users)) {
      users.forEach(u => console.log(` - ID: ${u._id} | ${u.email} | ${u.role}`));
    }

    console.log('\n5. Checking member count...');
    const members = await get('/api/members?limit=1', loginRes.token);
    console.log('Total members in DB:', members.total || (Array.isArray(members) ? members.length : 'N/A'));
  }
}

main().catch(console.error);
