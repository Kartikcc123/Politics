const mongoose = require('mongoose');
const MediaAsset = require('../models/MediaAsset');
const { getFromS3 } = require('../utils/s3');

exports.get = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).end();
    }
    const asset = await MediaAsset.findById(req.params.id).select('+data');
    if (!asset?.data) return res.status(404).end();
    const data = Buffer.from(asset.data);
    res.set({
      'Content-Type': asset.contentType || 'image/jpeg',
      'Content-Length': data.length,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    });
    return res.send(data);
  } catch (error) {
    return next(error);
  }
};

exports.getS3 = async (req, res, next) => {
  try {
    const rawKey = req.params[0] || req.params.key || '';
    const key = decodeURIComponent(rawKey);
    if (!key) return res.status(404).end();

    const s3Object = await getFromS3(key);
    if (!s3Object || !s3Object.Body) return res.status(404).end();

    res.set({
      'Content-Type': s3Object.ContentType || 'image/jpeg',
      'Content-Length': s3Object.ContentLength,
      'Cache-Control': 'public, max-age=31536000, immutable',
    });

    s3Object.Body.pipe(res);
  } catch (error) {
    if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
      return res.status(404).end();
    }
    return next(error);
  }
};

