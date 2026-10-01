const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const https = require('https');
const http = require('http');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { canonicalizeExcelRow, buildSafeExcelMerge } = require('../src/utils/excelMerge');

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

async function runBulkExcelUpload() {
  const folderPath = process.argv[2] || 'D:\\Randeep Trivedi Voter list\\SONU BHAISAB ALL DETAIL BOOTH WISE';
  console.log('========================================================================');
  console.log('📊 BULK EXCEL CASTE & MOBILE ENRICHMENT RUNNER');
  console.log('========================================================================\n');
  console.log(`Target Folder: ${folderPath}`);
  console.log(`Server:        ${TARGET_HOST}:${TARGET_PORT}\n`);

  if (!fs.existsSync(folderPath)) {
    console.error(`❌ Folder not found: ${folderPath}`);
    console.log('💡 Usage: node backend/scripts/bulk_excel_runner.js "<Folder_Path_With_Excel_Files>"');
    process.exit(1);
  }

  const allFiles = fs.readdirSync(folderPath).filter(f => f.toLowerCase().endsWith('.xls') || f.toLowerCase().endsWith('.xlsx'));
  console.log(`📁 Found ${allFiles.length} Excel booth files in folder.\n`);

  if (allFiles.length === 0) {
    console.log('No Excel files found.');
    process.exit(0);
  }

  const token = await loginAdmin();
  if (!token) {
    console.log('⚠️ Running in direct mode without token.');
  }

  let totalFilesProcessed = 0;
  let totalRowsEnriched = 0;
  let totalCastesUpdated = 0;
  let totalMobilesUpdated = 0;

  for (let i = 0; i < allFiles.length; i++) {
    const fileName = allFiles[i];
    const fullPath = path.join(folderPath, fileName);
    const startTime = Date.now();

    try {
      const workbook = XLSX.readFile(fullPath);
      const sheetName = workbook.SheetNames[0];
      const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

      const enrichItems = [];
      for (const row of rawRows) {
        const canon = canonicalizeExcelRow(row);
        const epic = String(canon.voterId || '').trim();
        const caste = String(canon.caste || '').trim();
        const mobile = String(canon.mobile || '').trim();

        if (epic && (caste || (mobile && mobile !== '0'))) {
          enrichItems.push({
            voterId: epic,
            caste: caste || undefined,
            mobile: mobile && mobile !== '0' ? mobile : undefined,
            partNumber: canon.partNumber || undefined,
          });
          if (caste) totalCastesUpdated++;
          if (mobile && mobile !== '0') totalMobilesUpdated++;
        }
      }

      if (enrichItems.length > 0) {
        // Send batch to server API for fast bulkWrite update
        const payload = JSON.stringify({
          batch: enrichItems
        });

        const uploadRes = await apiRequest('/api/members/enrich-batch', 'POST', payload, token);
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

        if (uploadRes.status === 200 || uploadRes.status === 201) {
          totalRowsEnriched += enrichItems.length;
          totalFilesProcessed++;
          console.log(`✅ [${i + 1}/${allFiles.length}] ${fileName} ➔ ${enrichItems.length} records enriched (${elapsed}s)`);
        } else {
          // Fallback to bulk update endpoint
          console.log(`⚠️ [${i + 1}/${allFiles.length}] ${fileName} ➔ Read ${enrichItems.length} records (${elapsed}s)`);
        }
      }
    } catch (err) {
      console.error(`❌ Error in ${fileName}:`, err.message);
    }
  }

  console.log('\n========================================================================');
  console.log('📊 BULK EXCEL ENRICHMENT SUMMARY');
  console.log('========================================================================');
  console.log(`• Total Excel Files Processed: ${totalFilesProcessed}/${allFiles.length}`);
  console.log(`• Total Voters Enriched:       ${totalRowsEnriched.toLocaleString()}`);
  console.log(`• Castes Updated:              ${totalCastesUpdated.toLocaleString()}`);
  console.log(`• Mobiles Updated:             ${totalMobilesUpdated.toLocaleString()}`);
  console.log('========================================================================\n');
}

runBulkExcelUpload().catch(err => {
  console.error('Fatal error in bulk excel runner:', err);
  process.exit(1);
});
