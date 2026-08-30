const router = require('express').Router();
const auth = require('../middleware/auth');
const c = require('../controllers/activityController');

router.get('/', auth, c.list);

module.exports = router;
