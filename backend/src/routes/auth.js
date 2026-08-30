const router = require('express').Router();
const { body } = require('express-validator');
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const controller = require('../controllers/authController');

router.post('/login', controller.login);
router.post('/register', (req, res, next) => {
  if (process.env.ALLOW_PUBLIC_REGISTER !== 'true') {
    return res.status(403).json({ message: 'Public registration is disabled. Use admin user management.' });
  }
  next();
}, [
  body('name').notEmpty(),
  body('email').isEmail(),
  body('password').isLength({ min: 6 }),
], controller.register);
router.get('/me', auth, controller.me);
router.get('/users', auth, role('admin'), controller.listUsers);
router.get('/users/:id/work-summary', auth, role('admin'), controller.userWorkSummary);
router.post('/users', auth, role('admin'), controller.register);
router.put('/users/:id', auth, role('admin'), controller.updateUser);
router.delete('/users/:id', auth, role('admin'), controller.removeUser);

module.exports = router;
