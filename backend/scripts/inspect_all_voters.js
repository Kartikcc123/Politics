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

async function inspectAll() {
  // Fetch without paged parameter to get array directly
  const data = await apiGet('/api/members?limit=1000');
  const members = Array.isArray(data) ? data : (data.members || data.items || []);

  console.log(`Total members returned by API: ${members.length}`);

  const serialMap = new Map();
  members.forEach(m => {
    const s = parseInt(m.voterSerial, 10);
    if (!isNaN(s)) {
      if (!serialMap.has(s)) serialMap.set(s, []);
      serialMap.get(s).push(m);
    }
  });

  console.log(`Unique numeric voterSerials in DB: ${serialMap.size}`);

  const missing = [];
  for (let i = 1; i <= 682; i++) {
    if (!serialMap.has(i)) missing.push(i);
  }

  console.log(`\n========================================================`);
  console.log(`MISSING SERIAL NUMBERS BETWEEN 1 AND 682 IN LIVE DB (${missing.length} missing):`);
  console.log(`========================================================`);
  console.log(missing.join(', '));

  console.log(`\nMax serial found in DB: ${Math.max(...Array.from(serialMap.keys()))}`);
}

inspectAll().catch(console.error);
