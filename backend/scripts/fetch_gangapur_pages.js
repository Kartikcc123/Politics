const https = require('https');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoiNmEzMzAxZjBiM2YyNmYxYzMyMmRhNjZjIiwicm9sZSI6ImFkbWluIn0sImlhdCI6MTc4ODE1OTUzNywiZXhwIjoxNzg4NzY0MzM3fQ.gfAkgcIvtqe6JOUuN6cZPPu1wTxJatGAHNbqL_9IN4g';

function apiGet(path) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'politics.mathxmedia.tech', path, method: 'GET',
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

async function fetchGangapurLivePages() {
  const response = await apiGet('/api/members?rollType=municipal&limit=500');
  const members = Array.isArray(response) ? response : (response.members || response.items || []);

  members.sort((a, b) => Number(a.voterSerial || 0) - Number(b.voterSerial || 0));

  console.log(`FETCHED ${members.length} MUNICIPAL VOTERS FROM LIVE SERVER\n`);

  members.forEach((m) => {
    console.log(`[${m.voterSerial}] EPIC: ${m.voterId} | Name: ${m.name} | Guardian: ${m.guardianName} | House: ${m.houseNumber} | Age: ${m.age} | Gender: ${m.gender} | Ward: ${m.municipalWardNumbers?.[0] || '20'}`);
  });
}

fetchGangapurLivePages().catch(console.error);
