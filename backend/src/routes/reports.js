const router = require('express').Router();
const auth = require('../middleware/auth');
const permission = require('../middleware/permission');
const c = require('../controllers/reportController');

router.get('/dashboard', auth, permission('canViewReports'), c.dashboard);

module.exports = router;
