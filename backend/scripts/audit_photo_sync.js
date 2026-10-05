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

// Helper to calculate string similarity / 1-char difference
function isFuzzyMatch(s1, s2) {
  if (!s1 || !s2) return false;
  const str1 = String(s1).trim().toUpperCase();
  const str2 = String(s2).trim().toUpperCase();
  if (str1 === str2) return true;
  if (Math.abs(str1.length - str2.length) > 1) return false;
  let diffs = 0;
  let i = 0, j = 0;
  while (i < str1.length && j < str2.length) {
    if (str1[i] !== str2[j]) {
      diffs++;
      if (diffs > 1) return false;
      if (str1.length > str2.length) i++;
      else if (str2.length > str1.length) j++;
      else { i++; j++; }
    } else {
      i++; j++;
    }
  }
  return true;
}

async function runAudit() {
  const login = await apiRequest('/api/auth/login', 'POST', JSON.stringify({
    email: 'admin@example.com',
    password: 'AdminPass123'
  }));
  const token = login.body.token;

  console.log('Testing fuzzy match for KDY1228386 vs KDY1228384:');
  console.log('Is fuzzy match:', isFuzzyMatch('KDY1228386', 'KDY1228384'));
}

runAudit();
