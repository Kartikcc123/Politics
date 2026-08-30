const router = require('express').Router();
const auth = require('../middleware/auth');
const permission = require('../middleware/permission');
const controller = require('../controllers/printController');

router.get('/members.pdf', auth, permission('canPrintProfiles'), controller.printMembers);

module.exports = router;

