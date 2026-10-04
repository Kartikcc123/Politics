const mongoose = require('mongoose');
const Member = require('../src/models/Member');

async function inspectPhotoUrls() {
  await mongoose.connect('mongodb://187.127.173.42:27017/political_crm');
  
  const sample1 = await Member.find({ photo: { $exists: true, $ne: '' } }).limit(5).select('photo cardImage');
  console.log('Sample photos:', sample1.map(m => ({ photo: m.photo, cardImage: m.cardImage })));

  const localhostPhotos = await Member.countDocuments({ photo: { $regex: /localhost|127\.0\.0\.1|10\.0\.2\.2/ } });
  const ipPhotos = await Member.countDocuments({ photo: { $regex: /187\.127\.173\.42/ } });
  const s3Photos = await Member.countDocuments({ photo: { $regex: /amazonaws\.com/ } });
  const relativePhotos = await Member.countDocuments({ photo: { $regex: /^\/uploads/ } });
  const base64Photos = await Member.countDocuments({ photo: { $regex: /^data:image/ } });
  const total = await Member.countDocuments({});

  console.log({
    total,
    localhostPhotos,
    ipPhotos,
    s3Photos,
    relativePhotos,
    base64Photos
  });

  // Let's test if an S3 image is publicly accessible or returns 403 Forbidden!
  if (sample1.length > 0 && sample1[0].photo) {
    const url = sample1[0].photo;
    console.log('Testing S3 URL reachability:', url);
    try {
      const https = require('https');
      https.get(url, (res) => {
        console.log('S3 Image HTTP Status Code:', res.statusCode);
        console.log('S3 Image Headers:', res.headers);
      }).on('error', (e) => {
        console.error('S3 Fetch Error:', e.message);
      });
    } catch (e) {
      console.error(e);
    }
  }

  setTimeout(() => mongoose.disconnect(), 4000);
}
inspectPhotoUrls();
