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
      res.on('end', () => {
        try {
          resolve(JSON.parse(buf));
        } catch (e) {
          reject(new Error(`Failed to parse JSON response: ${buf.slice(0, 100)}`));
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function checkBhitaVoters() {
  console.log('=== Checking Assembly Voters (rollType=assembly) ===');
  const resAssembly = await apiGet('/api/members?paged=true&limit=50&rollType=assembly');
  console.log(`Assembly voters total: ${resAssembly.total}`);

  console.log('=== Checking All Voters (rollType=all) ===');
  const resAll = await apiGet('/api/members?paged=true&limit=100&rollType=all');
  console.log(`All voters total: ${resAll.total}`);

  const sectionCounts = {};
  for (const item of (resAll.items || [])) {
    const sec = item.sectionName || 'EMPTY';
    sectionCounts[sec] = (sectionCounts[sec] || 0) + 1;
  }
  console.log('Section counts in live database (first 100 items):', sectionCounts);

  // Search for serial 1 or Patwar or Nenu ram
  const searchNenu = await apiGet('/api/members?q=' + encodeURIComponent('नेनूराम') + '&rollType=all');
  console.log(`Search 'नेनूराम' results:`, (searchNenu.items || searchNenu || []).map(m => ({
    name: m.name,
    voterSerial: m.voterSerial,
    partNumber: m.partNumber,
    sectionNumber: m.sectionNumber,
    sectionName: m.sectionName,
    village: m.village
  })));
}

checkBhitaVoters().catch(console.error);
