const { GetObjectCommand, S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');

let s3Client = null;

if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && process.env.AWS_S3_BUCKET) {
  s3Client = new S3Client({
    region: process.env.AWS_REGION || 'ap-south-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
  });
}

/**
 * Uploads a local file to S3 and returns the public URL.
 * @param {string} filePath - Absolute or relative path to the local file
 * @param {string} contentType - MIME type of the file
 * @returns {Promise<string|null>} - Returns the S3 URL if successful, or null if S3 is not configured
 */
const uploadToS3 = async (filePath, contentType) => {
  if (!s3Client) return null;

  const fileName = `${Date.now()}-${path.basename(filePath)}`;
  const fileStream = fs.createReadStream(filePath);

  const command = new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: fileName,
    Body: fileStream,
    ContentType: contentType,
  });

  await s3Client.send(command);

  // Return the public URL
  const region = process.env.AWS_REGION || 'ap-south-1';
  return `https://${process.env.AWS_S3_BUCKET}.s3.${region}.amazonaws.com/${fileName}`;
};

const isS3Configured = () => s3Client !== null;

const getFromS3 = async (key) => {
  if (!s3Client) return null;
  return s3Client.send(new GetObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: String(key || ''),
  }));
};

module.exports = {
  uploadToS3,
  isS3Configured,
  getFromS3,
};
