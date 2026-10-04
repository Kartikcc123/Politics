require('dotenv').config();
const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const mongoose = require('mongoose');

async function checkS3Cards() {
  console.log('Checking AWS S3 bucket for card images...');
  
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !process.env.AWS_S3_BUCKET) {
    console.log('AWS S3 credentials not fully set in local .env, check VPS .env');
    return;
  }

  const s3 = new S3Client({
    region: process.env.AWS_REGION || 'ap-south-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
  });

  const cmd = new ListObjectsV2Command({
    Bucket: process.env.AWS_S3_BUCKET,
    MaxKeys: 30
  });

  const res = await s3.send(cmd);
  console.log(`Bucket: ${process.env.AWS_S3_BUCKET}`);
  console.log(`Sample S3 objects (first 30):`);
  let cardCount = 0;
  let photoCount = 0;
  for (const obj of (res.Contents || [])) {
    console.log(` - ${obj.Key} (${Math.round(obj.Size / 1024)} KB)`);
    if (obj.Key.includes('card-')) cardCount++;
    if (obj.Key.includes('photo-')) photoCount++;
  }
  console.log(`\nSample count: cards=${cardCount}, photos=${photoCount}`);
}

checkS3Cards();
