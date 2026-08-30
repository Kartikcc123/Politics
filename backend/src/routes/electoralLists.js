const router = require('express').Router();
const auth = require('../middleware/auth');
const controller = require('../controllers/electoralListController');

router.use(auth);
router.get('/', controller.list);
router.get('/summary', controller.summary);

module.exports = router;
