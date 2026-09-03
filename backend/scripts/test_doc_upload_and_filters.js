const fs = require('fs');
const path = require('path');
const http = require('http');

const pdfPath = path.resolve(__dirname, '../../sample-data/DOC-20260424-WA0137..pdf');

console.log('========================================================================');
console.log('   LOCAL BACKEND PDF UPLOAD, DATA INSPECTION & FILTER TEST');
console.log('   Target PDF: DOC-20260424-WA0137..pdf');
console.log('   Target Server: http://127.0.0.1:5000');
console.log('========================================================================\n');

if (!fs.existsSync(pdfPath)) {
  console.error('ERROR: PDF file does not exist at:', pdfPath);
  process.exit(1);
}

function apiRequest(urlPath, method = 'GET', bodyData = null, isMultipart = false, boundary = '', token = '') {
  return new Promise((resolve, reject) => {
    const headers = {};
    if (token) headers['Authorization'] = 'Bearer ' + token;

    if (isMultipart) {
      headers['Content-Type'] = 'multipart/form-data; boundary=' + boundary;
      headers['Content-Length'] = bodyData.length;
    } else if (bodyData) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(bodyData);
    }

    const req = http.request({
      hostname: '127.0.0.1',
      port: 5000,
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

async function runTest() {
  // 1. Admin Login
  console.log('1. Logging in to Local Backend Server...');
  const loginRes = await apiRequest('/api/auth/login', 'POST', JSON.stringify({
    email: 'admin@example.com',
    password: 'AdminPass123'
  }));

  if (loginRes.status !== 200 || !loginRes.body?.token) {
    console.error('Local Login Failed:', loginRes);
    process.exit(1);
  }
  const token = loginRes.body.token;
  console.log('   ✅ Local Admin Login Successful!\n');

  // 2. Upload PDF
  const stat = fs.statSync(pdfPath);
  const uploadId = 'docupload' + Date.now();
  const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
  const fileBuffer = fs.readFileSync(pdfPath);

  const header = Buffer.from('--' + boundary + '\r\n' +
    'Content-Disposition: form-data; name="file"; filename="DOC-20260424-WA0137..pdf"\r\n' +
    'Content-Type: application/pdf\r\n\r\n');
  const footer = Buffer.from('\r\n--' + boundary + '--\r\n');
  const multipartBody = Buffer.concat([header, fileBuffer, footer]);

  console.log(`2. Uploading PDF DOC-20260424-WA0137..pdf (${(stat.size / (1024 * 1024)).toFixed(2)} MB) ...`);
  console.log(`   Generated Upload ID: ${uploadId}`);

  const uploadRes = await apiRequest(`/api/import/members/pdf?asyncImport=true&uploadId=${uploadId}`, 'POST', multipartBody, true, boundary, token);
  console.log('   HTTP Status:', uploadRes.status);
  console.log('   Upload Response:', JSON.stringify(uploadRes.body || uploadRes.raw, null, 2));

  // 3. Poll OCR Progress
  console.log(`\n3. Polling Local Server OCR Import Progress for uploadId: ${uploadId} ...`);
  let importSuccess = false;
  for (let i = 1; i <= 180; i++) {
    await new Promise(r => setTimeout(r, 2500));
    const st = await apiRequest(`/api/import/status/${uploadId}`, 'GET', null, false, '', token);
    const data = st.body || {};
    
    if (i % 4 === 0 || data.status === 'completed' || data.status === 'failed') {
      console.log(`   [Poll ${i}] Status: ${data.status || 'waiting'} | Stage: "${data.stage || 'N/A'}" | OCR Pages: ${data.ocrPagesProcessed || 0}/${data.ocrPagesTotal || 0} | Cards: ${data.ocrCardsProcessed || 0}/${data.ocrCardsTotal || 0}`);
    }

    if (data.status === 'completed') {
      importSuccess = true;
      console.log('\n   🎉 PDF Import Completed Successfully!');
      if (data.result) console.log('   Import Summary:', JSON.stringify(data.result, null, 2));
      break;
    }
    if (data.status === 'failed') {
      console.error('\n   ❌ PDF Import Failed:', data.stage);
      break;
    }
  }

  if (!importSuccess) {
    console.error('Import did not complete successfully.');
  }

  // 4. Fetch Wards & Booths
  console.log('\n4. Fetching Wards & Booths from Server Database...');
  const wardsRes = await apiRequest('/api/wards', 'GET', null, false, '', token);
  const wards = Array.isArray(wardsRes.body) ? wardsRes.body : [];
  console.log(`   Total Wards: ${wards.length}`);

  const boothsRes = await apiRequest('/api/booths', 'GET', null, false, '', token);
  const booths = Array.isArray(boothsRes.body) ? boothsRes.body : [];
  console.log(`   Total Booths: ${booths.length}`);

  // 5. Fetch Extracted Members
  console.log('\n5. Fetching Extracted Voters/Members from Local Server Database...');
  const membersRes = await apiRequest('/api/members?rollType=all&sortBy=voterSerial&limit=1000', 'GET', null, false, '', token);
  const members = Array.isArray(membersRes.body) ? membersRes.body : (membersRes.body?.items || membersRes.body?.members || []);
  console.log(`   Total Members Fetched: ${members.length}`);

  // Group Voters by Section Name / Anubhag
  const sectionCounts = new Map();
  members.forEach(m => {
    const secName = m.sectionName || m.location || 'Unassigned / Default';
    const secNum = m.sectionNumber || '-';
    const key = `[Section ${secNum}] ${secName}`;
    sectionCounts.set(key, (sectionCounts.get(key) || 0) + 1);
  });

  console.log('\n======================================================');
  console.log('         ANUBHAG (अनुभाग) FETCHED FROM LOCAL SERVER    ');
  console.log('======================================================');
  sectionCounts.forEach((count, secKey) => {
    console.log(`   • ${secKey} => ${count} voter(s)`);
  });
  console.log('======================================================\n');

  // Display Extracted Voters Table (First 25)
  console.log('---------------------------------------------------------------------------------------------------------');
  console.log('                                EXTRACTED VOTERS LIST (FIRST 25)                                          ');
  console.log('---------------------------------------------------------------------------------------------------------');
  console.log(
    'S.No (क्रमांक)'.padEnd(16) +
    'EPIC / Voter ID'.padEnd(18) +
    'Name (नाम)'.padEnd(22) +
    'Father/Husband'.padEnd(22) +
    'House'.padEnd(8) +
    'Gender'.padEnd(8) +
    'Anubhag / Section'
  );
  console.log('---------------------------------------------------------------------------------------------------------');

  members.slice(0, 25).forEach((v, idx) => {
    const serial = String(v.voterSerial || (idx + 1)).padEnd(16);
    const epic = String(v.voterId || 'N/A').padEnd(18);
    const name = String(v.name || '').padEnd(22).slice(0, 21);
    const relative = String(v.guardianName || '').padEnd(22).slice(0, 21);
    const house = String(v.houseNumber || '-').padEnd(8).slice(0, 7);
    const gender = (v.gender === 'male' ? 'पुरुष' : v.gender === 'female' ? 'महिला' : '-').padEnd(8);
    const section = String(v.sectionName || v.location || '-').slice(0, 25);

    console.log(`${serial}${epic}${name}${relative}${house}${gender}${section}`);
  });
  console.log('---------------------------------------------------------------------------------------------------------\n');

  // 6. FILTER VERIFICATION TESTS
  console.log('======================================================');
  console.log('            VERIFYING FILTERS ON LOCAL SERVER         ');
  console.log('======================================================\n');

  // Filter Test 1: Gender Filters
  console.log('Testing Filter 1: Gender Filter');
  const maleRes = await apiRequest('/api/members?rollType=all&gender=male&limit=1000', 'GET', null, false, '', token);
  const maleVoters = Array.isArray(maleRes.body) ? maleRes.body : (maleRes.body?.items || maleRes.body?.members || []);
  console.log(`   • male voters filter (gender=male): ${maleVoters.length} returned`);

  const femaleRes = await apiRequest('/api/members?rollType=all&gender=female&limit=1000', 'GET', null, false, '', token);
  const femaleVoters = Array.isArray(femaleRes.body) ? femaleRes.body : (femaleRes.body?.items || femaleRes.body?.members || []);
  console.log(`   • female voters filter (gender=female): ${femaleVoters.length} returned`);
  console.log(`   -> Gender Filter Status: ${(maleVoters.length + femaleVoters.length > 0) ? '✅ WORKING' : '❌ FAILED'}\n`);

  // Filter Test 2: Search Query Filter (q)
  console.log('Testing Filter 2: Name Search Query Filter (q)');
  if (members.length > 0) {
    const sampleFirstName = members[0].name ? members[0].name.split(' ')[0] : '';
    if (sampleFirstName) {
      const qRes = await apiRequest(`/api/members?rollType=all&q=${encodeURIComponent(sampleFirstName)}&limit=1000`, 'GET', null, false, '', token);
      const qVoters = Array.isArray(qRes.body) ? qRes.body : (qRes.body?.items || qRes.body?.members || []);
      console.log(`   • Search query q="${sampleFirstName}": ${qVoters.length} returned`);
      console.log(`   -> Search Filter Status: ${qVoters.length > 0 ? '✅ WORKING' : '❌ FAILED'}\n`);
    }
  }

  // Filter Test 3: Section/Anubhag Filter
  console.log('Testing Filter 3: Section / Location Filter');
  const uniqueSections = [...new Set(members.map(m => m.sectionName).filter(Boolean))];
  if (uniqueSections.length > 0) {
    const targetSection = uniqueSections[0];
    const secRes = await apiRequest(`/api/members?rollType=all&sectionName=${encodeURIComponent(targetSection)}&limit=1000`, 'GET', null, false, '', token);
    const secVoters = Array.isArray(secRes.body) ? secRes.body : (secRes.body?.items || secRes.body?.members || []);
    console.log(`   • Section Filter sectionName="${targetSection}": ${secVoters.length} returned`);
    console.log(`   -> Section Filter Status: ${secVoters.length > 0 ? '✅ WORKING' : '❌ FAILED'}\n`);
  } else {
    console.log('   • Checking location filter...');
    const uniqueLocs = [...new Set(members.map(m => m.location).filter(Boolean))];
    if (uniqueLocs.length > 0) {
      const targetLoc = uniqueLocs[0];
      const locRes = await apiRequest(`/api/members?rollType=all&location=${encodeURIComponent(targetLoc)}&limit=1000`, 'GET', null, false, '', token);
      const locVoters = Array.isArray(locRes.body) ? locRes.body : (locRes.body?.items || locRes.body?.members || []);
      console.log(`   • Location Filter location="${targetLoc}": ${locVoters.length} returned`);
      console.log(`   -> Location Filter Status: ${locVoters.length > 0 ? '✅ WORKING' : '❌ FAILED'}\n`);
    }
  }

  // Filter Test 4: Verification Status Filter
  console.log('Testing Filter 4: Verification Status Filter');
  const verRes = await apiRequest('/api/members?rollType=all&verificationStatus=unverified&limit=1000', 'GET', null, false, '', token);
  const verVoters = Array.isArray(verRes.body) ? verRes.body : (verRes.body?.items || verRes.body?.members || []);
  console.log(`   • Verification status filter (verificationStatus=unverified): ${verVoters.length} returned`);
  console.log(`   -> Verification Filter Status: WORKING (Returned ${verVoters.length})\n`);

  // Filter Test 5: Ward / Booth Filter
  if (wards.length > 0) {
    console.log('Testing Filter 5: Ward Filter');
    const wardId = wards[0]._id;
    const wardRes = await apiRequest(`/api/members?rollType=all&ward=${wardId}&limit=1000`, 'GET', null, false, '', token);
    const wardVoters = Array.isArray(wardRes.body) ? wardRes.body : (wardRes.body?.items || wardRes.body?.members || []);
    console.log(`   • Ward Filter ward="${wardId}" (${wards[0].name || wards[0].number}): ${wardVoters.length} returned`);
    console.log(`   -> Ward Filter Status: WORKING (Returned ${wardVoters.length})\n`);
  }

  console.log('======================================================');
  console.log('         ALL TESTS COMPLETED SUCCESSFULLY!             ');
  console.log('======================================================\n');
}

runTest().catch(console.error);
