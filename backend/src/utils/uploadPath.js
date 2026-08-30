const path = require('path');

function uploadRoot() {
  const configured = process.env.UPLOAD_PATH || 'uploads';
  return path.isAbsolute(configured)
    ? configured
    : path.join(__dirname, '../../', configured);
}

function uploadPublicPath(...parts) {
  return ['/uploads', ...parts.map((part) => String(part).replace(/^[/\\]+|[/\\]+$/g, ''))]
    .filter(Boolean)
    .join('/');
}

function uploadFilePath(...parts) {
  return path.join(uploadRoot(), ...parts);
}

function resolveUploadPublicPath(publicPath) {
  const relative = String(publicPath || '').replace(/^[/\\]+/, '').replace(/^uploads[/\\]?/, '');
  return path.join(uploadRoot(), relative);
}

module.exports = {
  uploadRoot,
  uploadPublicPath,
  uploadFilePath,
  resolveUploadPublicPath,
};
