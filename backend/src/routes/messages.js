const router = require('express').Router();
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const c = require('../controllers/messageController');

const canManageMessages = (req, res, next) => {
  if (!req.currentUser) return res.status(401).json({ message: 'Unauthorized' });
  if (req.currentUser.role === 'admin' || req.currentUser.permissions?.canExportData === true) {
    return next();
  }
  return res.status(403).json({ message: 'Forbidden' });
};

router.use(auth);
router.get('/templates', c.templates);
router.post('/templates', canManageMessages, c.createTemplate);
router.get('/senders', canManageMessages, c.senders);
router.post('/senders', canManageMessages, c.saveSender);
router.post('/senders/:id/connect', canManageMessages, c.connectSender);
router.get('/senders/:id/status', canManageMessages, c.senderStatus);
router.post('/senders/:id/logout', canManageMessages, c.logoutSender);
router.delete('/senders/:id', canManageMessages, c.removeSender);
router.post('/preview', canManageMessages, c.preview);
router.post('/broadcast', canManageMessages, c.broadcast);
router.post('/campaigns/:id/control', canManageMessages, c.controlCampaign);
router.get('/history', canManageMessages, c.history);

module.exports = router;


