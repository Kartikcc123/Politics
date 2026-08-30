const router = require('express').Router();
const auth = require('../middleware/auth');
const c = require('../controllers/familyController');

router.use(auth);
router.get('/', c.list);
router.get('/summary', c.summary);
router.post('/', c.create);
router.post('/rebuild', c.rebuildFromMembers);
router.get('/:id', c.get);
router.put('/:id', c.update);
router.delete('/:id', c.remove);

module.exports = router;

