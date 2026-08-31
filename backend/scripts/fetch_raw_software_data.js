const https = require('https');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoiNmEzMzAxZjBiM2YyNmYxYzMyMmRhNjZjIiwicm9sZSI6ImFkbWluIn0sImlhdCI6MTc4ODE1OTUzNywiZXhwIjoxNzg4NzY0MzM3fQ.gfAkgcIvtqe6JOUuN6cZPPu1wTxJatGAHNbqL_9IN4g';

function apiGet(path) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'politics.mathxmedia.tech',
      path, method: 'GET',
      headers: { 'Authorization': 'Bearer ' + token }
    }, (res) => {
      let buf = '';
      res.on('data', d => buf += d);
      res.on('end', () => resolve(JSON.parse(buf)));
    });
    req.on('error', reject);
    req.end();
  });
}

async function fetchRawSoftwareData() {
  console.log('========================================================================');
  console.log('   FETCHING RAW SOFTWARE DATA DIRECTLY FROM LIVE BACKEND DATABASE       ');
  console.log('   URL: https://politics.mathxmedia.tech                                ');
  console.log('   (NO MANUAL MATCHING - DIRECT BACKEND API OUTPUT)                     ');
  console.log('========================================================================\n');

  // Fetch Booth 1 ID
  const booths = await apiGet('/api/booths');
  const booth1 = Array.isArray(booths) ? booths.find(b => b.number === '1' && b.name?.includes('Part 1')) : null;

  const queryPath = booth1 ? `/api/members?booth=${booth1._id}&limit=500` : '/api/members?limit=500';
  const data = await apiGet(queryPath);
  const voters = Array.isArray(data) ? data : (data.members || data.items || []);

  console.log(`Total Voters Currently Saved in Live Software Database: ${voters.length}\n`);

  // Sort by voterSerial numeric order
  voters.sort((a, b) => (parseInt(a.voterSerial, 10) || 0) - (parseInt(b.voterSerial, 10) || 0));

  console.log('---------------------------------------------------------------------------------------------------------');
  console.log(
    'S.No'.padEnd(6) +
    'EPIC / Voter ID'.padEnd(20) +
    'Name (सॉफ्टवेयर से प्राप्त नाम)'.padEnd(30) +
    'Guardian (पिता/पति)'.padEnd(22) +
    'House'.padEnd(8) +
    'Age'.padEnd(6) +
    'Gender'
  );
  console.log('---------------------------------------------------------------------------------------------------------');

  // Filter for Serials 1 to 90 (First 5 pages data)
  const first5PagesVoters = voters.filter(v => {
    const s = parseInt(v.voterSerial, 10);
    return s >= 1 && s <= 90;
  });

  first5PagesVoters.forEach(v => {
    const s = String(v.voterSerial || '-').padEnd(6);
    const epic = String(v.voterId || 'N/A').padEnd(20);
    const name = String(v.name || '').padEnd(30).slice(0, 29);
    const guardian = String(v.guardianName || '').padEnd(22).slice(0, 21);
    const house = String(v.houseNumber || '-').padEnd(8).slice(0, 7);
    const age = String(v.age || '-').padEnd(6);
    const gender = v.gender === 'male' ? 'पुरुष' : v.gender === 'female' ? 'महिला' : '-';

    console.log(`${s}${epic}${name}${guardian}${house}${age}${gender}`);
  });

  console.log('---------------------------------------------------------------------------------------------------------');
  console.log(`Total Pages 1-5 Voters Fetched Directly from Live Software API: ${first5PagesVoters.length}`);
}

fetchRawSoftwareData().catch(console.error);
