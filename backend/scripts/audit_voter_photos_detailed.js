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
      family: 4, // Force IPv4
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

async function auditMissingPhotos() {
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
  console.log('Logged in successfully!\n');

  // 1. Fetch Bheeta Ward 2 voters
  console.log('--- Fetching Bheeta Ward 2 voters ---');
  const res = await apiRequest('/api/members?village=%E0%A4%AD%E0%A5%80%E0%A4%82%E0%A4%9F%E0%A4%BE&wardNumber=2&limit=1000', 'GET', null, token);
  const voters = res.body?.data || res.body?.members || res.body || [];

  const missing = [];
  const withPhoto = [];

  for (const v of voters) {
    if (!v.photo || v.photo === '') {
      missing.push(v);
    } else {
      withPhoto.push(v);
    }
  }

  console.log(`Total Bheeta Ward 2 voters: ${voters.length}`);
  console.log(`Voters with photo: ${withPhoto.length} (${((withPhoto.length/voters.length)*100).toFixed(1)}%)`);
  console.log(`Voters missing photo: ${missing.length}`);

  console.log('\n--- Analyzing which voters can be recovered from database ---');
  const recoveredByEpic = [];
  const recoveredByFuzzy = [];
  const trulyNoPhoto = [];

  for (const m of missing) {
    // 1. Exact voterId in DB
    const byEpic = await apiRequest(`/api/members?q=${encodeURIComponent(m.voterId)}`, 'GET', null, token);
    const candidateEpic = (byEpic.body || []).find(c => c.photo && c.photo !== '');
    if (candidateEpic) {
      recoveredByEpic.push({ voter: m, matched: candidateEpic, type: 'EXACT_EPIC' });
      continue;
    }

    // 2. Fuzzy / Name + Father in same village
    if (m.guardianName || m.name) {
      const qStr = m.guardianName || m.name;
      const byName = await apiRequest(`/api/members?village=%E0%A4%AD%E0%A5%80%E0%A4%82%E0%A4%9F%E0%A4%BE&q=${encodeURIComponent(qStr.trim())}`, 'GET', null, token);
      const candidateName = (byName.body || []).find(c => c.photo && (c.houseNumber === m.houseNumber || c.name?.slice(0, 3) === m.name?.slice(0, 3)));
      if (candidateName) {
        recoveredByFuzzy.push({ voter: m, matched: candidateName, type: 'NAME_OR_FATHER' });
        continue;
      }
    }

    trulyNoPhoto.push(m);
  }

  console.log(`\nResults:`);
  console.log(`1. Recoverable via Exact Voter ID match: ${recoveredByEpic.length}`);
  console.log(`2. Recoverable via Name/Father OCR match: ${recoveredByFuzzy.length}`);
  console.log(`3. Not in Assembly list / No photo in roll: ${trulyNoPhoto.length}`);

  console.log('\n--- Details of Recoverable Voters ---');
  for (const r of [...recoveredByEpic, ...recoveredByFuzzy].slice(0, 15)) {
    console.log(`- वार्ड #${r.voter.wardVoterSerial}: ${r.voter.name} (${r.voter.voterId}), पिता: ${r.voter.guardianName || '-'}, घर: ${r.voter.houseNumber || '-'}`);
    console.log(`  -> मैच हुआ: ${r.matched.name} (${r.matched.voterId}) [फ़ोटो उपलब्ध]`);
  }
}

auditMissingPhotos();
