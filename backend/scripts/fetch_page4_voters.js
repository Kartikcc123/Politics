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

async function fetchPage4Voters() {
  console.log('========================================================================');
  console.log('  FETCHING VOTERS 31 TO 60 (PAGE 4) FROM LIVE PRODUCTION BACKEND       ');
  console.log('  URL: https://politics.mathxmedia.tech                                 ');
  console.log('========================================================================\n');

  // Fetch Booth 1 ID
  const boothsRes = await apiGet('/api/booths');
  const booth1 = Array.isArray(boothsRes.body) ? boothsRes.body.find(b => b.number === '1' && b.name?.includes('Part 1')) : null;

  const queryPath = booth1 ? `/api/members?booth=${booth1._id}&limit=1000` : '/api/members?limit=1000';
  const membersRes = await apiGet(queryPath);

  const voters = membersRes.body?.members || membersRes.body || [];
  
  // Convert voterSerial to number and filter for serial numbers 31 to 60
  const sortedVoters = voters.sort((a, b) => (Number(a.voterSerial) || 0) - (Number(b.voterSerial) || 0));

  const page4Voters = sortedVoters.filter(v => {
    const s = Number(v.voterSerial);
    return s >= 31 && s <= 60;
  });

  console.log(`Found ${page4Voters.length} voters for Serial 31 to 60 on Live Server:\n`);

  console.log('------------------------------------------------------------------------------------------------------');
  console.log(
    'S.No'.padEnd(6) +
    'EPIC / Voter ID'.padEnd(20) +
    'Name (नाम)'.padEnd(22) +
    'Guardian (पिता/पति)'.padEnd(22) +
    'House'.padEnd(8) +
    'Age'.padEnd(6) +
    'Gender'.padEnd(8) +
    'Verification'
  );
  console.log('------------------------------------------------------------------------------------------------------');

  page4Voters.forEach((v) => {
    const serial = String(v.voterSerial).padEnd(6);
    const epic = String(v.voterId || 'N/A').padEnd(20);
    const name = String(v.name || '').padEnd(22).slice(0, 21);
    const relative = String(v.guardianName || '').padEnd(22).slice(0, 21);
    const house = String(v.houseNumber || '-').padEnd(8).slice(0, 7);
    const age = String(v.age || '-').padEnd(6);
    const gender = (v.gender === 'male' ? 'पुरुष' : v.gender === 'female' ? 'महिला' : '-').padEnd(8);
    const status = String(v.verificationStatus || 'verified');

    console.log(`${serial}${epic}${name}${relative}${house}${age}${gender}${status}`);
  });

  console.log('------------------------------------------------------------------------------------------------------');
}

fetchPage4Voters().catch(console.error);
