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

async function checkAll() {
  const data = await apiGet('/api/members?limit=1000');
  const members = data.members || data;
  
  const page4EPICs = [
    { s: 31, epic: "RJ/20/152/001379" },
    { s: 32, epic: "KDY0955211" },
    { s: 33, epic: "SNE0380972" },
    { s: 34, epic: "SNE0601153" },
    { s: 35, epic: "SNE0727594" },
    { s: 36, epic: "SNE0819318" },
    { s: 37, epic: "SNE0954065" },
    { s: 38, epic: "SNE1550789" },
    { s: 39, epic: "SNE1792274" },
    { s: 40, epic: "SNE1835776" },
    { s: 41, epic: "KDY0955237" },
    { s: 42, epic: "KDY0910521" },
    { s: 43, epic: "KDY0910513" },
    { s: 44, epic: "KDY0955229" },
    { s: 45, epic: "SNE0209924" },
    { s: 46, epic: "SNE0544270" },
    { s: 47, epic: "SNE0727602" },
    { s: 48, epic: "SNE0795427" },
    { s: 49, epic: "SNE0907162" },
    { s: 50, epic: "SNE1237924" },
    { s: 51, epic: "SNE1347020" },
    { s: 52, epic: "KDY0955245" },
    { s: 53, epic: "KDY0955252" },
    { s: 54, epic: "SNE1013747" },
    { s: 55, epic: "SNE1698257" },
    { s: 56, epic: "KDY0955278" },
    { s: 57, epic: "KDY0910562" },
    { s: 58, epic: "SNE0151993" },
    { s: 59, epic: "SNE1835529" },
    { s: 60, epic: "RJ/20/152/000223" }
  ];

  console.log('========================================================================');
  console.log('       PAGE 4 VOTERS (SERIAL 31 TO 60) FETCHED FROM LIVE BACKEND         ');
  console.log('       URL: https://politics.mathxmedia.tech                            ');
  console.log('========================================================================\n');

  console.log('------------------------------------------------------------------------------------------------------');
  console.log(
    'S.No'.padEnd(6) +
    'EPIC / Voter ID'.padEnd(20) +
    'Name (नाम)'.padEnd(22) +
    'Guardian (पिता/पति)'.padEnd(22) +
    'House'.padEnd(8) +
    'Age'.padEnd(6) +
    'Gender'
  );
  console.log('------------------------------------------------------------------------------------------------------');

  page4EPICs.forEach(item => {
    const v = members.find(m => m.voterId?.toUpperCase() === item.epic.toUpperCase());
    if (v) {
      const serial = String(item.s).padEnd(6);
      const epic = String(v.voterId || item.epic).padEnd(20);
      const name = String(v.name || '').padEnd(22).slice(0, 21);
      const relative = String(v.guardianName || '').padEnd(22).slice(0, 21);
      const house = String(v.houseNumber || '-').padEnd(8).slice(0, 7);
      const age = String(v.age || '-').padEnd(6);
      const gender = v.gender === 'male' ? 'पुरुष' : v.gender === 'female' ? 'महिला' : '-';
      console.log(`${serial}${epic}${name}${relative}${house}${age}${gender}`);
    } else {
      console.log(`${String(item.s).padEnd(6)}${item.epic.padEnd(20)}[Not Found in current import batch]`);
    }
  });

  console.log('------------------------------------------------------------------------------------------------------');
}

checkAll().catch(console.error);
