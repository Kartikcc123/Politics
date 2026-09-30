const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const TARGET_HOST = process.env.TARGET_HOST || '187.127.173.42';
const TARGET_PORT = process.env.TARGET_PORT ? parseInt(process.env.TARGET_PORT, 10) : 5003;
const IS_HTTPS = TARGET_PORT === 443;

function apiRequest(urlPath, method = 'GET', bodyData = null, token = '') {
  return new Promise((resolve, reject) => {
    const client = IS_HTTPS ? https : http;
    const headers = {};
    if (token) headers['Authorization'] = 'Bearer ' + token;
    if (bodyData) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(bodyData);
    }
    const req = client.request({
      hostname: TARGET_HOST,
      port: TARGET_PORT,
      path: urlPath,
      method,
      headers,
      timeout: 60000
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); } catch(e) { resolve({ status: res.statusCode, raw: d }); }
      });
    });
    req.on('error', reject);
    if (bodyData) req.write(bodyData);
    req.end();
  });
}

async function fullAudit() {
  console.log('========================================================================');
  console.log('🔍 FULL CONSTITUENCY BOOTH-BY-BOOTH (PART 1 TO 315) AUDIT');
  console.log('========================================================================\n');

  console.log('Logging in to live server...');
  const loginRes = await apiRequest('/api/auth/login', 'POST', JSON.stringify({
    email: process.env.ADMIN_EMAIL || 'admin@example.com',
    password: process.env.ADMIN_PASSWORD || 'AdminPass123'
  }));

  const token = loginRes.body?.token;
  if (!token) {
    console.error('❌ Login failed');
    process.exit(1);
  }

  console.log('Fetching all location groupings from database...');
  const locGroups = await apiRequest('/api/members/location-groups?limit=1000', 'GET', null, token);
  const items = locGroups.body?.items || [];

  const partMap = new Map();
  for (const item of items) {
    const p = String(item.key?.partNumber || '').trim();
    if (p) {
      if (!partMap.has(p)) partMap.set(p, { count: 0, villages: new Set(), gp: item.key?.gramPanchayat || '' });
      const entry = partMap.get(p);
      entry.count += item.count || 0;
      if (item.key?.village) entry.villages.add(item.key.village);
      if (item.key?.gramPanchayat) entry.gp = item.key.gramPanchayat;
    }
  }

  const complete = [];
  const partial = [];
  const missing = [];

  for (let p = 1; p <= 315; p++) {
    const pStr = String(p);
    const data = partMap.get(pStr);
    const count = data ? data.count : 0;
    const villages = data ? Array.from(data.villages).join(', ') : '-';

    if (count >= 100) {
      complete.push({ part: p, count, villages });
    } else if (count > 0) {
      partial.push({ part: p, count, villages });
    } else {
      missing.push({ part: p, count: 0, villages: '-' });
    }
  }

  console.log('\n========================================================================');
  console.log('📊 AUDIT SUMMARY');
  console.log('========================================================================');
  console.log(`🎯 Total Constituency Parts : 315 Polling Booths`);
  console.log(`✅ Fully Uploaded (OK)      : ${complete.length} Parts`);
  console.log(`⚠️ Partial Upload (Low)    : ${partial.length} Parts`);
  console.log(`❌ Completely Missing (0)   : ${missing.length} Parts`);
  console.log('========================================================================\n');

  console.log('❌ ALL MISSING PART NUMBERS:');
  const missingNums = missing.map(m => m.part);
  console.log(missingNums.join(', '));

  console.log('\n📋 GROUPED BY NUMBER RANGES:');
  // Group consecutive numbers into ranges
  function getRanges(arr) {
    if (!arr.length) return [];
    arr.sort((a,b) => a - b);
    const ranges = [];
    let start = arr[0];
    let prev = arr[0];
    for (let i = 1; i < arr.length; i++) {
      if (arr[i] === prev + 1) {
        prev = arr[i];
      } else {
        ranges.push(start === prev ? `${start}` : `${start} से ${prev}`);
        start = arr[i];
        prev = arr[i];
      }
    }
    ranges.push(start === prev ? `${start}` : `${start} से ${prev}`);
    return ranges;
  }

  console.log(getRanges(missingNums).join(' | '));
  console.log('\n========================================================================\n');
}

fullAudit().catch(e => console.error(e));
