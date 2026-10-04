const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

async function testApi() {
  const baseURL = 'https://politics.mathxmedia.tech';

  // Generate token directly using JWT secret
  const token = jwt.sign(
    { id: '66a1b2c3d4e5f67890123456', role: 'admin' },
    process.env.JWT_SECRET || 'political_crm_secret_key_2024_secure',
    { expiresIn: '7d' }
  );

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  const tests = [
    { name: 'कलालखेड़ी (Village)', params: 'paged=true&page=1&limit=100&village=' + encodeURIComponent('कलालखेड़ी') },
    { name: 'पीथा का खेड़ा (Village)', params: 'paged=true&page=1&limit=100&village=' + encodeURIComponent('पीथा का खेड़ा') },
    { name: 'भींटा (Village)', params: 'paged=true&page=1&limit=100&village=' + encodeURIComponent('भींटा') },
    { name: 'कलालखेड़ी (GP)', params: 'paged=true&page=1&limit=100&gramPanchayat=' + encodeURIComponent('कलालखेड़ी') },
    { name: 'पीथा का खेड़ा (GP)', params: 'paged=true&page=1&limit=100&gramPanchayat=' + encodeURIComponent('पीथा का खेड़ा') },
    { name: 'All Voters (No filter)', params: 'paged=true&page=1&limit=100' },
  ];

  for (const t of tests) {
    try {
      const url = `${baseURL}/api/members?${t.params}`;
      const res = await fetch(url, { headers });
      const data = await res.json();
      console.log(`[Status ${res.status}] ${t.name}: Total in DB = ${data.total}, Items in page = ${data.items?.length}`);
    } catch (e) {
      console.error(`❌ ${t.name} failed:`, e.message);
    }
  }
}

testApi();
