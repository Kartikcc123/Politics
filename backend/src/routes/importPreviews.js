const router = require('express').Router();
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const controller = require('../controllers/importPreviewV2Controller');

router.use(auth);
router.post('/', upload.single('file'), controller.preview);
router.post('/:id/validate', controller.validate);
router.post('/:id/commit', controller.commit);

module.exports = router;


