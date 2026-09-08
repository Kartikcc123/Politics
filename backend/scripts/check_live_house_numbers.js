const https = require('https');

const targetHost = 'politics.mathxmedia.tech';

function apiRequest(urlPath, token = '') {
  return new Promise((resolve, reject) => {
    const headers = {};
    if (token) headers['Authorization'] = 'Bearer ' + token;

    const req = https.request({
      hostname: targetHost,
      path: urlPath,
      method: 'GET',
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
    req.end();
  });
}

async function runCheck() {
  console.log('1. Logging in to Live VPS Server...');
  const loginRes = await new Promise((resolve, reject) => {
    const data = JSON.stringify({ email: 'admin@example.com', password: 'AdminPass123' });
    const req = https.request({
      hostname: targetHost,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': data.length }
    }, (res) => {
      let buf = '';
      res.on('data', d => buf += d);
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(buf) }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });

  const token = loginRes.body.token;
  console.log('✅ Login Successful!\n');

  console.log('2. Fetching members from Live Server API...');
  const res = await apiRequest('/api/members?rollType=all&limit=1000', token);
  const members = Array.isArray(res.body) ? res.body : (res.body?.items || res.body?.members || []);

  console.log(`Total Members on Live Server: ${members.length}\n`);

  console.log('---------------------------------------------------------------------------------------------');
  console.log('                                  LIVE SERVER HOUSE NUMBERS                                  ');
  console.log('---------------------------------------------------------------------------------------------');
  console.log(
    'Serial (क्रमांक)'.padEnd(18) +
    'EPIC / Voter ID'.padEnd(20) +
    'Name (नाम)'.padEnd(22) +
    'Extracted House Number (गृह संख्या)'
  );
  console.log('---------------------------------------------------------------------------------------------');

  // Ground truth map from PDF Pages 3 & 4 (cards 1 to 60)
  const pdfTruth = {
    '1': '00', '2': '0', '3': '0', '4': '00', '5': '0', '6': '72', '7': '112', '8': '112', '9': '4215', '10': '261',
    '11': '417', '12': '4194', '13': '4194', '14': '4194', '15': '4194', '16': '4194', '17': '4194', '18': '4194', '19': '4195', '20': '4195',
    '21': '4195', '22': '4195', '23': '4196', '24': '4196', '25': '4196', '26': '4197', '27': '4197', '28': '4197', '29': '4197', '30': '4197',
    '31': '4197', '32': '4197', '33': '4198', '34': '4198', '35': '4198', '36': '4198', '37': '4198', '38': '4198', '39': '4198', '40': '4198',
    '41': '4200', '42': '4200', '43': '4200', '44': '4200', '45': '4200', '46': '4200', '47': '4200', '48': '4200', '49': '4201', '50': '4202',
    '51': '4202', '52': '4211', '53': '4211', '54': '4211', '55': '4211', '56': '4212', '57': '4212', '58': '4212', '59': '4212', '60': '4215'
  };

  let matchCount = 0;
  let evaluated = 0;

  members.forEach(m => {
    const s = String(m.voterSerial || '').trim();
    const epic = String(m.voterId || '-').padEnd(20);
    const name = String(m.name || '-').padEnd(22).slice(0, 21);
    const extHouse = String(m.houseNumber || '-');
    const expected = pdfTruth[s];

    if (expected !== undefined) {
      evaluated++;
      const isMatch = (extHouse === expected || (Number(extHouse) === Number(expected) && !isNaN(Number(extHouse))));
      if (isMatch) matchCount++;
      const matchTag = isMatch ? '✅ MATCH' : `❌ MISMATCH (Expected: ${expected})`;
      console.log(`${s.padEnd(18)}${epic}${name}${extHouse.padEnd(35)} ${matchTag}`);
    }
  });

  console.log('---------------------------------------------------------------------------------------------');
  console.log(`Accuracy Summary: ${matchCount} / ${evaluated} (${((matchCount/evaluated)*100).toFixed(1)}%) House Numbers matched PDF ground truth.`);
  console.log('---------------------------------------------------------------------------------------------\n');
}

runCheck().catch(console.error);
