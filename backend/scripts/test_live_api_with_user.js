const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('../src/models/User');

async function testApi() {
  await mongoose.connect('mongodb://187.127.173.42:27017/political_crm');
  const user = await User.findOne({ email: 'ashishsharma01710171@gmail.com' });
  console.log('Found user:', user?.email, 'Role:', user?.role, 'ID:', user?._id);

  const payload = {
    user: {
      id: user._id
    }
  };

  const secret = 'supersecretkeyforpoliticalcrmsoftware2026';
  const token = jwt.sign(payload, secret, { expiresIn: '7d' });

  const baseURL = 'https://politics.mathxmedia.tech';
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
    { name: 'सरेवड़ी (Village)', params: 'paged=true&page=1&limit=100&village=' + encodeURIComponent('सरेवड़ी') },
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

  process.exit(0);
}

testApi().catch(console.error);
