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

async function runInspect() {
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

  console.log('Fetching members from Live Server...');
  const res = await apiRequest('/api/members?rollType=all&limit=1000', token);
  const members = Array.isArray(res.body) ? res.body : (res.body?.items || res.body?.members || []);

  console.log(`Total Members on Live Server: ${members.length}\n`);

  // Let's filter voters that have partNumber === '177' or sectionName containing 'गंगापुर' or '19-20' or 'रेगर मौहल्ला'
  const part177Members = members.filter(m => 
    String(m.partNumber) === '177' || 
    String(m.sectionName || '').includes('गंगापुर') ||
    String(m.sectionName || '').includes('19-20') ||
    String(m.sectionName || '').includes('रेगर') ||
    (m.sourceDocument && String(m.sourceDocument.file || '').includes('DOC-4pages'))
  );

  console.log(`Found ${part177Members.length} voters belonging to Part 177 / DOC-4pages.pdf\n`);

  console.log('-------------------------------------------------------------------------------------------------------------------');
  console.log('                                PART 177 (DOC-4pages.pdf) EXTRACTED HOUSE NUMBERS                                  ');
  console.log('-------------------------------------------------------------------------------------------------------------------');
  console.log(
    'Serial (क्रमांक)'.padEnd(16) +
    'EPIC / Voter ID'.padEnd(18) +
    'Name (नाम)'.padEnd(20) +
    'Guardian'.padEnd(20) +
    'House No (गृह संख्या)'.padEnd(22) +
    'Part No'
  );
  console.log('-------------------------------------------------------------------------------------------------------------------');

  const pdfTruth = {
    '1': '00', '2': '0', '3': '0', '4': '00', '5': '0', '6': '72', '7': '112', '8': '112', '9': '4215', '10': '261',
    '11': '417', '12': '4194', '13': '4194', '14': '4194', '15': '4194', '16': '4194', '17': '4194', '18': '4194', '19': '4195', '20': '4195',
    '21': '4195', '22': '4195', '23': '4196', '24': '4196', '25': '4196', '26': '4197', '27': '4197', '28': '4197', '29': '4197', '30': '4197',
    '31': '4197', '32': '4197', '33': '4198', '34': '4198', '35': '4198', '36': '4198', '37': '4198', '38': '4198', '39': '4198', '40': '4198',
    '41': '4200', '42': '4200', '43': '4200', '44': '4200', '45': '4200', '46': '4200', '47': '4200', '48': '4200', '49': '4201', '50': '4202',
    '51': '4202', '52': '4211', '53': '4211', '54': '4211', '55': '4211', '56': '4212', '57': '4212', '58': '4212', '59': '4212', '60': '4215'
  };

  let correctCount = 0;

  // Sort by voterSerial
  part177Members.sort((a, b) => Number(a.voterSerial || 0) - Number(b.voterSerial || 0));

  part177Members.forEach((m, idx) => {
    const serial = String(m.voterSerial || (idx + 1)).padEnd(16);
    const epic = String(m.voterId || '-').padEnd(18);
    const name = String(m.name || '-').padEnd(20).slice(0, 19);
    const guardian = String(m.guardianName || '-').padEnd(20).slice(0, 19);
    const house = String(m.houseNumber || '-').padEnd(22);
    const part = String(m.partNumber || '-');

    const expected = pdfTruth[String(m.voterSerial)];
    const isMatch = expected !== undefined && (house.trim() === expected || Number(house) === Number(expected));
    if (isMatch) correctCount++;

    const statusTag = isMatch ? '✅ ACCURATE' : (expected ? `⚠️ expected ${expected}` : '');
    console.log(`${serial}${epic}${name}${guardian}${house}${part} ${statusTag}`);
  });

  console.log('-------------------------------------------------------------------------------------------------------------------');
  console.log(`Part 177 Accuracy: ${correctCount} / ${part177Members.length} House Numbers match PDF ground truth exactly.`);
  console.log('-------------------------------------------------------------------------------------------------------------------\n');
}

runInspect().catch(console.error);
