const router = require('express').Router();
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const controller = require('../controllers/memberController');
const allowRoles = require('../middleware/role');

router.use(auth);
router.get('/', controller.list);
router.get('/birthdays', controller.birthdays);
router.get('/duplicates', controller.duplicates);
router.get('/suggestions', controller.suggestions);
router.get('/filter-options', controller.filterOptions);
router.get('/location-groups', controller.locationGroups);
router.get('/location-reviews', allowRoles('admin'), controller.locationReviews);
router.post('/location-reviews/:id/resolve', allowRoles('admin'), controller.resolveLocationReview);
router.post('/bulk-location-correction', allowRoles('admin'), controller.bulkLocationCorrection);
router.delete('/bulk', controller.bulkDelete);
router.post('/bulk-delete', controller.bulkDelete);
router.delete('/', allowRoles('admin'), controller.removeAll);
router.get('/:id', controller.get);
router.post('/', upload.single('photo'), controller.create);
router.put('/:id', upload.single('photo'), controller.update);
router.delete('/:id', controller.remove);

module.exports = router;

