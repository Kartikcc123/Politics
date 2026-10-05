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

async function checkRaipurMobiles() {
  console.log('Logging in to live server...');
  const login = await apiRequest('/api/auth/login', 'POST', JSON.stringify({
    email: 'admin@example.com',
    password: 'AdminPass123'
  }));
  const token = login.body?.token;

  console.log('1. Fetching Raipur voters with mobile numbers...');
  // Fetch voters in Raipur
  const res = await apiRequest('/api/members?gramPanchayat=%E0%A4%B0%E0%A4%BE%E0%A4%AF%E0%A4%AA%E0%A5%81%E0%A4%B0&limit=5000', 'GET', null, token);
  const raipurVoters = res.body?.data || res.body?.members || res.body || [];

  console.log(`Total voters fetched for Gram Panchayat Raipur: ${raipurVoters.length}`);

  const withMobile = raipurVoters.filter(m => m.mobile && String(m.mobile).trim() !== '' && String(m.mobile).trim() !== '-');
  const withoutMobile = raipurVoters.filter(m => !m.mobile || String(m.mobile).trim() === '' || String(m.mobile).trim() === '-');

  console.log(`Voters WITH Mobile Number in Raipur: ${withMobile.length}`);
  console.log(`Voters WITHOUT Mobile Number: ${withoutMobile.length}`);

  // Sample list of voters with mobile numbers in Raipur
  console.log('\n--- Sample Voters with Mobile Numbers in Raipur ---');
  for (const m of withMobile.slice(0, 30)) {
    const ward = m.wardNumber || (m.municipalWardNumbers && m.municipalWardNumbers[0]) || '-';
    console.log(`- ${m.name} s/o ${m.guardianName || m.relativeName || '-'} | मो: ${m.mobile} | EPIC: ${m.voterId || '-'} | वार्ड: ${ward} | भाग: ${m.partNumber || '-'} | गाँव: ${m.village || '-'}`);
  }

  // Also check Raipur Samiti (all villages / GPs under Raipur)
  console.log('\n2. Fetching other villages in Raipur area with mobiles...');
  const samitiRes = await apiRequest('/api/members?tehsil=%E0%A4%B0%E0%A4%BE%E0%A4%AF%E0%A4%AA%E0%A5%81%E0%A4%B0&limit=5000', 'GET', null, token);
  const samitiVoters = samitiRes.body?.data || samitiRes.body?.members || samitiRes.body || [];
  const samitiWithMobile = samitiVoters.filter(m => m.mobile && String(m.mobile).trim() !== '' && String(m.mobile).trim() !== '-');
  console.log(`Total Tehsil/Samiti voters fetched: ${samitiVoters.length}`);
  console.log(`Tehsil/Samiti voters with mobile: ${samitiWithMobile.length}`);
}

checkRaipurMobiles();
