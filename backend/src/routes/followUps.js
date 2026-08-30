const router = require('express').Router();
const auth = require('../middleware/auth');
const controller = require('../controllers/followUpController');

router.use(auth);
router.get('/', controller.list);
router.get('/dashboard', controller.dashboard);
router.post('/:memberId', controller.create);
router.put('/:memberId/:followUpId', controller.update);

module.exports = router;

