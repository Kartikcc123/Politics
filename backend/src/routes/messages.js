const router = require('express').Router();
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const c = require('../controllers/messageController');

router.use(auth);
router.get('/templates', c.templates);
router.post('/templates', role('admin'), c.createTemplate);
router.get('/senders', role('admin'), c.senders);
router.post('/senders', role('admin'), c.saveSender);
router.post('/senders/:id/connect', role('admin'), c.connectSender);
router.get('/senders/:id/status', role('admin'), c.senderStatus);
router.post('/senders/:id/logout', role('admin'), c.logoutSender);
router.delete('/senders/:id', role('admin'), c.removeSender);
router.post('/preview', role('admin'), c.preview);
router.post('/broadcast', role('admin'), c.broadcast);
router.post('/campaigns/:id/control', role('admin'), c.controlCampaign);
router.get('/history', c.history);

module.exports = router;

