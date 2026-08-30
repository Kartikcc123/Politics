const router = require('express').Router();
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const controller = require('../controllers/areaController');
const multer = require('multer');
const masterUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.use(auth);
router.get('/', controller.list);
router.get('/tree', controller.tree);
router.post('/master/import', role('admin'), masterUpload.single('file'), controller.importMaster);
router.post('/clean-invalid', role('admin'), controller.cleanInvalid);
router.post('/', role('admin'), controller.create);
router.delete('/all', role('admin'), controller.removeAll);
router.put('/:id', role('admin'), controller.update);
router.delete('/:id', role('admin'), controller.remove);

module.exports = router;

