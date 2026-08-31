const fs = require('fs');
const path = require('path');
const https = require('https');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoiNmEzMzAxZjBiM2YyNmYxYzMyMmRhNjZjIiwicm9sZSI6ImFkbWluIn0sImlhdCI6MTc4ODE1OTUzNywiZXhwIjoxNzg4NzY0MzM3fQ.gfAkgcIvtqe6JOUuN6cZPPu1wTxJatGAHNbqL_9IN4g';
const pdfPath = path.resolve(__dirname, '../../sample-data/DOC-20260424-WA0137..pdf');

console.log('PDF Path:', pdfPath);
console.log('File Exists:', fs.existsSync(pdfPath));

const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
const stat = fs.statSync(pdfPath);

const header = '--' + boundary + '\r\n' +
  'Content-Disposition: form-data; name="file"; filename="DOC-20260424-WA0137..pdf"\r\n' +
  'Content-Type: application/pdf\r\n\r\n';
const footer = '\r\n--' + boundary + '--\r\n';

const contentLength = Buffer.byteLength(header) + stat.size + Buffer.byteLength(footer);

console.log(`Uploading Bheeta PDF (${(stat.size / (1024 * 1024)).toFixed(2)} MB) to https://politics.mathxmedia.tech/api/import/members/pdf ...`);

const req = https.request({
  hostname: 'politics.mathxmedia.tech',
  path: '/api/import/members/pdf',
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'multipart/form-data; boundary=' + boundary,
    'Content-Length': contentLength
  }
}, (res) => {
  let buf = '';
  res.on('data', d => buf += d);
  res.on('end', () => {
    console.log('\n--- Upload HTTP Status:', res.statusCode);
    try {
      console.log('Upload Response:', JSON.parse(buf));
    } catch(e) {
      console.log('Upload Raw Output:', buf.substring(0, 1000));
    }
  });
});

req.on('error', (err) => console.error('Upload Request Error:', err));

const stream = fs.createReadStream(pdfPath);
req.write(header);
stream.pipe(req, { end: false });
stream.on('end', () => {
  req.write(footer);
  req.end();
  console.log('File upload stream sent.');
});
