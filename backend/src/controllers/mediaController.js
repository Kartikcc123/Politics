const mongoose = require('mongoose');
    });
    if (object.ContentLength !== undefined) {
      res.set('Content-Length', String(object.ContentLength));
    }
    object.Body.on('error', next);
    return object.Body.pipe(res);
  } catch (error) {
    if (error?.name === 'NoSuchKey' || error?.$metadata?.httpStatusCode === 404) {
      return res.status(404).end();
    }
    return next(error);
  }
};

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
