const router = require('express').Router();
const auth = require('../middleware/auth');
const controller = require('../controllers/politicalAnalyticsController');

router.get('/dashboard', auth, controller.dashboard);

module.exports = router;
