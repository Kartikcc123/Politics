const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async function auth(req, res, next) {
  try {
    const header = req.header('Authorization') || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'Authentication required' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'change-this-secret');
    const user = await User.findById(decoded.user.id).populate('assignedWard assignedBooth');
    if (!user || !user.active) return res.status(401).json({ message: 'Invalid user' });
    req.currentUser = user;
    req.user = { id: user._id };
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};
