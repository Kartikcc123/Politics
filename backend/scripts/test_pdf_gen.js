const mongoose = require('mongoose');
const fs = require('fs');
const Member = require('../src/models/Member');
const printController = require('../src/controllers/printController');

async function testPdf() {
  await mongoose.connect('mongodb://187.127.173.42:27017/political_crm');

  const req = {
    currentUser: { role: 'admin' },
    query: {
      gramPanchayat: 'थला',
      wardNumber: '1',
      limit: '50',
      photo: 'true',
      includeCoverPage: 'true'
    }
  };

  const res = fs.createWriteStream('test_voter_output.pdf');
  res.setHeader = (k, v) => {};

  await printController.printMembers(req, res, (err) => {
    if (err) console.error('Print error:', err);
  });

  res.on('finish', async () => {
    console.log('PDF finished successfully! Size:', fs.statSync('test_voter_output.pdf').size, 'bytes');
    await mongoose.disconnect();
  });
}
testPdf();
