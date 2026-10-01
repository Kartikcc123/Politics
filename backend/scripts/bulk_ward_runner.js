const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { ocrWardPdf } = require('../src/utils/wardPdfOcr');

const TARGET_HOST = process.env.TARGET_HOST || '187.127.173.42';
const TARGET_PORT = process.env.TARGET_PORT ? parseInt(process.env.TARGET_PORT, 10) : 5003;
const IS_HTTPS = TARGET_PORT === 443;

const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 20 });
const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 20 });

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
      agent: IS_HTTPS ? httpsAgent : httpAgent,
      timeout: 120000
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); } catch(e) { resolve({ status: res.statusCode, raw: d }); }
      });
    });
    req.on('timeout', () => { req.destroy(new Error('ETIMEDOUT')); });
    req.on('error', reject);
    if (bodyData) req.write(bodyData);
    req.end();
  });
}

async function loginAdmin() {
  try {
    const res = await apiRequest('/api/auth/login', 'POST', JSON.stringify({
      email: process.env.ADMIN_EMAIL || 'admin@crm.com',
      password: process.env.ADMIN_PASSWORD || 'admin123'
    }));
    if (res.status === 200 && res.body?.token) {
      return res.body.token;
    }
  } catch (err) {
    console.error('⚠️ Admin login failed:', err.message);
  }
  return null;
}

async function runBulkWardUpload() {
  const folderPath = process.argv[2] || 'D:\\Randeep Trivedi Voter list\\Ward PDFs';
  console.log('========================================================================');
  console.log('🏛️ BULK WARD PDF AUTO-UPLOADER & OCR RUNNER');
  console.log('========================================================================\n');
  console.log(`Target Folder: ${folderPath}`);
  console.log(`Server:        ${TARGET_HOST}:${TARGET_PORT}\n`);

  if (!fs.existsSync(folderPath)) {
    console.error(`❌ Folder not found: ${folderPath}`);
    console.log('💡 Usage: node backend/scripts/bulk_ward_runner.js "<Folder_Path_With_Ward_PDFs>"');
    process.exit(1);
  }

  const allFiles = fs.readdirSync(folderPath).filter(f => f.toLowerCase().endsWith('.pdf'));
  console.log(`📁 Found ${allFiles.length} Ward PDF files in folder.\n`);

  if (allFiles.length === 0) {
    console.log('No PDF files found to upload.');
    process.exit(0);
  }

  const token = await loginAdmin();
  if (!token) {
    console.log('⚠️ Running in direct server mode without token.');
  }

  let successCount = 0;
  let totalVotersUploaded = 0;

  for (let i = 0; i < allFiles.length; i++) {
    const fileName = allFiles[i];
    const fullPath = path.join(folderPath, fileName);
    console.log(`\n------------------------------------------------------------------------`);
    console.log(`📄 [${i + 1}/${allFiles.length}] Processing: ${fileName}`);
    console.log(`------------------------------------------------------------------------`);

    const startTime = Date.now();
    try {
      const ocrResult = await ocrWardPdf(fullPath, fileName, {
        onProgress: (p) => {
          if (p.phase === 'ocr' && p.processedPages % 5 === 0) {
            process.stdout.write(`   OCR Page: ${p.processedPages}/${p.totalPages}...\r`);
          }
        }
      });

      const records = ocrResult.records || [];
      const header = ocrResult.header || {};
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);

      console.log(`\n✅ OCR Finished in ${duration}s! Extracted ${records.length} voters.`);
      console.log(`   GP: ${header.gramPanchayat || 'N/A'} | Ward: ${header.wardNumber || 'N/A'} | Village: ${header.village || 'N/A'}`);

      if (records.length > 0) {
        console.log(`🚀 Sending ${records.length} voters to VPS Database...`);
        const payload = JSON.stringify({
          header,
          members: records
        });

        const uploadRes = await apiRequest('/api/import/voters-direct', 'POST', payload, token);
        if (uploadRes.status === 200 || uploadRes.status === 201) {
          console.log(`🎉 SUCCESS: ${records.length} voters imported/merged into DB!`);
          successCount++;
          totalVotersUploaded += records.length;
        } else {
          console.error(`❌ Upload returned status ${uploadRes.status}:`, uploadRes.body || uploadRes.raw);
        }
      }
    } catch (err) {
      console.error(`❌ Error processing ${fileName}:`, err.message);
    }
  }

  console.log('\n========================================================================');
  console.log('📊 BULK WARD UPLOAD SUMMARY');
  console.log('========================================================================');
  console.log(`• Total PDFs Processed:     ${allFiles.length}`);
  console.log(`• Successful Uploads:       ${successCount}`);
  console.log(`• Total Ward Voters Merged: ${totalVotersUploaded.toLocaleString()}`);
  console.log('========================================================================\n');
}

runBulkWardUpload().catch(err => {
  console.error('Fatal error in bulk ward runner:', err);
  process.exit(1);
});
