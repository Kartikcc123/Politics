const router = require('express').Router();
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const controller = require('../controllers/securityController');

router.use(auth, role('admin'));
router.post('/restore', controller.restore);
router.get('/audit-summary', controller.auditSummary);

module.exports = router;
