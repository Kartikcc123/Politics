module.exports = (permission) => (req, res, next) => {
  if (req.currentUser.role === 'admin' || req.currentUser.permissions?.[permission]) return next();
  return res.status(403).json({ message: `Permission denied: ${permission}` });
};
