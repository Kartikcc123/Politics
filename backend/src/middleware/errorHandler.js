module.exports = (err, req, res, next) => {
  console.error(err);
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      message: `File is too large. Maximum upload size is ${process.env.MAX_UPLOAD_MB || 250} MB.`,
    });
  }
  if (err.code === 11000 && err.keyPattern?.voterId) {
    return res.status(409).json({
      message: 'इस EPIC number का voter पहले से मौजूद है। उसी profile में जानकारी update करें।',
    });
  }
  const status = err.status || 500;
  res.status(status).json({
    message: err.message || 'Server error',
    errors: err.errors,
  });
};

