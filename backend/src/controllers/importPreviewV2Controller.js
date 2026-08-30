const XLSX = require('xlsx');
const ImportPreview = require('../models/ImportPreview');
const ImportReview = require('../models/ImportReview');
const Member = require('../models/Member');
const Area = require('../models/Area');
const { normalizeEpic, isValidEpic } = require('../utils/epic');

const targets = [
  'name', 'surname', 'mobile', 'altMobile', 'voterId', 'guardianName',
  'houseNumber', 'address', 'location', 'village', 'gramPanchayat', 'tehsil',
  'areaName', 'caste', 'subCaste', 'organizationPost', 'occupation',
  'education', 'supportLevel', 'assemblyNumber', 'assemblyName', 'partNumber',
];

const guess = (header) => {
  const key = String(header).toLowerCase().replace(/[\s_-]/g, '');
  const aliases = {
    name: ['name', 'fullname', 'नाम'],
    surname: ['surname', 'lastname', 'उपनाम'],
    mobile: ['mobile', 'phone', 'मोबाइल'],
    voterId: ['voterid', 'epic', 'मतदातापहचान'],
    guardianName: ['guardian', 'father', 'husband', 'पिता'],
    address: ['address', 'पता'],
    village: ['village', 'गांव', 'गाँव'],
    tehsil: ['tehsil', 'तहसील'],
    areaName: ['area', 'पंचायत', 'नगरपालिका', 'क्षेत्र'],
    caste: ['caste', 'जाति'],
    organizationPost: ['post', 'designation', 'पद'],
  };
  return Object.entries(aliases).find(([, values]) => values.some((value) => key.includes(value)))?.[0] || '';
};

const rowsFrom = (preview) => {
  const workbook = XLSX.readFile(preview.filePath);
  return XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: '' });
};

const mapRows = (rows, mapping, corrections = {}) => rows.map((row, index) => {
  const item = {};
  for (const [source, target] of Object.entries(mapping || {})) {
    if (target && targets.includes(target)) item[target] = row[source];
  }
  Object.assign(item, corrections[String(index + 2)] || {});
  item.voterId = normalizeEpic(item.voterId);
  item.mobile = String(item.mobile || '').replace(/\D/g, '').slice(-10);
  return item;
});

const analyze = async (mapped) => {
  const epics = mapped.map((row) => row.voterId).filter(isValidEpic);
  const mobiles = mapped.map((row) => row.mobile).filter(Boolean);
  const existing = await Member.find({
    $or: [{ voterId: { $in: epics } }, { mobile: { $in: mobiles } }],
  }).select('voterId mobile').lean();
  const existingEpics = new Set(existing.map((item) => item.voterId));
  const existingMobiles = new Set(existing.map((item) => item.mobile).filter(Boolean));
  const counts = new Map();
  for (const epic of epics) counts.set(epic, (counts.get(epic) || 0) + 1);
  return {
    total: mapped.length,
    validEpic: epics.length,
    invalidEpic: mapped.filter((row) => !isValidEpic(row.voterId)).length,
    updates: epics.filter((epic) => existingEpics.has(epic)).length,
    creates: epics.filter((epic) => !existingEpics.has(epic)).length,
    fileDuplicates: [...counts.values()].filter((count) => count > 1).reduce((sum, count) => sum + count, 0),
    mobileDuplicates: mapped.filter((row) => row.mobile && existingMobiles.has(row.mobile)).length,
    invalidRows: mapped.map((row, index) => ({
      row: index + 2,
      name: row.name,
      voterId: row.voterId,
      mobile: row.mobile,
      areaName: row.areaName,
      organizationPost: row.organizationPost,
    })).filter((row) => !isValidEpic(row.voterId)).slice(0, 100),
  };
};

exports.preview = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Excel/CSV file required' });
    const workbook = XLSX.readFile(req.file.path);
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: '' });
    const headers = rows.length ? Object.keys(rows[0]) : [];
    const mapping = Object.fromEntries(headers.map((header) => [header, guess(header)]));
    const preview = await ImportPreview.create({
      filename: req.file.originalname,
      filePath: req.file.path,
      headers,
      sampleRows: rows.slice(0, 20),
      rowCount: rows.length,
      createdBy: req.currentUser._id,
      expiresAt: new Date(Date.now() + 86400000),
    });
    res.json({
      previewId: preview._id,
      filename: preview.filename,
      headers,
      targets,
      suggestedMapping: mapping,
      sampleRows: preview.sampleRows,
      summary: await analyze(mapRows(rows, mapping)),
    });
  } catch (error) { next(error); }
};

exports.validate = async (req, res, next) => {
  try {
    const preview = await ImportPreview.findOne({ _id: req.params.id, createdBy: req.currentUser._id });
    if (!preview) return res.status(404).json({ message: 'Preview expired or not found' });
    res.json(await analyze(mapRows(rowsFrom(preview), req.body.mapping, req.body.corrections)));
  } catch (error) { next(error); }
};

exports.commit = async (req, res, next) => {
  try {
    const preview = await ImportPreview.findOne({ _id: req.params.id, createdBy: req.currentUser._id });
    if (!preview) return res.status(404).json({ message: 'Preview expired or not found' });
    const ward = req.currentUser.role === 'ward_head' ? req.currentUser.assignedWard?._id || req.currentUser.assignedWard : req.body.ward;
    const booth = req.currentUser.role === 'booth' ? req.currentUser.assignedBooth?._id || req.currentUser.assignedBooth : req.body.booth;
    if (!ward || !booth) return res.status(400).json({ message: 'Ward and booth are required.' });
    const mapped = mapRows(rowsFrom(preview), req.body.mapping, req.body.corrections);
    const seen = new Set();
    let created = 0; let updated = 0; let reviewRequired = 0; let duplicateSkipped = 0;
    for (const item of mapped) {
      if (!item.name || !isValidEpic(item.voterId)) {
        await ImportReview.create({
          sourceType: preview.filename.toLowerCase().endsWith('.csv') ? 'csv' : 'excel',
          sourceFile: preview.filename,
          reason: !item.name ? 'Name missing' : 'EPIC missing or invalid',
          suggestedData: item, ward, booth, createdBy: req.currentUser._id,
        });
        reviewRequired += 1;
        continue;
      }
      if (seen.has(item.voterId)) { duplicateSkipped += 1; continue; }
      seen.add(item.voterId);
      if (item.areaName) {
        const escaped = String(item.areaName).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const area = await Area.findOne({ name: new RegExp(`^${escaped}$`, 'i'), active: true });
        if (area) item.area = area._id;
      }
      delete item.areaName;
      const existing = await Member.findOne({ voterId: item.voterId });
      if (existing) {
        Object.assign(existing, { ...item, voterId: existing.voterId, updatedBy: req.currentUser._id });
        await existing.save();
        updated += 1;
      } else {
        await Member.create({ ...item, ward, booth, createdBy: req.currentUser._id, updatedBy: req.currentUser._id });
        created += 1;
      }
    }
    await preview.deleteOne();
    res.json({ created, updated, reviewRequired, duplicateSkipped, total: mapped.length });
  } catch (error) { next(error); }
};
