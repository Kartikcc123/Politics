const router = require('express').Router();
const auth = require('../middleware/auth');
const c = require('../controllers/notificationController');

router.get('/today', auth, c.today);

module.exports = router;
