const https = require('https');

const TARGET_HOST = 'politics.mathxmedia.tech';

function req(urlPath, method = 'GET', data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const r = https.request({
      hostname: TARGET_HOST,
      path: urlPath,
      method,
      headers,
    }, res => {
      let buf = '';
      res.on('data', chunk => buf += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(buf) });
        } catch (_) {
          resolve({ status: res.statusCode, raw: buf });
        }
      });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

async function main() {
  const login = await req('/api/auth/login', 'POST', JSON.stringify({
    email: 'admin@example.com',
    password: 'AdminPass123',
  }), { 'Content-Type': 'application/json' });

  const token = login.body?.token;
  if (!token) {
    console.error('Login failed:', login);
    return;
  }
  console.log('Login OK.');

  const active = await req('/api/import/active', 'GET', null, { Authorization: 'Bearer ' + token });
  console.log('Active import:', JSON.stringify(active.body, null, 2));

  const status1 = await req('/api/import/status/live-test-1789852079487', 'GET', null, { Authorization: 'Bearer ' + token });
  console.log('Last upload status:', JSON.stringify(status1.body, null, 2));

  const voters = await req('/api/voters', 'GET', null, { Authorization: 'Bearer ' + token });
  console.log('Voters endpoint status:', voters.status, 'Data:', typeof voters.body === 'object' ? Object.keys(voters.body) : voters.raw?.slice(0, 100));

  const memberList = await req('/api/members', 'GET', null, { Authorization: 'Bearer ' + token });
  console.log('Members endpoint status:', memberList.status, 'Keys:', typeof memberList.body === 'object' ? Object.keys(memberList.body) : memberList.raw?.slice(0, 100));
}

main().catch(console.error);
