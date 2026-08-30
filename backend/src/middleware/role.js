module.exports = (...roles) => (req, res, next) => {
  if (!req.currentUser || !roles.includes(req.currentUser.role)) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  next();
};
