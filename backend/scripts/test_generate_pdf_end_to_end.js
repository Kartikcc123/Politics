const fs = require('fs');
const path = require('path');
const http = require('http');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../.env') });

const { printMembers } = require('../src/controllers/printController');

async function testPdf() {
  const req = {
    query: {
      limit: '30',
      columns: '2',
      paperSize: 'A4',
      orientation: 'portrait',
      includeCover: 'true',
      title: 'भींटा - वार्ड 2 मतदाता सूची'
    },
    currentUser: { role: 'admin' }
  };

  const chunks = [];
  const res = {
    setHeader: () => {},
    on: () => {},
    once: () => {},
    emit: () => {},
    write: (c) => chunks.push(c),
    end: (c) => {
      if (c) chunks.push(c);
      const full = Buffer.concat(chunks);
      console.log('Generated PDF size:', full.length, 'bytes');
      fs.writeFileSync(path.join(__dirname, '../scratch_test_out.pdf'), full);
      console.log('PDF saved successfully!');
      process.exit(0);
    }
  };

  const next = (err) => {
    console.error('Error in PDF generation:', err);
    process.exit(1);
  };

  const mongoose = require('mongoose');
  await mongoose.connect(process.env.MONGO_URI);
  await printMembers(req, res, next);
}

testPdf();
