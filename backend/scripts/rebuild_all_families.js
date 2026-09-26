const https = require('https');
const http = require('http');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const TARGET_HOST = process.env.TARGET_HOST || 'politics.mathxmedia.tech';
const isHttps = TARGET_HOST !== 'localhost' && !TARGET_HOST.startsWith('127.0.0.1');
const client = isHttps ? https : http;

function apiRequest(urlPath, method = 'GET', bodyData = null, token = '') {
  return new Promise((resolve, reject) => {
    const headers = {};
    if (token) headers['Authorization'] = 'Bearer ' + token;
    if (bodyData) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(bodyData);
    }
    const req = client.request({
      hostname: TARGET_HOST,
      port: isHttps ? 443 : 5000,
      path: urlPath,
      method: method,
      headers: headers,
    }, (res) => {
      let buf = '';
      res.on('data', d => buf += d);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(buf) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: buf });
        }
      });
    });
    req.on('error', reject);
    if (bodyData) req.write(bodyData);
    req.end();
  });
}

async function main() {
  console.log('========================================================================');
  console.log('🏠 FAMILY CLUSTERING & REBUILD TOOL');
  console.log(`Connecting to: https://${TARGET_HOST}...`);
  console.log('========================================================================\n');

  // 1. Admin Login
  const loginRes = await apiRequest('/api/auth/login', 'POST', JSON.stringify({
    email: process.env.ADMIN_EMAIL || 'admin@example.com',
    password: process.env.ADMIN_PASSWORD || 'AdminPass123'
  }));

  if (loginRes.status !== 200 || !loginRes.body?.token) {
    console.error('❌ Login failed:', loginRes.body || loginRes.raw);
    process.exit(1);
  }
  const token = loginRes.body.token;
  console.log('✅ Admin login successful.\n');

  // 2. Trigger Rebuild
  console.log('⚙️  Analyzing voter house numbers and building families...');
  const rebuildRes = await apiRequest('/api/families/rebuild', 'POST', JSON.stringify({}), token);

  if (rebuildRes.status !== 200) {
    console.error('❌ Family rebuild failed:', rebuildRes.body || rebuildRes.raw);
    process.exit(1);
  }

  // 3. Fetch Summary
  const summaryRes = await apiRequest('/api/families/summary', 'GET', null, token);
  const s = summaryRes.body || {};

  console.log('\n========================================================================');
  console.log('🎉 FAMILY GENERATION RESULTS:');
  console.log('========================================================================');
  console.log(`Total Families Formed     : ${s.totalFamilies ?? rebuildRes.body?.families ?? 0}`);
  console.log(`Total Homes / Houses      : ${s.totalHomes ?? 0}`);
  console.log(`Voters Assigned to Family : ${s.totalMembers ?? rebuildRes.body?.assignedMembers ?? 0}`);
  console.log(`Total Voters in Database  : ${s.totalVoters ?? 0}`);
  console.log(`Unassigned Voters         : ${s.unassignedVoters ?? 0}`);
  console.log(`Voters Without House No.  : ${s.missingHouseNumber ?? rebuildRes.body?.skippedMissingHouse ?? 0}`);
  console.log('========================================================================\n');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
