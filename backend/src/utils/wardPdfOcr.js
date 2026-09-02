const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { uploadFilePath } = require('./uploadPath');
const { commandFromEnv, friendlyMissingBinaryError, subprocessEnv } = require('./ocrRuntime');

const run = (command, args) => new Promise((resolve, reject) => {
  const child = spawn(command, args, { windowsHide: true, env: subprocessEnv() });
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
  child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
  child.on('error', (error) => reject(friendlyMissingBinaryError(command, error)));
  child.on('close', (code) => (code === 0 ? resolve(stdout) : reject(new Error(stderr || `${command} exited with ${code}`))));
});

const pageCount = async (pdfPath) => {
  const output = await run(commandFromEnv('PDFINFO_PATH', 'pdfinfo'), [pdfPath]);
  const match = output.match(/^Pages:\s+(\d+)/mi);
  if (!match) throw new Error('Ward PDF page count could not be detected.');
  return Number(match[1]);
};

const epicHints = (text) => {
  const values = [];
  const lines = String(text || '').split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const nextLine = lines[index + 1] || '';
    const cells = line.trim().split(/\s{4,}/).map((cell) => cell.trim()).filter(Boolean);
    const parsed = cells.map((cell) => cell.match(/^([ESR])?\s*(\d{1,4})(?:\s+((?:[A-Z]{3}\d{7})|(?:RJ\/\d+\/\d+\/\d+)))?\s*$/i));
    const voterHeader = parsed.some((match) => match?.[3]) || /(?:नाम|नरम)\s*:/.test(nextLine);
    if (!voterHeader) continue;
    for (const match of parsed) {
      if (!match) continue;
      values.push({
        serial: match[2],
        epic: (match[3] || '').toUpperCase(),
        action: match[1] ? 'delete' : 'upsert',
      });
    }
  }

  const pattern = /(?:^|\s)([ESR])?\s*(\d{1,4})\s+((?:[A-Z]{3}\d{7})|(?:RJ\/\d+\/\d+\/\d+))/gim;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const item = { serial: match[2], epic: match[3].toUpperCase(), action: match[1] ? 'delete' : 'upsert' };
    const existing = values.find((value) => value.serial === item.serial && value.epic === item.epic);
    if (!existing) values.push(item);
    else if (item.action === 'delete') existing.action = 'delete';
  }
  values.sort((a, b) => Number(a.serial) - Number(b.serial));
  return values;
};

const runWorker = (payload, onProgress) => new Promise((resolve, reject) => {
  const child = spawn(process.env.PYTHON_PATH || 'python', [path.join(__dirname, '../../python/ward_ocr_worker.py')], {
    windowsHide: true,
    env: {
      ...subprocessEnv(),
      TESSERACT_PATH: commandFromEnv('TESSERACT_PATH', 'tesseract'),
      PYTHONIOENCODING: 'utf-8',
    },
  });
  let stdout = '';
  let pending = '';
  let stderr = '';
  child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
  child.stderr.on('data', (chunk) => {
    pending += chunk.toString();
    const lines = pending.split(/\r?\n/);
    pending = lines.pop() || '';
    for (const line of lines) {
      try {
        const event = JSON.parse(line);
        if (event.type === 'progress') { onProgress?.(event); continue; }
      } catch (_) {}
      stderr += `${line}\n`;
    }
  });
  child.on('error', reject);
  child.on('close', (code) => {
    if (code !== 0) return reject(new Error(stderr || `Ward OCR worker exited with ${code}`));
    try { return resolve(JSON.parse(stdout)); } catch (error) { return reject(new Error(`Ward OCR returned invalid JSON: ${error.message}`)); }
  });
  child.stdin.end(JSON.stringify(payload));
});

