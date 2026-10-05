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

async function checkLakshya() {
  console.log('Searching for SNE1926035 (लक्ष्य त्रिवेदी) on live server...');
  
  // Try login with default or query public if available
  const login = await apiRequest('/api/auth/login', 'POST', JSON.stringify({
    email: 'admin@example.com',
    password: 'AdminPass123'
  }));
  const token = login.body?.token;

  // Search by EPIC
  const r1 = await apiRequest('/api/members?q=SNE1926035', 'GET', null, token);
  const items1 = r1.body?.data || r1.body?.members || r1.body || [];
  console.log('\nSearch result by EPIC SNE1926035:');
  console.log(JSON.stringify(items1, null, 2));

  // Also search by name लक्ष्य in Raipur
  const r2 = await apiRequest('/api/members?q=%E0%A4%B2%E0%A4%95%E0%A5%8D%E0%A4%B7%E0%A5%8D%E0%A4%AF', 'GET', null, token);
  const items2 = r2.body?.data || r2.body?.members || r2.body || [];
  console.log('\nSearch result by Name लक्ष्य:');
  for (const m of items2) {
    console.log(`- ${m.name} s/o ${m.guardianName || m.relativeName}, EPIC: ${m.voterId}, वि.स. क्रमांक: ${m.voterSerial}, भाग: ${m.partNumber}, वार्ड: ${m.wardNumber || (m.municipalWardNumbers && m.municipalWardNumbers[0]) || '-'}, वार्ड क्रमांक: ${m.wardVoterSerial || '-'}, गाँव: ${m.village || '-'}, ग्राम पंचायत: ${m.gramPanchayat || '-'}`);
  }

  // Also check Raipur Ward 8
  const r3 = await apiRequest('/api/members?gramPanchayat=%E0%A4%B0%E0%A4%BE%E0%A4%AF%E0%A4%AA%E0%A5%81%E0%A4%B0&wardNumber=8&limit=20', 'GET', null, token);
  const items3 = r3.body?.data || r3.body?.members || r3.body || [];
  console.log(`\nRaipur Ward 8 voter count sample: ${items3.length}`);
}

checkLakshya();
