module.exports = (permission) => (req, res, next) => {
  const user = req.currentUser;
  if (!user) return res.status(401).json({ message: 'Unauthorized' });
  if (
    user.role === 'admin'
    || user.permissions?.[permission] === true
    || user.permissions?.[permission] === undefined
    || user[permission] === true
  ) {
    return next();
  }
  return res.status(403).json({ message: `Permission denied: ${permission}` });
};
