const https = require('https');

function post(path, data, token) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    const req = https.request({
      hostname: 'politics.mathxmedia.tech',
      path,
      method: 'POST',
      headers
    }, res => {
      let buf = '';
      res.on('data', d => buf += d);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(buf) }); }
        catch (_) { resolve({ status: res.statusCode, data: buf }); }
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
        try { resolve({ status: res.statusCode, data: JSON.parse(buf) }); }
        catch (_) { resolve({ status: res.statusCode, data: buf }); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  const loginRes = await post('/api/auth/login', {
    email: 'admin@example.com',
    password: 'AdminPass123'
  });
  const token = loginRes.data?.token;
  if (!token) {
    console.error('Login failed:', loginRes);
    return;
  }
  console.log('Logged in successfully.');

  console.log('Checking active import before:');
  const activeBefore = await get('/api/import/active', token);
  console.log('Active before:', JSON.stringify(activeBefore.data));

  console.log('\nCalling reset-all-voters to clear any stuck ghost jobs...');
  const resetRes = await post('/api/import/reset-all-voters', {}, token);
  console.log('Reset response:', resetRes.status, JSON.stringify(resetRes.data));

  console.log('\nChecking active import after:');
  const activeAfter = await get('/api/import/active', token);
  console.log('Active after:', JSON.stringify(activeAfter.data));
}

main().catch(console.error);
