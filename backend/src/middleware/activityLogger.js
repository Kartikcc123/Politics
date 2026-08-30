const Activity = require('../models/Activity');

exports.writeActivity = async ({ req, action, module, entityId, before, after }) => {
  try {
    await Activity.create({
      actor: req.currentUser?._id,
      action,
      module,
      entityId,
      before,
      after,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
  } catch (error) {
    console.error('Activity log failed:', error.message);
  }
};

exports.requestLogger = (req, res, next) => {
  res.on('finish', () => {
    if (!req.currentUser || req.method === 'GET' || res.statusCode >= 400) return;
    exports.writeActivity({
      req,
      action: `${req.method} ${req.originalUrl}`,
      module: String(req.baseUrl || req.originalUrl || 'unknown').replace('/api/', ''),
    });
  });
  next();
};

