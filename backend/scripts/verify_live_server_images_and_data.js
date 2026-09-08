const fs = require('fs');
const https = require('https');

const targetHost = 'politics.mathxmedia.tech';

function apiRequest(urlPath, method = 'GET', bodyData = null, token = '') {
  return new Promise((resolve, reject) => {
    const headers = {};
    if (token) headers['Authorization'] = 'Bearer ' + token;
    if (bodyData) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(bodyData);
    }

    const req = https.request({
      hostname: targetHost,
      path: urlPath,
      method: method,
      headers: headers
    }, (res) => {
      let buf = '';
      res.on('data', d => buf += d);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(buf) });
        } catch(e) {
          resolve({ status: res.statusCode, raw: buf });
        }
      });
    });

    req.on('error', reject);
    if (bodyData) req.write(bodyData);
    req.end();
  });
}

function testImageUrl(imageUrl, token = '') {
  return new Promise((resolve) => {
    if (!imageUrl) return resolve({ status: 0, ok: false, error: 'Empty URL' });
    
    // Check if it's an S3 URL like https://political-data-2026.s3.ap-south-1.amazonaws.com/KEY
    let testPath = imageUrl;
    let headers = {};
    if (token) headers['Authorization'] = 'Bearer ' + token;

    if (imageUrl.includes('amazonaws.com/')) {
      const key = imageUrl.split('amazonaws.com/')[1];
      testPath = `/media/s3/${key}`;
    } else if (imageUrl.startsWith('/')) {
      testPath = imageUrl;
    }

    let hostname = targetHost;
    let path = testPath;

    if (testPath.startsWith('http://') || testPath.startsWith('https://')) {
      try {
        const u = new URL(testPath);
        hostname = u.hostname;
        path = u.pathname + u.search;
      } catch(e) {}
    }

    const req = https.request({
      hostname: hostname,
      path: path,
      method: 'GET',
      headers: headers
    }, (res) => {
      resolve({ status: res.statusCode, ok: res.statusCode >= 200 && res.statusCode < 400 });
    });

    req.on('error', (err) => resolve({ status: 0, ok: false, error: err.message }));
    req.setTimeout(5000, () => {
      req.destroy();
      resolve({ status: 0, ok: false, error: 'Timeout' });
    });
    req.end();
  });
}

