const router = require('express').Router();
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const permission = require('../middleware/permission');
const c = require('../controllers/exportController');

router.get('/members.xlsx', auth, permission('canExportData'), c.membersXlsx);
router.get('/members.profiles.pdf', auth, permission('canExportData'), c.bulkProfilesPdf);
router.get('/backup', auth, role('admin'), c.backup);
router.get('/members/:id.pdf', auth, permission('canPrintProfiles'), c.profilePdf);

module.exports = router;

