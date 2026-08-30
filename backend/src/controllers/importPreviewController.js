const XLSX = require('xlsx');
const ImportPreview = require('../models/ImportPreview');
const Member = require('../models/Member');
const ImportReview = require('../models/ImportReview');
const Area = require('../models/Area');
const { normalizeEpic, isValidEpic } = require('../utils/epic');

const targets = [
  'name', 'surname', 'mobile', 'altMobile', 'voterId', 'guardianName',
  'houseNumber', 'address', 'location', 'village', 'gramPanchayat', 'tehsil',
  'caste', 'subCaste', 'organizationPost', 'occupation', 'education',
  'supportLevel', 'assemblyNumber', 'assemblyName', 'partNumber', 'areaName',
];

const guess = (header) => {
  const key = String(header).toLowerCase().replace(/[\s_-]/g, '');
  const aliases = {
    name: ['name', 'fullname', 'नाम'],
    surname: ['surname', 'lastname', 'उपनाम'],
    mobile: ['mobile', 'phone', 'मोबाइल'],
    voterId: ['voterid', 'epic', 'मतदातापहचानपत्र'],
    guardianName: ['guardianname', 'fatherhusband', 'पिताकानाम'],
    address: ['address', 'पता'],
    village: ['village', 'गांव', 'गाँव'],
    tehsil: ['tehsil', 'तहसील'],
    caste: ['caste', 'जाति'],
    areaName: ['area', 'क्षेत्र', 'पंचायत', 'नगरपालिका'],
    organizationPost: ['post', 'designation', 'पद'],
  };
  return Object.entries(aliases).find(([, values]) => values.some((value) => key.includes(value)))?.[0] || '';
};

const mapRows = (rows, mapping, corrections = {}) => rows.map((row, index) => {
  const item = {};
  for (const [source, target] of Object.entries(mapping || {})) {
    if (target && targets.includes(target)) item[target] = row[source];
  }
  Object.assign(item, corrections[String(index + 2)] || corrections[index + 2] || {});
  item.voterId = normalizeEpic(item.voterId);
  return item;
});

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
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
    const mapped = mapRows(rows, mapping);
    const epics = mapped.map((row) => row.voterId).filter(isValidEpic);
    const existing = await Member.find({ voterId: { $in: epics } }).select('voterId').lean();
    const existingSet = new Set(existing.map((item) => item.voterId));
    res.json({
      previewId: preview._id,
      filename: preview.filename,
      headers,
      targets,
      suggestedMapping: mapping,
      sampleRows: preview.sampleRows,
      summary: {
        total: rows.length,
        validEpic: epics.length,
        invalidEpic: mapped.filter((row) => !isValidEpic(row.voterId)).length,
        updates: epics.filter((epic) => existingSet.has(epic)).length,
        creates: epics.filter((epic) => !existingSet.has(epic)).length,
      fileDuplicates,
      mobileDuplicates: mapped.filter((row) => existingMobiles.has(String(row.mobile || '').replace(/\D/g, ''))).length,
        fileDuplicates,
        mobileDuplicates: mapped.filter((row) => existingMobiles.has(String(row.mobile || '').replace(/\D/g, ''))).length,
      },
    });
  } catch (error) { next(error); }
};

exports.validate = async (req, res, next) => {
  try {
    const preview = await ImportPreview.findOne({ _id: req.params.id, createdBy: req.currentUser._id });
    if (!preview) return res.status(404).json({ message: 'Preview expired or not found' });
    const workbook = XLSX.readFile(preview.filePath);
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: '' });
    const mapped = mapRows(rows, req.body.mapping, req.body.corrections);
    const epics = mapped.map((row) => row.voterId).filter(isValidEpic);
    const existing = await Member.find({ voterId: { $in: epics } }).select('voterId').lean();
    const existingSet = new Set(existing.map((item) => item.voterId));
    res.json({
      total: rows.length,
      invalidEpic: mapped.filter((row) => !isValidEpic(row.voterId)).length,
      updates: epics.filter((epic) => existingSet.has(epic)).length,
      creates: epics.filter((epic) => !existingSet.has(epic)).length,
      fileDuplicates,
      mobileDuplicates: mapped.filter((row) => existingMobiles.has(String(row.mobile || '').replace(/\D/g, ''))).length,
      invalidRows: mapped.map((row, index) => ({ row: index + 2, name: row.name, voterId: row.voterId, mobile: row.mobile, areaName: row.areaName, organizationPost: row.organizationPost }))
        .filter((row) => !isValidEpic(row.voterId)).slice(0, 100),
    });
  } catch (error) { next(error); }
};

exports.commit = async (req, res, next) => {
  try {
    const preview = await ImportPreview.findOne({ _id: req.params.id, createdBy: req.currentUser._id });
    if (!preview) return res.status(404).json({ message: 'Preview expired or not found' });
    const ward = req.currentUser.role === 'ward_head' ? req.currentUser.assignedWard?._id || req.currentUser.assignedWard : req.body.ward;
    const booth = req.currentUser.role === 'booth' ? req.currentUser.assignedBooth?._id || req.currentUser.assignedBooth : req.body.booth;
    if (!ward || !booth) return res.status(400).json({ message: 'Ward and booth are required before import.' });
    const workbook = XLSX.readFile(preview.filePath);
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: '' });
    const mapped = mapRows(rows, req.body.mapping, req.body.corrections);
    let created = 0; let updated = 0; let reviewRequired = 0;
    for (const item of mapped) {
      if (!item.name || !isValidEpic(item.voterId)) {
        await ImportReview.create({ sourceType: preview.filename.toLowerCase().endsWith('.csv') ? 'csv' : 'excel', sourceFile: preview.filename, reason: !item.name ? 'Name missing' : 'EPIC missing or invalid', suggestedData: item, ward, booth, createdBy: req.currentUser._id });
        reviewRequired += 1;
        continue;
      }
      if (item.areaName) {
        const area = await Area.findOne({ name: new RegExp(`^${String(item.areaName).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'), active: true });
        if (area) item.area = area._id;
      }
      delete item.areaName;
      const existing = await Member.findOne({ voterId: item.voterId });
      if (existing) {
        Object.assign(existing, { ...item, voterId: existing.voterId, updatedBy: req.currentUser._id });
        await existing.save(); updated += 1;
      } else {
        await Member.create({ ...item, ward, booth, createdBy: req.currentUser._id, updatedBy: req.currentUser._id, sourceDocument: { type: preview.filename.toLowerCase().endsWith('.csv') ? 'csv' : 'excel', file: preview.filename } });
        created += 1;
      }
    }
    await preview.deleteOne();
    res.json({ created, updated, reviewRequired, total: rows.length });
  } catch (error) { next(error); }
};

module.exports.mapPreviewRows = mapRows;



