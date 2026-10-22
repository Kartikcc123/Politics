const router = require('express').Router();
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const permission = require('../middleware/permission');
const c = require('../controllers/exportController');

const printController = require('../controllers/printController');

router.get('/members.xlsx', auth, permission('canExportData'), c.membersXlsx);
router.post('/members.xlsx', auth, permission('canExportData'), c.membersXlsx);
router.get('/members.profiles.pdf', auth, permission('canExportData'), c.bulkProfilesPdf);
router.get('/members.pdf', auth, permission('canPrintProfiles'), printController.printMembers);
router.post('/members.pdf', auth, permission('canPrintProfiles'), printController.printMembers);
router.get('/backup', auth, role('admin'), c.backup);
router.get('/members/:id.pdf', auth, permission('canPrintProfiles'), c.profilePdf);

module.exports = router;

