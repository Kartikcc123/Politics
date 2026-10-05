const https = require('https');

function testUrl(url) {
  return new Promise((resolve) => {
    try {
      const u = new URL(url);
      const req = https.request({
        hostname: u.hostname,
        path: u.pathname,
        method: 'GET',
        family: 4,
        timeout: 5000
      }, (res) => {
        let b = 0;
        res.on('data', d => b += d.length);
        res.on('end', () => resolve({ status: res.statusCode, bytes: b }));
      });
      req.on('error', (e) => resolve({ status: 0, error: e.message }));
      req.end();
    } catch (e) {
      resolve({ status: 0, error: e.message });
    }
  });
}

async function testCards() {
  const photoUrl = 'https://political-data-2026.s3.ap-south-1.amazonaws.com/1790816001441-photo-SNE0083436-1790816001441-5ae7d3.jpg';
  const cardDerived1 = 'https://political-data-2026.s3.ap-south-1.amazonaws.com/1790816001441-card-SNE0083436-1790816001441-5ae7d3.jpg';
  
  console.log('Testing photo:', await testUrl(photoUrl));
  console.log('Testing cardDerived1:', await testUrl(cardDerived1));

  // Check the assembly member for SNE0083436 on live server
  const targetHost = 'politics.mathxmedia.tech';
  const loginReq = https.request({
    hostname: targetHost,
    path: '/api/auth/login',
    method: 'POST',
    family: 4,
    headers: { 'Content-Type': 'application/json' }
  }, (res) => {
    let buf = '';
    res.on('data', d => buf += d);
    res.on('end', () => {
      const token = JSON.parse(buf).token;
      const memReq = https.request({
        hostname: targetHost,
        path: '/api/members?q=SNE0083436',
        method: 'GET',
        family: 4,
        headers: { 'Authorization': 'Bearer ' + token }
      }, (mRes) => {
        let mBuf = '';
        mRes.on('data', d => mBuf += d);
        mRes.on('end', () => {
          console.log('\nAssembly member record SNE0083436:');
          console.log(JSON.stringify(JSON.parse(mBuf), null, 2));
        });
      });
      memReq.end();
    });
  });
  loginReq.write(JSON.stringify({ email: 'admin@example.com', password: 'AdminPass123' }));
  loginReq.end();
}

testCards();
