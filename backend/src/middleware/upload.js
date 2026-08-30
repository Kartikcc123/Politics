const fs = require('fs');
const multer = require('multer');
const { uploadRoot } = require('../utils/uploadPath');

const root = uploadRoot();
fs.mkdirSync(root, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, root),
  filename: (req, file, cb) => {
    const originalName = String(file?.originalname || file?.filename || 'upload');
    const safeName = originalName.replace(/[^a-z0-9.]/gi, '-').toLowerCase();
    cb(null, `${Date.now()}-${safeName}`);
  },
});

module.exports = multer({
  storage,
  limits: {
    fileSize: Number(process.env.MAX_UPLOAD_MB || 250) * 1024 * 1024,
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    const originalName = String(file?.originalname || file?.filename || '');
    const fieldName = String(file?.fieldname || '');
    const mimeType = String(file?.mimetype || '');

    if (fieldName === 'photo') {
      const imageByName = /\.(jpg|jpeg|png|webp|heic|heif)$/i.test(originalName);
      const imageByMime = /^image\//i.test(mimeType);
      if (!imageByName && !imageByMime) {
        const error = new Error('Only image files are allowed for contact photo.');
        error.status = 400;
        return cb(error);
      }
      return cb(null, true);
    }

    const allowed = /\.(pdf|xlsx|xls|csv)$/i.test(originalName);
    if (!allowed) {
      const error = new Error('Only PDF, Excel and CSV files are allowed.');
      error.status = 400;
      return cb(error);
    }
    cb(null, true);
  },
});
