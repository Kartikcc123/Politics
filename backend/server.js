require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./src/config/db');
const { requestLogger } = require('./src/middleware/activityLogger');
const errorHandler = require('./src/middleware/errorHandler');
const { startMessageWorker } = require('./src/services/messageQueue');
const { restoreWebSessions } = require('./src/services/whatsappWeb');
const { uploadRoot } = require('./src/utils/uploadPath');
const { checkOcrRuntime, configureTessdataPrefix } = require('./src/utils/ocrRuntime');
const { cleanGarbageAreas } = require('./src/controllers/areaController');
const ImportJob = require('./src/models/ImportJob');
const Member = require('./src/models/Member');
const ElectoralMembership = require('./src/models/ElectoralMembership');
const { ensureMemberSearchData } = require('./src/utils/memberSearch');

configureTessdataPrefix();

async function ensureMemberIndexes() {
  try {
    const collection = Member.collection;
    const indexes = await collection.indexes();
    const voterIdIndex = indexes.find((index) => index.name === 'voterId_1');
    if (voterIdIndex && !voterIdIndex.partialFilterExpression) {
      await collection.dropIndex('voterId_1');
    }
    await collection.createIndex(
      { voterId: 1 },
      { unique: true, partialFilterExpression: { voterId: { $type: 'string' } } },
    );
  } catch (error) {
    console.error('Member index preparation failed:', error.message);
  }
}

async function ensureElectoralMembershipIndexes() {
  try {
    const collection = ElectoralMembership.collection;
    const indexes = await collection.indexes();
    const oldEpicIndex = indexes.find((index) => index.name === 'electoralList_1_epic_1');
    if (oldEpicIndex?.unique) await collection.dropIndex(oldEpicIndex.name);
    await collection.updateMany(
      { $or: [{ sourceRecordKey: { $exists: false } }, { sourceRecordKey: '' }] },
      [{ $set: {
        sourceRecordKey: {
          $cond: [
            { $gt: [{ $strLenCP: { $ifNull: ['$epic', ''] } }, 0] },
            { $concat: ['epic:', '$epic'] },
            { $concat: ['legacy:', { $toString: '$_id' }] },
          ],
        },
      } }],
    );
    await collection.createIndex(
      { electoralList: 1, sourceRecordKey: 1 },
      { unique: true, partialFilterExpression: { sourceRecordKey: { $type: 'string' } } },
    );
    await collection.createIndex({ electoralList: 1, epic: 1 });
  } catch (error) {
    console.error('Electoral membership index preparation failed:', error.message);
    throw error;
  }
}
const app = express();
const configuredOrigins = (process.env.CORS_ORIGIN || '*')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const corsOptions = {
  origin(origin, callback) {
    if (!origin || configuredOrigins.includes('*') || configuredOrigins.includes(origin)) {
      return callback(null, true);
    }
    const error = new Error(`Origin ${origin} is not allowed by CORS.`);
    error.status = 403;
    return callback(error);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type', 'Accept', 'X-Total-Chunks', 'X-Total-Bytes', 'x-total-chunks', 'x-total-bytes', 'X-Requested-With'],
  maxAge: 86400,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(uploadRoot()));
app.use('/party-logos', express.static(path.join(__dirname, 'src/public/party-logos')));
app.get('/media/s3/:key', require('./src/middleware/auth'), require('./src/controllers/mediaController').getS3);
app.get('/media/:id', require('./src/controllers/mediaController').get);

app.get('/', (req, res) => res.json({ name: 'Political Booth Management CRM API', status: 'ok' }));
// Render calls this endpoint frequently. Keep it dependency-free so a health
// probe never starts five OCR processes or marks a busy OCR server unhealthy.
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.get('/api/system/ocr', async (req, res, next) => {
  try {
    const result = await checkOcrRuntime();
    res.status(result.ok ? 200 : 503).json(result);
  } catch (error) {
    next(error);
  }
});
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/wards', require('./src/routes/wards'));
app.use('/api/areas', require('./src/routes/areas'));
app.use('/api/booths', require('./src/routes/booths'));
app.use('/api/members', requestLogger, require('./src/routes/members'));
app.use('/api/families', requestLogger, require('./src/routes/families'));
app.use('/api/parties', require('./src/routes/parties'));
app.use('/api/import', requestLogger, require('./src/routes/import'));
app.use('/api/import-previews', requestLogger, require('./src/routes/importPreviews'));
app.use('/api/import-reviews', requestLogger, require('./src/routes/importReviews'));
app.use('/api/electoral-lists', requestLogger, require('./src/routes/electoralLists'));
app.use('/api/export', require('./src/routes/export'));
app.use('/api/print', require('./src/routes/print'));
app.use('/api/activity', require('./src/routes/activity'));
app.use('/api/security', requestLogger, require('./src/routes/security'));
app.use('/api/reports', require('./src/routes/reports'));
app.use('/api/political-analytics', require('./src/routes/politicalAnalytics'));
app.use('/api/messages', requestLogger, require('./src/routes/messages'));
app.use('/api/notifications', require('./src/routes/notifications'));
app.use('/api/follow-ups', requestLogger, require('./src/routes/followUps'));
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const serverTimeoutMs = Number(process.env.UPLOAD_TIMEOUT_MINUTES || 30) * 60 * 1000;

connectDB()
  .then(async () => {
    await ensureMemberIndexes();
    await ensureElectoralMembershipIndexes();
    const garbageCleanResult = await cleanGarbageAreas();
    if (garbageCleanResult.cleanedCount) console.log('Cleaned ' + garbageCleanResult.cleanedCount + ' invalid garbage area entry/entries.');
    const indexedMembers = await ensureMemberSearchData(Member);
    if (indexedMembers) console.log('Prepared ' + indexedMembers + ' voter record(s) for easy search.');
    const staleImportMinutes = Math.max(5, Number(process.env.IMPORT_JOB_STALE_MINUTES || 15));
    const staleImportCutoff = new Date(Date.now() - staleImportMinutes * 60 * 1000);
    await ImportJob.updateMany(
      {
        status: { $in: ['uploading', 'processing'] },
        updatedAt: { $lt: staleImportCutoff },
      },
      {
        $set: {
          status: 'failed',
          stage: 'PDF import stopped before completion. Please upload the PDF again.',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      },
    );
    const server = app.listen(PORT, () => console.log(`Political Booth Management CRM API running on ${PORT}`));
    server.requestTimeout = serverTimeoutMs;
    server.headersTimeout = serverTimeoutMs + 5000;
    restoreWebSessions().catch((error) => console.error('WhatsApp restore:', error.message));
    startMessageWorker();
  })
  .catch(() => {
    console.error('API not started because MongoDB is unavailable.');
    process.exit(1);
  });











