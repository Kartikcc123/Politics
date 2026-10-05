const mongoose = require('mongoose');
const Member = require('../src/models/Member');
const https = require('https');

async function check() {
  await mongoose.connect('mongodb://187.127.173.42:27017/political_crm');

  const v1 = await Member.findOne({ voterId: 'SNE1307115' }).lean();
  const v2 = await Member.findOne({ voterId: 'SNE1576719' }).lean();

  console.log('Voter 1 (मीना देवी):', {
    name: v1?.name,
    voterId: v1?.voterId,
    photo: v1?.photo,
    gramPanchayat: v1?.gramPanchayat,
    wardNumber: v1?.wardNumber
  });

  console.log('Voter 2 (संजू कुमारी):', {
    name: v2?.name,
    voterId: v2?.voterId,
    photo: v2?.photo,
    gramPanchayat: v2?.gramPanchayat,
    wardNumber: v2?.wardNumber
  });

  if (v1?.photo) {
    console.log('Testing fetch for v1.photo:', v1.photo);
    https.get(v1.photo, (res) => {
      console.log('Status code for v1.photo:', res.statusCode, res.headers['content-type'], res.headers['content-length']);
    }).on('error', (e) => console.error('Fetch error for v1:', e));
  }

  await mongoose.disconnect();
}
check();
