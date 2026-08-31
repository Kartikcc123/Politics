const https = require('https');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoiNmEzMzAxZjBiM2YyNmYxYzMyMmRhNjZjIiwicm9sZSI6ImFkbWluIn0sImlhdCI6MTc4ODE1OTUzNywiZXhwIjoxNzg4NzY0MzM3fQ.gfAkgcIvtqe6JOUuN6cZPPu1wTxJatGAHNbqL_9IN4g';

function apiGet(path) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'politics.mathxmedia.tech',
      path: path,
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + token
      }
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

async function fetchLiveBheetaData() {
  console.log('========================================================================');
  console.log('   FETCHING BHEETA (भीटा) DATA FROM LIVE PRODUCTION BACKEND SERVER     ');
  console.log('   URL: https://politics.mathxmedia.tech                                ');
  console.log('========================================================================\n');

  // 1. Fetch Wards
  const wardsRes = await apiGet('/api/wards');
  const ward179 = Array.isArray(wardsRes.body) ? wardsRes.body.find(w => w.number === '179' || w.name?.includes('सहाडा')) : null;
  console.log('Ward 179 (विधान सभा):', ward179 ? `[${ward179.number}] ${ward179.name}` : 'Not Found');

  // 2. Fetch Booths
  const boothsRes = await apiGet('/api/booths');
  const booth1 = Array.isArray(boothsRes.body) ? boothsRes.body.find(b => b.number === '1' && (b.ward?.number === '179' || b.ward === ward179?._id)) : null;
  
  if (booth1) {
    console.log(`Booth (भाग संख्या 1 - भीटा): [${booth1.number}] ${booth1.name}`);
    console.log(`Address: ${booth1.address || booth1.area || 'N/A'}`);
    console.log(`Total Member Count in Booth: ${booth1.memberCount || 0}`);
    console.log(`Villages: ${(booth1.villages || []).join(', ')}`);
    console.log(`Sections (अनुभाग): ${(booth1.sectionNames || []).join(' | ')}\n`);
  }

  // 3. Fetch Members for Booth 1 / Ward 179
  const queryPath = booth1 ? `/api/members?booth=${booth1._id}&limit=500` : '/api/members?limit=500';
  const membersRes = await apiGet(queryPath);

  const voters = membersRes.body?.members || membersRes.body || [];
  console.log(`Total Voters Fetched from Live Server: ${voters.length}\n`);

  console.log('------------------------------------------------------------------------------------------------------');
  console.log(
    'S.No'.padEnd(6) +
    'EPIC / Voter ID'.padEnd(18) +
    'Name (नाम)'.padEnd(22) +
    'Guardian (पिता/पति)'.padEnd(22) +
    'House'.padEnd(8) +
    'Age'.padEnd(6) +
    'Gender'.padEnd(8) +
    'Verification'
  );
  console.log('------------------------------------------------------------------------------------------------------');

  voters.slice(0, 35).forEach((v, idx) => {
    const serial = String(v.voterSerial || (idx + 1)).padEnd(6);
    const epic = String(v.voterId || 'N/A').padEnd(18);
    const name = String(v.name || '').padEnd(22).slice(0, 21);
    const relative = String(v.guardianName || '').padEnd(22).slice(0, 21);
    const house = String(v.houseNumber || '-').padEnd(8).slice(0, 7);
    const age = String(v.age || '-').padEnd(6);
    const gender = (v.gender === 'male' ? 'पुरुष' : v.gender === 'female' ? 'महिला' : '-').padEnd(8);
    const status = String(v.verificationStatus || 'verified');

    console.log(`${serial}${epic}${name}${relative}${house}${age}${gender}${status}`);
  });

  if (voters.length > 35) {
    console.log(`... and ${voters.length - 35} more voters on live production backend.`);
  }

  console.log('------------------------------------------------------------------------------------------------------');
}

fetchLiveBheetaData().catch(console.error);