exports.ocrWardPdf = async (pdfPath, importFileName, { onProgress } = {}) => {
  const totalPages = await pageCount(pdfPath);
  const safeBase = path.basename(importFileName, path.extname(importFileName)).replace(/[^a-z0-9_-]/gi, '-');
  const workDir = uploadFilePath('ward-ocr', `${Date.now()}-${safeBase}`);
  fs.mkdirSync(workDir, { recursive: true });
  const pages = [];
  const pageNumbers = [];
  const hints = {};
  const embeddedPages = [];
  let embeddedCover = '';
  const pdftoppm = commandFromEnv('PDFTOPPM_PATH', 'pdftoppm');
  const pdftotext = commandFromEnv('PDFTOTEXT_PATH', 'pdftotext');
  const dpi = String(process.env.WARD_OCR_DPI || 200);
  onProgress?.({ phase: 'rendering', processedPages: 0, totalPages });
  for (let page = 1; page <= totalPages; page += 1) {
    const prefix = path.join(workDir, `render-${page}`);
    await run(pdftoppm, ['-png', '-singlefile', '-r', dpi, '-f', String(page), '-l', String(page), pdfPath, prefix]);
    const rendered = `${prefix}.png`;
    if (!fs.existsSync(rendered)) throw new Error(`Ward PDF page ${page} could not be rendered.`);
    pages.push(rendered);
    pageNumbers.push(page);
    try {
      const embedded = await run(pdftotext, ['-f', String(page), '-l', String(page), '-layout', pdfPath, '-']);
      if (page === 1) embeddedCover = embedded;
      embeddedPages.push(embedded);
      hints[String(page)] = epicHints(embedded);
    } catch (_) {
      hints[String(page)] = [];
    }
    onProgress?.({ phase: 'rendering', processedPages: page, totalPages });
  }
  const photoDir = path.join(workDir, 'photos');
  fs.mkdirSync(photoDir, { recursive: true });
  let processed = 0;
  const result = await runWorker({ pages, pageNumbers, epicHints: hints, photoOutputDir: photoDir }, (event) => {
    processed += 1;
    onProgress?.({ phase: 'ocr', processedPages: processed, totalPages });
  });

  // Convert cropped photo disk paths to public web URLs
  const { uploadPublicPath } = require('./uploadPath');
  for (const record of result.records || []) {
    if (record.photo && fs.existsSync(record.photo)) {
      const relPath = path.relative(workDir, record.photo).replace(/\\/g, '/');
      const baseSub = path.basename(workDir);
      record.photo = `/uploads/ward-ocr/${baseSub}/${relPath}`;
    }
  }

  const assemblyHint = embeddedCover.match(/(?:^|\s)(1\d{2})\s*-/m);
  const wardPartHint = embeddedCover.match(/:\s*(\d{1,3})\s+[^:\n]{1,120}:\s*(\d{1,3})\s*$/m);
  result.header ||= {};
  if (assemblyHint) result.header.assemblyNumber = assemblyHint[1];
  if (wardPartHint) {
    result.header.wardNumber ||= wardPartHint[1];
    result.header.partNumber = wardPartHint[2];
  }
  const yearHint = embeddedCover.match(/\b(20\d{2})\b/);
  if (yearHint) result.header.year = Number(yearHint[1]);
  // Do not expose clearly garbled Latin OCR as a Hindi assembly name. The
  // assembly number remains authoritative and master data may resolve its name.
  if (result.header.assemblyName && !/[\u0900-\u097F]/.test(result.header.assemblyName)) {
    result.header.assemblyName = '';
  }
  const voterRecords = (result.records || []).filter((record) => (
    record.voterId
    || (record.voterSerial && record.age && (record.houseNumber || record.guardianName))
  ));
  const deletedEpics = new Set(
    voterRecords.filter((record) => record.sourceAction === 'delete').map((record) => record.voterId),
  );
  const uniqueRecords = new Map();
  for (const record of voterRecords) {
    if (record.sourceAction === 'delete') continue;
    const key = record.voterId || `blank:${record.pageNumber}:${record.voterSerial}:${record.cell}`;
    uniqueRecords.set(key, record);
  }
  result.records = [...uniqueRecords.values()].filter(
    (record) => !record.voterId || !deletedEpics.has(record.voterId),
  );
  const expectedEpicHints = new Map();
  for (const page of pageNumbers) {
    for (const hint of hints[String(page)] || []) {
      if (!hint.epic) continue;
      if (hint.action === 'delete') expectedEpicHints.delete(hint.epic);
      else expectedEpicHints.set(hint.epic, hint);
    }
  }
  const detectedEpics = new Set(result.records.map((record) => record.voterId).filter(Boolean));
  for (const [epic, hint] of expectedEpicHints) {
    if (detectedEpics.has(epic)) continue;
    result.records.push({
      voterSerial: hint.serial || '', voterId: epic, name: '', guardianName: '', relationType: '',
      houseNumber: '', age: null, gender: '', pageNumber: null, cell: null, photo: '', rawText: '',
      ocrNeedsReview: true, ocrReviewReasons: ['ward_card_ocr_missing'], sourceAction: 'review',
    });
  }
  const summaryMatches = [...embeddedPages.join('\n').matchAll(/\(I\+II-III\)[^\r\n]*?(\d+)\s*$/gm)];
  const expectedVoterCount = Number(summaryMatches.at(-1)?.[1] || 0);
  if (expectedVoterCount > result.records.length) {
    const missing = expectedVoterCount - result.records.length;
    for (let index = 1; index <= missing; index += 1) {
      result.records.push({
        voterSerial: '', voterId: '', name: '', guardianName: '', relationType: '',
        houseNumber: '', age: null, gender: '', pageNumber: null, cell: null, photo: '',
        rawText: '', ocrNeedsReview: true,
        ocrReviewReasons: ['ward_record_not_detected'], sourceAction: 'review',
      });
    }
  }
  if (expectedVoterCount) result.header.expectedVoterCount = expectedVoterCount;
  for (const record of result.records) {
    record.municipality = result.header.municipality || record.municipality || '';
    record.assemblyNumber = result.header.assemblyNumber || record.assemblyNumber || '';
    record.assemblyName = result.header.assemblyName || '';
    record.wardNumber = result.header.wardNumber || record.wardNumber || '';
    record.partNumber = result.header.partNumber || record.partNumber || '';
  }
  fs.rmSync(workDir, { recursive: true, force: true });
  return {
    ...result,
    type: 'municipal',
    status: `Ward OCR processed ${totalPages} page(s) and detected ${result.records?.length || 0} voter card(s).`,
  };
};

exports._epicHints = epicHints;
