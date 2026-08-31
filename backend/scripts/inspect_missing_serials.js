const https = require('https');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoiNmEzMzAxZjBiM2YyNmYxYzMyMmRhNjZjIiwicm9sZSI6ImFkbWluIn0sImlhdCI6MTc4ODE1OTUzNywiZXhwIjoxNzg4NzY0MzM3fQ.gfAkgcIvtqe6JOUuN6cZPPu1wTxJatGAHNbqL_9IN4g';

function apiGet(path) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'politics.mathxmedia.tech',
      path: path,
      method: 'GET',
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

async function inspectSerials() {
  const data = await apiGet('/api/members?limit=1000');
  const members = Array.isArray(data) ? data : (data.members || []);

  console.log('Total members fetched:', members.length);
  if (members.length === 0) {
    console.log('No members found. Response body structure:', data);
    return;
  }

  const serialSet = new Set();
  members.forEach(m => {
    const s = parseInt(m.voterSerial, 10);
    if (!isNaN(s)) serialSet.add(s);
  });

  console.log(`Unique numeric serials found in DB: ${serialSet.size}`);

  const missing = [];
  for (let i = 1; i <= 682; i++) {
    if (!serialSet.has(i)) missing.push(i);
  }

  console.log(`Missing Serials between 1 and 682 (${missing.length} missing):`);
  console.log(missing.join(', '));
}

inspectSerials().catch(console.error);
