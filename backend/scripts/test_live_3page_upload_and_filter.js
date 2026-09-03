const fs = require('fs');
const path = require('path');
const https = require('https');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoiNmEzMzAxZjBiM2YyNmYxYzMyMmRhNjZjIiwicm9sZSI6ImFkbWluIn0sImlhdCI6MTc4ODE1OTUzNywiZXhwIjoxNzg4NzY0MzM3fQ.gfAkgcIvtqe6JOUuN6cZPPu1wTxJatGAHNbqL_9IN4g';
const pdfPath = path.resolve(__dirname, '../../sample-data/DOC-3pages.pdf');

console.log('========================================================================');
console.log('   LIVE SERVER 3-PAGE PDF UPLOAD & FILTER VERIFICATION TEST');
console.log('   Target URL: https://politics.mathxmedia.tech');
console.log('========================================================================\n');

if (!fs.existsSync(pdfPath)) {
  console.error('ERROR: 3-page PDF file does not exist at:', pdfPath);
  process.exit(1);
}

function apiRequest(urlPath, method = 'GET', bodyData = null, isMultipart = false, boundary = '') {
  return new Promise((resolve, reject) => {
    const headers = {
      'Authorization': 'Bearer ' + token
    };
    if (isMultipart) {
      headers['Content-Type'] = 'multipart/form-data; boundary=' + boundary;
      headers['Content-Length'] = bodyData.length;
    } else if (bodyData) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(bodyData);
    }

    const req = https.request({
      hostname: 'politics.mathxmedia.tech',
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
  const stat = fs.statSync(pdfPath);
  const uploadId = 'live3page' + Date.now();
  const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
  const fileBuffer = fs.readFileSync(pdfPath);

  const header = Buffer.from('--' + boundary + '\r\n' +
    'Content-Disposition: form-data; name="file"; filename="DOC-3pages.pdf"\r\n' +
    'Content-Type: application/pdf\r\n\r\n');
  const footer = Buffer.from('\r\n--' + boundary + '--\r\n');
  const multipartBody = Buffer.concat([header, fileBuffer, footer]);

  console.log(`1. Uploading 3-Page PDF (${(stat.size / 1024).toFixed(2)} KB) to https://politics.mathxmedia.tech ...`);
  console.log(`   Generated Upload ID: ${uploadId}`);
  
  const uploadRes = await apiRequest(`/api/import/members/pdf?asyncImport=true&uploadId=${uploadId}`, 'POST', multipartBody, true, boundary);
  console.log('   HTTP Status:', uploadRes.status);
  console.log('   Upload Response:', JSON.stringify(uploadRes.body || uploadRes.raw, null, 2));

  // Polling import progress on live server
  console.log(`\n2. Polling Live Server OCR Import Progress for uploadId: ${uploadId} ...`);
  let importCompleted = false;
  for (let i = 1; i <= 40; i++) {
    await new Promise(r => setTimeout(r, 2500));
    const st = await apiRequest(`/api/import/status/${uploadId}`);
    const data = st.body || {};
    console.log(`   [Poll ${i}] Status: ${data.status || 'waiting'} | Stage: "${data.stage || 'N/A'}" | OCR Pages: ${data.ocrPagesProcessed || 0}/${data.ocrPagesTotal || 0} | Processed Cards: ${data.ocrCardsProcessed || 0}/${data.ocrCardsTotal || 0}`);
    
    if (data.status === 'completed') {
      importCompleted = true;
      console.log('\n   🎉 Live Server PDF Import Completed Successfully!');
      if (data.result) {
        console.log('   Import Result:', JSON.stringify(data.result, null, 2));
      }
      break;
    }
    if (data.status === 'failed') {
      console.error('\n   ❌ Live Server PDF Import Failed:', data.stage);
      break;
    }
  }

  // 3. Fetch Wards & Booths from Live Server
  console.log('\n3. Fetching Wards & Booths from Live Server...');
  const wardsRes = await apiRequest('/api/wards');
  const wards = Array.isArray(wardsRes.body) ? wardsRes.body : [];
  console.log(`   Total Wards on Live Server: ${wards.length}`);

  const boothsRes = await apiRequest('/api/booths');
  const booths = Array.isArray(boothsRes.body) ? boothsRes.body : [];
  console.log(`   Total Booths on Live Server: ${booths.length}`);

  console.log('\n   Detected Booths & Sections (अनुभाग):');
  booths.forEach(b => {
    const sections = Array.isArray(b.sectionNames) ? b.sectionNames.join(' | ') : (b.sectionNames || 'None');
    console.log(`   • Booth #${b.number} [${b.name}] => Sections: ${sections}`);
  });

  // 4. Fetch Members from Live Server (with rollType=all to see all records)
  console.log('\n4. Fetching Voters / Members from Live Server...');
  const membersRes = await apiRequest('/api/members?rollType=all&limit=500');
  const members = Array.isArray(membersRes.body) ? membersRes.body : (membersRes.body?.items || membersRes.body?.members || []);
  console.log(`   Total Members Fetched from Server: ${members.length}`);

  // Group Voters by Section Name / Anubhag
  const sectionCounts = new Map();
  members.forEach(m => {
    const secName = m.sectionName || m.location || 'Unassigned / Default';
    const secNum = m.sectionNumber || '-';
    const key = `[Section ${secNum}] ${secName}`;
    sectionCounts.set(key, (sectionCounts.get(key) || 0) + 1);
  });

  console.log('\n======================================================');
  console.log('         ANUBHAG (अनुभाग) FETCHED FROM SERVER          ');
  console.log('======================================================');
  sectionCounts.forEach((count, secKey) => {
    console.log(`   • ${secKey} => ${count} voter(s)`);
  });
  console.log('======================================================\n');

  // 5. Test Filters on Live Server
  console.log('5. Testing Live Server Filter Functionality:');

  // Filter 1: Section Name Filter
  const uniqueSectionNames = [...new Set(members.map(m => m.sectionName).filter(Boolean))];
  if (uniqueSectionNames.length > 0) {
    const targetSection = uniqueSectionNames[0];
    const res = await apiRequest(`/api/members?rollType=all&sectionName=${encodeURIComponent(targetSection)}&limit=500`);
    const filtered = Array.isArray(res.body) ? res.body : (res.body?.items || res.body?.members || []);
    console.log(`   ✅ [Section Filter] sectionName="${targetSection}" => Fetched ${filtered.length} voter(s)`);
  } else {
    console.log('   ⚠️ No explicit sectionName property on members, checking sectionNumber / location...');
    const uniqueLocations = [...new Set(members.map(m => m.location).filter(Boolean))];
    if (uniqueLocations.length > 0) {
      const loc = uniqueLocations[0];
      const res = await apiRequest(`/api/members?rollType=all&location=${encodeURIComponent(loc)}&limit=500`);
      const filtered = Array.isArray(res.body) ? res.body : (res.body?.items || res.body?.members || []);
      console.log(`   ✅ [Location Filter] location="${loc}" => Fetched ${filtered.length} voter(s)`);
    }
  }

  // Filter 2: Gender Filter (male vs female)
  const maleRes = await apiRequest('/api/members?rollType=all&gender=male&limit=500');
  const maleVoters = Array.isArray(maleRes.body) ? maleRes.body : (maleRes.body?.items || maleRes.body?.members || []);
  console.log(`   ✅ [Gender Filter] gender="male" => Fetched ${maleVoters.length} voter(s)`);

  const femaleRes = await apiRequest('/api/members?rollType=all&gender=female&limit=500');
  const femaleVoters = Array.isArray(femaleRes.body) ? femaleRes.body : (femaleRes.body?.items || femaleRes.body?.members || []);
  console.log(`   ✅ [Gender Filter] gender="female" => Fetched ${femaleVoters.length} voter(s)`);

  // Filter 3: Verification Status Filter
  const verRes = await apiRequest('/api/members?rollType=all&verificationStatus=verified&limit=500');
  const verVoters = Array.isArray(verRes.body) ? verRes.body : (verRes.body?.items || verRes.body?.members || []);
  console.log(`   ✅ [Verification Status Filter] verificationStatus="verified" => Fetched ${verVoters.length} voter(s)`);

  // Filter 4: Name Search Query Filter (q)
  if (members.length > 0) {
    const sampleFirstName = members[0].name ? members[0].name.split(' ')[0] : '';
    if (sampleFirstName) {
      const qRes = await apiRequest(`/api/members?rollType=all&q=${encodeURIComponent(sampleFirstName)}&limit=500`);
      const qVoters = Array.isArray(qRes.body) ? qRes.body : (qRes.body?.items || qRes.body?.members || []);
      console.log(`   ✅ [Search Filter (q)] q="${sampleFirstName}" => Fetched ${qVoters.length} voter(s)`);
    }
  }

  // Final Detailed Output Table of first 15 voters
  console.log('\n---------------------------------------------------------------------------------------------------------');
  console.log('                                FETCHED VOTERS FROM LIVE SERVER                                          ');
  console.log('---------------------------------------------------------------------------------------------------------');
  console.log(
    'S.No'.padEnd(6) +
    'EPIC / Voter ID'.padEnd(16) +
    'Name (नाम)'.padEnd(22) +
    'Father/Husband'.padEnd(22) +
    'House'.padEnd(8) +
    'Gender'.padEnd(8) +
    'Anubhag / Section (अनुभाग)'
  );
  console.log('---------------------------------------------------------------------------------------------------------');

  members.slice(0, 20).forEach((v, idx) => {
    const serial = String(v.voterSerial || (idx + 1)).padEnd(6);
    const epic = String(v.voterId || 'N/A').padEnd(16);
    const name = String(v.name || '').padEnd(22).slice(0, 21);
    const relative = String(v.guardianName || '').padEnd(22).slice(0, 21);
    const house = String(v.houseNumber || '-').padEnd(8).slice(0, 7);
    const gender = (v.gender === 'male' ? 'पुरुष' : v.gender === 'female' ? 'महिला' : '-').padEnd(8);
    const section = String(v.sectionName || v.location || '-').slice(0, 25);

    console.log(`${serial}${epic}${name}${relative}${house}${gender}${section}`);
  });

  if (members.length > 20) {
    console.log(`... and ${members.length - 20} more voters on live server.`);
  }
  console.log('---------------------------------------------------------------------------------------------------------\n');
}

runTest().catch(console.error);
