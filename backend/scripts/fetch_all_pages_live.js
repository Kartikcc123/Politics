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

async function fetchAllPages() {
  const p1 = await apiGet('/api/members?paged=true&page=1&limit=500');
  const p2 = await apiGet('/api/members?paged=true&page=2&limit=500');

  const allMembers = [...(p1.items || []), ...(p2.items || [])];
  console.log(`Page 1 fetched: ${(p1.items || []).length}, Page 2 fetched: ${(p2.items || []).length}`);
  console.log(`Total Live Members Fetched: ${allMembers.length} (Total reported in DB: ${p1.total})`);

  const serialSet = new Set();
  const serialCountMap = new Map();
  allMembers.forEach(m => {
    const s = parseInt(m.voterSerial, 10);
    if (!isNaN(s)) {
      serialSet.add(s);
      serialCountMap.set(s, (serialCountMap.get(s) || 0) + 1);
    }
  });

  const missing = [];
  for (let i = 1; i <= 682; i++) {
    if (!serialSet.has(i)) missing.push(i);
  }

  console.log(`\n========================================================`);
  console.log(`ANALYSIS OF 677 VOTERS IN DB VS 682 IN PDF SUMMARY:`);
  console.log(`========================================================`);
  console.log(`Total PDF Summary Count: 682 (Serial 1 to 682)`);
  console.log(`Total Voters Present in Live DB: ${allMembers.length}`);
  console.log(`Total Unique Numeric Serials Present: ${serialSet.size}`);
  console.log(`Missing Serials Count: ${missing.length}`);
  console.log(`Missing Serial Numbers:`, missing.join(', '));

  const maxSerial = Math.max(...Array.from(serialSet));
  console.log(`Highest Serial present in DB: ${maxSerial}`);
}

fetchAllPages().catch(console.error);
