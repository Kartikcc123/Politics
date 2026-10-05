const https = require('https');
const PDFDocument = require('pdfkit');
const fs = require('fs');

const url = 'https://political-data-2026.s3.ap-south-1.amazonaws.com/1790429307375-photo-SNE1307115-1790429307375-48347c.jpg';

function normalizeImageBuffer(value) {
  if (!value) return null;
  const buffer = Buffer.isBuffer(value)
    ? value
    : value?.buffer
      ? Buffer.from(value.buffer)
      : Buffer.from(value);
  if (buffer.length < 8) return null;
  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8;
  const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
  console.log('normalize check:', { length: buffer.length, isJpeg, isPng, b0: buffer[0], b1: buffer[1] });
  return isJpeg || isPng ? buffer : null;
}

function fetchHttpBuffer(url) {
  return new Promise((resolve) => {
    https.get(url, { timeout: 8000 }, (res) => {
      console.log('statusCode:', res.statusCode);
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        resolve(normalizeImageBuffer(buf));
      });
    }).on('error', (e) => {
      console.error('error:', e);
      resolve(null);
    });
  });
}

async function run() {
  const buf = await fetchHttpBuffer(url);
  console.log('buf length:', buf?.length);

  const doc = new PDFDocument();
  const out = fs.createWriteStream('test_img_render.pdf');
  doc.pipe(out);
  try {
    doc.image(buf, 50, 50, { fit: [48, 62] });
    console.log('doc.image succeeded!');
  } catch (e) {
    console.error('doc.image failed:', e);
  }
  doc.end();
  out.on('finish', () => console.log('PDF finished with image!'));
}
run();