async function runVerification() {
  console.log('========================================================================');
  console.log('   LIVE SERVER IMAGE & VOTER DATA FETCH VERIFICATION');
  console.log(`   Target Server: https://${targetHost}`);
  console.log('========================================================================\n');

  // 1. Login
  console.log('1. Logging in to Live VPS Server...');
  const loginRes = await apiRequest('/api/auth/login', 'POST', JSON.stringify({
    email: 'admin@example.com',
    password: 'AdminPass123'
  }));

  if (loginRes.status !== 200 || !loginRes.body?.token) {
    console.error('Login Failed:', loginRes);
    process.exit(1);
  }
  const token = loginRes.body.token;
  console.log('   ✅ Admin Login Successful!\n');

  // 2. Fetch Members
  console.log('2. Fetching all voter records from Live VPS Database...');
  const membersRes = await apiRequest('/api/members?rollType=all&sortBy=voterSerial&limit=1000', 'GET', null, token);
  const members = Array.isArray(membersRes.body) ? membersRes.body : (membersRes.body?.items || membersRes.body?.members || []);
  console.log(`   Total Voters Fetched: ${members.length}\n`);

  if (members.length === 0) {
    console.log('   ⚠️ No voter records found currently on Live Server.');
    return;
  }

  // 3. Inspect Data & Images
  console.log('3. Inspecting Fields and Validating Image HTTP Availability...\n');

  let countWithSerial = 0;
  let countWithVoterId = 0;
  let countWithName = 0;
  let countWithGuardian = 0;
  let countWithHouse = 0;
  let countWithAge = 0;
  let countWithGender = 0;
  let countWithPhotoUrl = 0;
  let countWithCardImageUrl = 0;
  let validPhotoHttpCount = 0;
  let validCardHttpCount = 0;

  console.log('Checking sample records for photo & card image HTTP status...');
  const sampleCheckLimit = Math.min(members.length, 30);

  for (let i = 0; i < members.length; i++) {
    const v = members[i];
    if (v.voterSerial) countWithSerial++;
    if (v.voterId) countWithVoterId++;
    if (v.name) countWithName++;
    if (v.guardianName) countWithGuardian++;
    if (v.houseNumber) countWithHouse++;
    if (v.age) countWithAge++;
    if (v.gender) countWithGender++;

    const photoUrl = v.photo || (v.sourceDocument && v.sourceDocument.photo);
    const cardUrl = (v.sourceDocument && v.sourceDocument.ocrCardImage) || v.ocrCardImage;

    if (photoUrl) countWithPhotoUrl++;
    if (cardUrl) countWithCardImageUrl++;

    if (photoUrl || cardUrl) {
      if (validPhotoHttpCount + validCardHttpCount < 30) {
        if (photoUrl) {
          const photoCheck = await testImageUrl(photoUrl, token);
          if (photoCheck.ok) validPhotoHttpCount++;
        }
        if (cardUrl) {
          const cardCheck = await testImageUrl(cardUrl, token);
          if (cardCheck.ok) validCardHttpCount++;
        }
      }
    }
  }

  console.log('\n========================================================================');
  console.log('                    VERIFICATION SUMMARY REPORT                         ');
  console.log('========================================================================');
  console.log(` • Total Voter Records Evaluated: ${members.length}`);
  console.log(` • Voter Serial Number (क्रमांक): ${countWithSerial} / ${members.length} (${((countWithSerial/members.length)*100).toFixed(1)}%)`);
  console.log(` • Voter ID / EPIC (मतदाता क्रमांक): ${countWithVoterId} / ${members.length} (${((countWithVoterId/members.length)*100).toFixed(1)}%)`);
  console.log(` • Voter Name (नाम): ${countWithName} / ${members.length} (${((countWithName/members.length)*100).toFixed(1)}%)`);
  console.log(` • Guardian Name (पिता/पति): ${countWithGuardian} / ${members.length} (${((countWithGuardian/members.length)*100).toFixed(1)}%)`);
  console.log(` • House Number (गृह संख्या): ${countWithHouse} / ${members.length} (${((countWithHouse/members.length)*100).toFixed(1)}%)`);
  console.log(` • Age (आयु): ${countWithAge} / ${members.length} (${((countWithAge/members.length)*100).toFixed(1)}%)`);
  console.log(` • Gender (लिंग): ${countWithGender} / ${members.length} (${((countWithGender/members.length)*100).toFixed(1)}%)`);
  console.log(` • Person Photo URL Present: ${countWithPhotoUrl} / ${members.length} (${((countWithPhotoUrl/members.length)*100).toFixed(1)}%)`);
  console.log(` • Voter Card Image URL Present: ${countWithCardImageUrl} / ${members.length} (${((countWithCardImageUrl/members.length)*100).toFixed(1)}%)`);
  console.log(` • Person Photo HTTP HTTP 200 OK (Sample 30): ${validPhotoHttpCount} / ${Math.min(countWithPhotoUrl, sampleCheckLimit)}`);
  console.log(` • Card Image HTTP HTTP 200 OK (Sample 30): ${validCardHttpCount} / ${Math.min(countWithCardImageUrl, sampleCheckLimit)}`);
  console.log('========================================================================\n');

  console.log('------------------------------------------------------------------------------------------------------------------------');
  console.log('                                DETAILED SAMPLE VOTERS (FIRST 15) WITH IMAGES & DATA                                    ');
  console.log('------------------------------------------------------------------------------------------------------------------------');
  console.log(
    'Serial'.padEnd(8) +
    'EPIC / Voter ID'.padEnd(18) +
    'Name (नाम)'.padEnd(20) +
    'Guardian'.padEnd(20) +
    'House'.padEnd(8) +
    'Photo Loaded?'.padEnd(16) +
    'Card Image Loaded?'
  );
  console.log('------------------------------------------------------------------------------------------------------------------------');

  const votersWithImages = members.filter(v => v.photo || (v.sourceDocument && v.sourceDocument.photo) || (v.sourceDocument && v.sourceDocument.ocrCardImage) || v.ocrCardImage);
  const displayList = votersWithImages.length > 0 ? votersWithImages : members.slice(0, 15);

  for (let i = 0; i < Math.min(displayList.length, 15); i++) {
    const v = displayList[i];
    const serial = String(v.voterSerial || (i + 1)).padEnd(8);
    const epic = String(v.voterId || 'N/A').padEnd(18);
    const name = String(v.name || '').padEnd(20).slice(0, 19);
    const relative = String(v.guardianName || '').padEnd(20).slice(0, 19);
    const house = String(v.houseNumber || '-').padEnd(8).slice(0, 7);

    const photoUrl = v.photo || (v.sourceDocument && v.sourceDocument.photo);
    const cardUrl = (v.sourceDocument && v.sourceDocument.ocrCardImage) || v.ocrCardImage;

    const photoCheck = photoUrl ? await testImageUrl(photoUrl, token) : { ok: false };
    const cardCheck = cardUrl ? await testImageUrl(cardUrl, token) : { ok: false };

    const photoStatus = (photoUrl ? (photoCheck.ok ? '✅ YES (200)' : `❌ HTTP ${photoCheck.status}`) : '⚠️ NONE').padEnd(16);
    const cardStatus = cardUrl ? (cardCheck.ok ? '✅ YES (200)' : `❌ HTTP ${cardCheck.status}`) : '⚠️ NONE';

    console.log(`${serial}${epic}${name}${relative}${house}${photoStatus}${cardStatus}`);
    if (photoUrl) {
      const key = photoUrl.includes('amazonaws.com/') ? photoUrl.split('amazonaws.com/')[1] : photoUrl;
      console.log(`   └─ Photo URL: https://${targetHost}/media/s3/${key}`);
    }
    if (cardUrl) {
      const key = cardUrl.includes('amazonaws.com/') ? cardUrl.split('amazonaws.com/')[1] : cardUrl;
      console.log(`   └─ Card URL:  https://${targetHost}/media/s3/${key}`);
    }
  }
  console.log('------------------------------------------------------------------------------------------------------------------------\n');
}

runVerification().catch(console.error);
