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

async function analyze() {
  const data = await apiGet('/api/members?limit=1000');
  const members = data.members || data;

  const serials = new Set();
  const serialCountMap = new Map();

  members.forEach(m => {
    const s = Number(m.voterSerial);
    if (!isNaN(s) && s > 0) {
      serials.add(s);
      serialCountMap.set(s, (serialCountMap.get(s) || 0) + 1);
    }
  });

  const maxSerial = Math.max(...Array.from(serials));
  const minSerial = Math.min(...Array.from(serials));

  console.log(`Min Serial in DB: ${minSerial}, Max Serial in DB: ${maxSerial}`);

  const missingSerials = [];
  for (let i = 1; i <= 682; i++) {
    if (!serials.has(i)) {
      missingSerials.push(i);
    }
  }

  console.log(`Total missing serials out of 1..682: ${missingSerials.length}`);
  console.log(`Missing Serials:`, missingSerials);

  const duplicates = [];
  serialCountMap.forEach((count, s) => {
    if (count > 1) duplicates.push({ serial: s, count });
  });
  if (duplicates.length > 0) {
    console.log(`Duplicate Serials in DB:`, duplicates);
  }
}

analyze().catch(console.error);
