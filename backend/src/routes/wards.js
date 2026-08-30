const router = require('express').Router();
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const c = require('../controllers/wardController');

router.use(auth);
router.get('/', c.list);
router.post('/', role('admin'), c.create);
router.put('/:id', role('admin'), c.update);
router.delete('/:id', role('admin'), c.remove);

module.exports = router;
