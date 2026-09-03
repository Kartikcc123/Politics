const router = require('express').Router();
const auth = require('../middleware/auth');
const permission = require('../middleware/permission');
const express = require('express');
const upload = require('../middleware/upload');
const c = require('../controllers/importController');

router.get('/status/:uploadId', auth, c.importStatus);
router.put('/members/pdf/chunks/:uploadId/:index', auth, permission('canImportData'),
  express.raw({ type: 'application/octet-stream', limit: '10mb' }), c.uploadPdfChunk);
router.post('/members/pdf/chunks/:uploadId/complete', auth, permission('canImportData'), c.completePdfChunks);
router.post('/members', auth, permission('canImportData'), c.trackUploadProgress, upload.single('file'), c.importMembers);
router.post('/members/pdf', auth, permission('canImportData'), c.trackUploadProgress, upload.single('file'), c.importPdfMembers);

module.exports = router;


