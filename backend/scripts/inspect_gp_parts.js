const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });
const Member = require('../src/models/Member');

async function run() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  
  // Find all distinct parts in Raipur
  const raipurParts = await Member.aggregate([
    { $match: { $or: [{ gramPanchayat: /रायपुर/i }, { village: /रायपुर/i }, { municipality: /रायपुर/i }] } },
    {
      $group: {
        _id: { part: '$partNumber', gp: '$gramPanchayat', village: '$village', source: '$sourceFile' },
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id.part': 1 } }
  ]);

  console.log('Raipur parts aggregation:');
  console.log(JSON.stringify(raipurParts, null, 2));

  // Also check part 170 specifically
  const part170 = await Member.find({ partNumber: '170' }).select('name voterId village gramPanchayat sourceFile sectionName').limit(5).lean();
  console.log('\nPart 170 sample members:');
  console.log(JSON.stringify(part170, null, 2));

  process.exit(0);
}
run();
