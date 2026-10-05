const mongoose = require('mongoose');
const Member = require('../src/models/Member');

async function inspectMobiles() {
  await mongoose.connect('mongodb://187.127.173.42:27017/political_crm');
  
  const total = await Member.countDocuments({});
  const withMobile = await Member.countDocuments({ mobile: { $exists: true, $ne: '' } });
  const validMobile = await Member.countDocuments({ mobile: { $regex: /^[6-9]\d{9}$/ } });
  
  console.log({ total, withMobile, validMobile });

  const gpBreakdown = await Member.aggregate([
    {
      $group: {
        _id: '$gramPanchayat',
        total: { $sum: 1 },
        withMobile: {
          $sum: {
            $cond: [
              { $and: [{ $ne: ['$mobile', ''] }, { $ne: ['$mobile', null] }] },
              1,
              0
            ]
          }
        }
      }
    },
    { $sort: { total: -1 } }
  ]);

  console.log('Gram Panchayat Mobile Breakdown (Top 30):');
  gpBreakdown.slice(0, 35).forEach(g => {
    const pct = ((g.withMobile / g.total) * 100).toFixed(1);
    console.log(`- ${g._id || 'Unassigned'}: ${g.withMobile} / ${g.total} with mobile (${pct}%)`);
  });

  // Let's also check sample members with and without mobile
  const sampleWith = await Member.find({ mobile: { $exists: true, $ne: '' } }).limit(3).select('name voterId mobile gramPanchayat partNumber voterSerial');
  console.log('Sample members with mobile:', JSON.stringify(sampleWith, null, 2));

  await mongoose.disconnect();
}
inspectMobiles();
