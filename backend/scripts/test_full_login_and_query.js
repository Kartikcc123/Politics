const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../src/models/User');

async function run() {
  await mongoose.connect('mongodb://187.127.173.42:27017/political_crm');

  const hashedPassword = await bcrypt.hash('Admin@12345', 10);
  const user = await User.findOneAndUpdate(
    { email: 'ashishsharma01710171@gmail.com' },
    { $set: { password: hashedPassword, role: 'admin', active: true } },
    { new: true }
  );

  console.log('Password set for:', user.email, 'Role:', user.role);

  // Now login via API
  const loginRes = await fetch('https://politics.mathxmedia.tech/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'ashishsharma01710171@gmail.com',
      password: 'Admin@12345'
    })
  });

  const loginData = await loginRes.json();
  console.log('Login Response Status:', loginRes.status);
  console.log('Got Token:', loginData.token ? 'YES' : 'NO');

  if (loginData.token) {
    const token = loginData.token;
    const headers = { 'Authorization': `Bearer ${token}` };

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
        const url = `https://politics.mathxmedia.tech/api/members?${t.params}`;
        const res = await fetch(url, { headers });
        const data = await res.json();
        console.log(`[Status ${res.status}] ${t.name}: Total in DB = ${data.total}, Items in page = ${data.items?.length}`);
      } catch (e) {
        console.error(`❌ ${t.name} failed:`, e.message);
      }
    }
  }

  process.exit(0);
}

run().catch(console.error);
