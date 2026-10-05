const mongoose = require('mongoose');
const MONGO_URI = 'mongodb://187.127.173.42:27017/political_crm';
const Member = require('../src/models/Member');

async function check() {
  await mongoose.connect(MONGO_URI);
  
  // Find members in parts 186, 188, 207
  const members = await Member.aggregate([
    { $match: { partNumber: { $in: ['186', '188', '207'] } } },
    { $group: {
      _id: { partNumber: '$partNumber', gramPanchayat: '$gramPanchayat', village: '$village', tehsil: '$tehsil' },
      count: { $sum: 1 }
    } }
  ]);
  console.log('Parts 186, 188, 207 aggregation:', members);

  // Check how many members have gramPanchayat: 'रायपुर' across different parts
  const raipurGpParts = await Member.aggregate([
    { $match: { gramPanchayat: 'रायपुर' } },
    { $group: {
      _id: '$partNumber',
      count: { $sum: 1 }
    } },
    { $sort: { count: -1 } }
  ]);
  console.log('Parts having gramPanchayat == "रायपुर":', raipurGpParts);

  await mongoose.disconnect();
}

check().catch(console.error);
