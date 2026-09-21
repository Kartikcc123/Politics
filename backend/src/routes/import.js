const router = require('express').Router();
const auth = require('../middleware/auth');
const permission = require('../middleware/permission');
const express = require('express');
const upload = require('../middleware/upload');
const c = require('../controllers/importController');

router.get('/active', auth, c.getActiveImport);
router.get('/status/:uploadId', auth, c.importStatus);
router.put('/members/pdf/chunks/:uploadId/:index', auth, permission('canImportData'),
  express.raw({ type: 'application/octet-stream', limit: '10mb' }), c.uploadPdfChunk);
router.post('/members/json', auth, permission('canImportData'), c.importMembersJson);
router.post('/members', auth, permission('canImportData'), c.trackUploadProgress, upload.single('file'), c.importMembers);
router.post('/members/pdf', auth, permission('canImportData'), c.trackUploadProgress, upload.single('file'), c.importPdfMembers);
router.post('/cleanup-duplicates', auth, permission('canImportData'), c.cleanupDuplicates);
router.post('/reset-all-voters', auth, permission('canImportData'), c.resetAllVoters);
router.post('/restore-voters', auth, permission('canImportData'), c.restoreCorruptedVoters);

module.exports = router;


