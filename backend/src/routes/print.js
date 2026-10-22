const router = require('express').Router();
const auth = require('../middleware/auth');
const permission = require('../middleware/permission');
const controller = require('../controllers/printController');
const exportController = require('../controllers/exportController');

const upload = require('../middleware/upload');

router.get('/members.pdf', auth, permission('canPrintProfiles'), controller.printMembers);
router.post('/members.pdf', auth, permission('canPrintProfiles'), controller.printMembers);
router.post('/upload-banner', auth, upload.single('banner'), controller.uploadBanner);
router.get('/members.xlsx', auth, permission('canExportData'), exportController.membersXlsx);
router.post('/members.xlsx', auth, permission('canExportData'), exportController.membersXlsx);

module.exports = router;

