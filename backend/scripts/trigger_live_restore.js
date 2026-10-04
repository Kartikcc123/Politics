const https = require('https');

function post(path, data = {}, token = '') {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
    };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    const req = https.request({
      hostname: 'politics.mathxmedia.tech',
      path,
      method: 'POST',
      headers,
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

async function main() {
  console.log('Logging in to live API (politics.mathxmedia.tech)...');
  const loginRes = await post('/api/auth/login', {
    email: 'admin@example.com',
    password: 'AdminPass123',
  });

  const token = loginRes.data?.token;
  if (!token) {
    console.error('Login failed:', loginRes);
    process.exit(1);
  }
  console.log('Logged in successfully. Calling /api/import/restore-voters...');

  const restoreRes = await post('/api/import/restore-voters', {}, token);
  console.log('HTTP Status:', restoreRes.status);
  console.log('Response:', restoreRes.data);

  if (restoreRes.data?.success) {
    console.log('\nSUCCESS! Database has been restored.');
    console.log(`- Restored EPICs: ${restoreRes.data.restoredEpicCount}`);
    console.log(`- Restored Serials: ${restoreRes.data.restoredSerialCount}`);
    console.log(`- Cleaned Sections: ${restoreRes.data.cleanedSectionCount}`);
  }
}

main().catch(console.error);
