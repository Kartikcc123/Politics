const router = require('express').Router();
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const controller = require('../controllers/importReviewController');

router.use(auth, role('admin'));
router.get('/', controller.list);
router.post('/:id/resolve', controller.resolve);
router.post('/:id/ignore', controller.ignore);

module.exports = router;
