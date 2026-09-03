const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { uploadFilePath, uploadPublicPath } = require('./uploadPath');
const {
  commandFromEnv,
  friendlyMissingBinaryError,
  subprocessEnv,
} = require('./ocrRuntime');

const run = (command, args) => new Promise((resolve, reject) => {
  const child = spawn(command, args, { windowsHide: true, env: subprocessEnv() });
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
  child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
  child.on('error', (error) => reject(friendlyMissingBinaryError(command, error)));
  child.on('close', (code) => {
    if (code === 0) resolve(stdout);
    else reject(new Error(stderr || `${command} exited with code ${code}`));
  });
});

const mapConcurrent = async (items, limit, worker) => {
  const results = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(Math.max(1, limit), items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(runners);
  return results;
};

const keepOnlyVoterPhotos = (workDir, photoFiles = []) => {
  const keep = new Set(photoFiles.map((file) => path.resolve(file)));
  for (const name of fs.readdirSync(workDir)) {
    const target = path.resolve(workDir, name);
    if (keep.has(target)) continue;
    fs.rmSync(target, { recursive: true, force: true });
  }
};

const looksLikeVoterText = (text) => (
  /(?:निर्वा\S*|मतदाता)\s+का\s+नाम/.test(text)
  || /\b(?:[A-Z]{3}\s*[0-9O]{7}|RJ\s*\/\s*[0-9O/]{8,})\b/i.test(text)
);

const parseTsv = (tsv) => {
  const rows = tsv.split(/\r?\n/).slice(1).map((line) => line.split('\t')).filter((parts) => parts.length >= 12);
  const words = rows.map((parts) => ({
    page: Number(parts[1]),
    block: Number(parts[2]),
    paragraph: Number(parts[3]),
    line: Number(parts[4]),
    left: Number(parts[6]),
    top: Number(parts[7]),
    width: Number(parts[8]),
    height: Number(parts[9]),
    confidence: Number(parts[10]),
    text: parts.slice(11).join('\t').trim(),
  })).filter((word) => word.text && word.confidence >= 20);
  const lines = new Map();
  for (const word of words) {
    const key = `${word.page}:${word.block}:${word.paragraph}:${word.line}`;
    if (!lines.has(key)) lines.set(key, []);
    lines.get(key).push(word);
  }
  const text = [...lines.values()]
    .sort((a, b) => a[0].top - b[0].top || a[0].left - b[0].left)
    .map((line) => line.sort((a, b) => a.left - b.left).map((word) => word.text).join(' '))
    .join('\n');
  return { text, words };
};

const pdfPageCount = async (pdfPath) => {
  const output = await run(commandFromEnv('PDFINFO_PATH', 'pdfinfo'), [pdfPath]);
  const match = output.match(/^Pages:\s+(\d+)/mi);
  if (!match) throw new Error('Could not determine PDF page count.');
  return Number(match[1]);
};

const renderPage = async (pdfPath, outputDir, pageNumber, dpi = process.env.OCR_DPI || '350') => {
  const prefix = path.join(outputDir, `render-${pageNumber}`);
  await run(commandFromEnv('PDFTOPPM_PATH', 'pdftoppm'), [
    '-png', '-singlefile', '-r', String(dpi),
    '-f', String(pageNumber), '-l', String(pageNumber), pdfPath, prefix,
  ]);
  const rendered = `${prefix}.png`;
  if (!fs.existsSync(rendered)) throw new Error(`OCR page ${pageNumber} rendering produced no image.`);
  return rendered;
};

const runPythonWorker = (pages, outputDir, arg3, arg4, options = {}) => new Promise((resolve, reject) => {
  const pageNumbers = Array.isArray(arg3) ? arg3 : (Array.isArray(arg4) ? arg4 : []);
  const onProgress = typeof arg3 === 'function' ? arg3 : (typeof arg4 === 'function' ? arg4 : null);
  const globalStartSerial = options.globalStartSerial || (typeof arg3 === 'object' && !Array.isArray(arg3) ? arg3.globalStartSerial : undefined);
  const python = process.env.PYTHON_PATH || 'python';
  const script = path.join(__dirname, '../../python/ocr_worker.py');
  const child = spawn(python, [script], {
    windowsHide: true,
    env: {
      ...subprocessEnv(),
      TESSERACT_PATH: commandFromEnv('TESSERACT_PATH', 'tesseract'),
      PYTHONIOENCODING: 'utf-8',
    },
  });
  let stdout = '';
  let stderr = '';
  let stderrPending = '';
  child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
  child.stderr.on('data', (chunk) => {
    stderrPending += chunk.toString();
    const lines = stderrPending.split(/\r?\n/);
    stderrPending = lines.pop() || '';
    for (const line of lines) {
      try {
        const event = JSON.parse(line);
        if (event.type === 'progress' || event.type === 'card_progress') {
          if (typeof onProgress === 'function') onProgress(event);
          continue;
        }
      } catch (_) {}
      stderr += `${line}\n`;
    }
  });
  child.on('error', reject);
  child.on('close', (code) => {
    if (stderrPending) stderr += stderrPending;
    if (code !== 0) return reject(new Error(stderr || `Python OCR exited with code ${code}`));
    try {
      return resolve(JSON.parse(stdout));
    } catch (error) {
      return reject(new Error(`Python OCR returned invalid JSON: ${error.message}`));
    }
  });
  child.stdin.end(JSON.stringify({ pages, pageNumbers, outputDir, globalStartSerial }));
});

const cropVoterPage = async (page, pageIndex, outputDir) => {
  const magick = commandFromEnv('IMAGEMAGICK_PATH', 'magick');
  const columns = Number(process.env.VOTER_GRID_COLUMNS || 3);
  const rows = Number(process.env.VOTER_GRID_ROWS || 10);
  const [pageWidth, pageHeight] = (await run(magick, ['identify', '-format', '%w %h', page])).trim().split(/\s+/).map(Number);
  const contentLeft = Math.round(pageWidth * Number(process.env.VOTER_GRID_LEFT_RATIO || 0.02));
  const contentTop = Math.round(pageHeight * Number(process.env.VOTER_GRID_HEADER_RATIO || 0.03));
  const cellWidth = Math.round(pageWidth * Number(process.env.VOTER_GRID_CARD_WIDTH_RATIO || 0.288));
  const cellHeight = Math.round(pageHeight * Number(process.env.VOTER_GRID_CARD_HEIGHT_RATIO || 0.086));
  const gapX = Math.round(pageWidth * Number(process.env.VOTER_GRID_GAP_X_RATIO || 0.006));
  const gapY = Math.round(pageHeight * Number(process.env.VOTER_GRID_GAP_Y_RATIO || 0.0045));
  const cells = [];
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const cellLeft = contentLeft + column * (cellWidth + gapX);
      const cellTop = contentTop + row * (cellHeight + gapY);
      const ocrTarget = path.join(outputDir, `page-${pageIndex + 1}-ocr-${row * columns + column + 1}.png`);
      const epicTarget = path.join(outputDir, `page-${pageIndex + 1}-epic-${row * columns + column + 1}.png`);
      const cellGeometry = `${Math.round(cellWidth)}x${Math.round(cellHeight)}+${cellLeft}+${cellTop}`;
      const photoLeft = Math.round(cellLeft + cellWidth * Number(process.env.VOTER_PHOTO_LEFT_RATIO || 0.74));
      const photoTop = Math.round(cellTop + cellHeight * Number(process.env.VOTER_PHOTO_TOP_RATIO || 0.27));
      const photoWidth = Math.round(cellWidth * Number(process.env.VOTER_PHOTO_WIDTH_RATIO || 0.23));
      const photoHeight = Math.round(cellHeight * Number(process.env.VOTER_PHOTO_HEIGHT_RATIO || 0.58));
      const photoTarget = path.join(outputDir, `page-${pageIndex + 1}-voter-${row * columns + column + 1}.jpg`);
      const photoGeometry = `${photoWidth}x${photoHeight}+${photoLeft}+${photoTop}`;
      const epicGeometry = `${Math.round(cellWidth * 0.43)}x${Math.round(cellHeight * 0.20)}+${Math.round(cellLeft + cellWidth * 0.55)}+${Math.round(cellTop + cellHeight * 0.055)}`;
      cells.push({
        ocr: ocrTarget,
        epic: epicTarget,
        photo: photoTarget,
        cellGeometry,
        epicGeometry,
        photoGeometry,
      });
    }
  }
  await mapConcurrent(cells, Number(process.env.IMAGE_CROP_CONCURRENCY || 6), async (cell) => Promise.all([
    run(magick, [
      page,
      '-crop', cell.cellGeometry,
      '+repage',
      '-resize', `${process.env.OCR_CARD_WIDTH || 900}x`,
      '-colorspace', 'Gray',
      '-normalize',
      '-sharpen', '0x1',
      cell.ocr,
    ]),
    run(magick, [
      page,
      '-crop', cell.epicGeometry,
      '+repage',
      '-resize', '1200x',
      '-colorspace', 'Gray',
      '-normalize',
      '-sharpen', '0x1',
      cell.epic,
    ]),
    run(magick, [page, '-crop', cell.photoGeometry, '+repage', '-quality', '88', cell.photo]),
  ]));
  return cells;
};

exports.ocrPdf = async (pdfPath, importFileName, pageRange = {}) => {
  const { onProgress, ...renderRange } = pageRange;
  const safeBase = path.basename(importFileName, path.extname(importFileName)).replace(/[^a-z0-9_-]/gi, '-');
  const workId = `${Date.now()}-${safeBase}`;
  const workDir = uploadFilePath('ocr', workId);
  fs.mkdirSync(workDir, { recursive: true });
  onProgress?.({ phase: 'rendering', processedPages: 0, totalPages: 0 });
  const pages = await renderPages(pdfPath, workDir, renderRange);
  if (!pages.length) throw new Error('OCR page rendering produced no images.');
  onProgress?.({ phase: 'ocr', processedPages: 0, totalPages: pages.length });
  if (String(process.env.USE_PYTHON_OCR || 'true').toLowerCase() !== 'false') {
    try {
      let pythonProcessedPages = 0;
      let pythonProcessedCards = 0;
      const totalCards = pages.length
        * Number(process.env.VOTER_GRID_ROWS || 10)
        * Number(process.env.VOTER_GRID_COLUMNS || 3);
      const pythonResult = await runPythonWorker(pages, workDir, (event) => {
        if (event.type === 'card_progress') {
          pythonProcessedCards += 1;
          onProgress?.({
            phase: 'ocr',
            processedPages: pythonProcessedPages,
            totalPages: pages.length,
            processedCards: pythonProcessedCards,
            totalCards,
          });
          return;
        }
        pythonProcessedPages += 1;
        onProgress?.({
          phase: 'ocr',
          processedPages: pythonProcessedPages,
          totalPages: pages.length,
          processedCards: pythonProcessedCards,
          totalCards,
        });
      });
      const records = pythonResult.records || [];
      if (records.length) {
        const headerText = pythonResult.headerText || '';
        const photos = records.flatMap((record) => [record.photo, record.cardImage]).filter(Boolean);
        keepOnlyVoterPhotos(workDir, photos);
        return {
          text: `${headerText}\n${records.map((record) => record.rawText).join('\n')}`,
          words: [],
          voterRecords: records.map((record) => ({
            ...record,
            photo: uploadPublicPath('ocr', workId, path.basename(record.photo)),
            cardImage: record.cardImage ? uploadPublicPath('ocr', workId, path.basename(record.cardImage)) : '',
          })),
          images: records.map((record) => uploadPublicPath('ocr', workId, path.basename(record.photo))),
          header: pythonResult.header || {},
          status: `Python OCR processed ${pages.length} page(s), detected page header and accepted ${records.length} confidence-checked voter record(s).`,
        };
      }
    } catch (error) {
      console.warn(`Python OCR fallback: ${error.message}`);
    }
  }
  const pageResults = [];
  const voterCells = [];
  let voterPageCount = 0;
  const tesseract = commandFromEnv('TESSERACT_PATH', 'tesseract');
  for (let pageIndex = 0; pageIndex < pages.length; pageIndex += 1) {
    const page = pages[pageIndex];
    const pageText = await run(tesseract, [
      page, 'stdout', '-l', process.env.OCR_LANGUAGES || 'hin+eng',
      '--psm', process.env.OCR_PSM || '6',
    ]);
    const pageResult = { text: pageText.trim(), words: [] };
    pageResults.push(pageResult);
    const voterLabels = (pageResult.text.match(/निर्वा\S*\s+का\s+नाम/g) || []).length;
    const unicodeVoterLabels = (pageResult.text.match(/निर्वा\S*\s+का\s+नाम/g) || []).length;
    if (Math.max(voterLabels, unicodeVoterLabels) >= Number(process.env.VOTER_PAGE_MIN_LABELS || 5)) {
      voterPageCount += 1;
      const cells = await cropVoterPage(page, pageIndex, workDir);
      const fastRecords = await mapConcurrent(
        cells,
        Number(process.env.OCR_CELL_CONCURRENCY || 4),
        async (cell) => {
          let cellText = await run(tesseract, [
            cell.ocr, 'stdout', '-l', process.env.OCR_LANGUAGES || 'hin+eng',
            '--psm', process.env.VOTER_CELL_OCR_PSM || '6',
          ]);
          const epicText = await run(tesseract, [
            cell.epic, 'stdout', '-l', 'eng',
            '--psm', '7',
            '-c', 'tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/',
          ]);
          cellText = `${epicText.trim()}\n${cellText}`;
          if (!looksLikeVoterText(cellText)) {
            const retryText = await run(tesseract, [
              cell.ocr, 'stdout', '-l', process.env.OCR_LANGUAGES || 'hin+eng',
              '--psm', '11',
            ]);
            if (looksLikeVoterText(retryText)) cellText = retryText;
          }
          return looksLikeVoterText(cellText)
            ? { text: cellText.trim(), photo: cell.photo }
            : null;
        },
      );
      voterCells.push(...fastRecords.filter(Boolean));
      onProgress?.({ phase: 'ocr', processedPages: pageIndex + 1, totalPages: pages.length });
      continue;
      for (const cell of cells) {
        let cellText = await run(tesseract, [
          cell.cell, 'stdout', '-l', process.env.OCR_LANGUAGES || 'hin+eng',
          '--psm', process.env.VOTER_CELL_OCR_PSM || '6',
        ]);
        if (looksLikeVoterText(cellText)) {
          voterCells.push({ text: cellText.trim(), photo: cell.photo });
          continue;
        }
        if (!/निर्वा\S*\s+का\s+नाम/.test(cellText)) {
          const retryText = await run(tesseract, [
            cell.cell, 'stdout', '-l', process.env.OCR_LANGUAGES || 'hin+eng',
            '--psm', '11',
          ]);
          if ((retryText.match(/नाम/g) || []).length >= (cellText.match(/नाम/g) || []).length) {
            cellText = retryText;
          }
        }
        if (/निर्वा\S*\s+का\s+नाम/.test(cellText) || (/नाम/.test(cellText) && /(?:उम्र|उप्र|लिंग)/.test(cellText))) {
          voterCells.push({ text: cellText.trim(), photo: cell.photo });
        }
      }
    }
    onProgress?.({ phase: 'ocr', processedPages: pageIndex + 1, totalPages: pages.length });
  }
  const headerText = pageResults.slice(0, 3).map((page) => page.text).join('\n');
  const voterText = voterCells.map((cell) => cell.text).join('\n');
  const photoFiles = voterCells.map((cell) => cell.photo);
  keepOnlyVoterPhotos(workDir, photoFiles);
  const photoStatus = `Skipped ${pages.length - voterPageCount} non-voter/summary page(s). Processed ${voterPageCount} voter page(s) and coordinate-matched ${photoFiles.length} voter photo crop(s).`;
  return {
    text: `${headerText}\n${voterText}`,
    words: pageResults.flatMap((page) => page.words),
    voterRecords: voterCells.map((cell) => ({
      text: cell.text,
      photo: uploadPublicPath('ocr', workId, path.basename(cell.photo)),
    })),
    images: photoFiles.map((file) => uploadPublicPath('ocr', workId, path.basename(file))),
    status: `OCR processed ${pages.length} page(s). ${photoStatus}`,
  };
};

// Render and OCR one page at a time. Keeping every rendered PNG plus multiple
// OpenCV/Tesseract page buffers alive was enough to exceed a 512 MB instance.
// A fresh Python process per page also guarantees native memory is returned to
// the OS before the next page starts.
const lowMemoryOcrPdf = async (pdfPath, importFileName, pageRange = {}) => {
  const { onProgress, firstPage, lastPage } = pageRange;
  const documentPages = await pdfPageCount(pdfPath);
  const startPage = Math.max(1, Number(firstPage) || 1);
  const endPage = Math.min(documentPages, Number(lastPage) || documentPages);
  if (startPage > endPage) throw new Error('PDF page range is invalid.');

  const totalPages = endPage - startPage + 1;
  const rows = Number(process.env.VOTER_GRID_ROWS || 10);
  const columns = Number(process.env.VOTER_GRID_COLUMNS || 3);
  const totalCards = totalPages * rows * columns;
  const safeBase = path.basename(importFileName, path.extname(importFileName))
    .replace(/[^a-z0-9_-]/gi, '-');
  const workId = `${Date.now()}-${safeBase}`;
  const workDir = uploadFilePath('ocr', workId);
  fs.mkdirSync(workDir, { recursive: true });

  const records = [];
  const headerTexts = [];
  const header = {};
  let processedCards = 0;
  let lastTrackedSerial = 0;
  for (let offset = 0; offset < totalPages; offset += 1) {
    const pageNumber = startPage + offset;
    let rendered;
    try {
      const isMaster = pageNumber === Number(process.env.OCR_MASTER_PAGE || 1);
      rendered = await renderPage(pdfPath, workDir, pageNumber, isMaster ? (process.env.OCR_MASTER_DPI || '350') : (process.env.OCR_DPI || '350'));
      onProgress?.({
        phase: 'ocr',
        processedPages: offset,
        totalPages,
        processedCards,
        totalCards,
      });
      const globalStartSerial = pageNumber >= 3
        ? (lastTrackedSerial > 0 ? lastTrackedSerial + 1 : (pageNumber - 3) * 30 + 1)
        : undefined;
      const result = await runPythonWorker(
        [rendered],
        workDir,
        [pageNumber],
        (event) => {
          if (event.type !== 'card_progress') return;
          processedCards += 1;
          onProgress?.({
            phase: 'ocr',
            processedPages: offset,
            totalPages,
            processedCards,
            totalCards,
          });
        },
        { globalStartSerial },
      );
      const pageRecs = result.records || [];
      records.push(...pageRecs);
      for (const rec of pageRecs) {
        const s = Number(rec.voterSerial);
        if (Number.isFinite(s) && s > lastTrackedSerial) {
          lastTrackedSerial = s;
        }
      }
      if (headerTexts.length < 3 && result.headerText) headerTexts.push(result.headerText);
      for (const [key, value] of Object.entries(result.header || {})) {
        if (key === 'sectionMap' && value && typeof value === 'object') {
          header.sectionMap = { ...value, ...(header.sectionMap || {}) };
          continue;
        }
        if (!header[key] && value) header[key] = value;
      }
      onProgress?.({
        phase: 'ocr',
        processedPages: offset + 1,
        totalPages,
        processedCards,
        totalCards,
      });
    } catch (error) {
      throw new Error(`OCR failed on PDF page ${pageNumber}: ${error.message}`);
    } finally {
      if (rendered) fs.rmSync(rendered, { force: true });
    }
  }

  const masterContextFields = [
    'assemblyNumber', 'assemblyName', 'partNumber', 'partName',
    'postOffice', 'policeStation', 'tehsil', 'district',
    'gramPanchayat', 'village', 'pinCode',
  ];
  const docSectionMap = header.sectionMap && typeof header.sectionMap === 'object' ? header.sectionMap : {};
  const defaultSecNum = docSectionMap['1'] ? '1' : (Object.keys(docSectionMap)[0] || '');

  let lastKnownSecNum = '';
  const inheritedRecords = records.map((record) => {
    const inherited = { ...record };
    for (const field of masterContextFields) {
      if ((inherited[field] === undefined || inherited[field] === null || String(inherited[field]).trim() === '') && header[field]) {
        inherited[field] = header[field];
      }
    }
    let secNum = String(inherited.sectionNumber || '').trim();
    if (!secNum || !docSectionMap[secNum]) {
      if (secNum && docSectionMap) {
        const matchEntry = Object.entries(docSectionMap).find(([k, v]) => v && inherited.sectionName && (v.includes(inherited.sectionName) || inherited.sectionName.includes(v)));
        if (matchEntry) secNum = matchEntry[0];
      }
      if (!secNum || !docSectionMap[secNum]) {
        if (lastKnownSecNum && docSectionMap[lastKnownSecNum]) {
          secNum = lastKnownSecNum;
        } else if (defaultSecNum) {
          secNum = defaultSecNum;
        }
      }
    }
    if (secNum && docSectionMap[secNum]) {
      inherited.sectionNumber = secNum;
      inherited.sectionName = docSectionMap[secNum];
      lastKnownSecNum = secNum;
    }
    return inherited;
  });

  const photos = inheritedRecords.flatMap((record) => [record.photo, record.cardImage]).filter(Boolean);
  keepOnlyVoterPhotos(workDir, photos);
  const headerText = headerTexts.join('\n');
  return {
    text: `${headerText}\n${inheritedRecords.map((record) => record.rawText || '').join('\n')}`,
    words: [],
    voterRecords: inheritedRecords.map((record) => ({
      ...record,
      photo: record.photo ? uploadPublicPath('ocr', workId, path.basename(record.photo)) : '',
      cardImage: record.cardImage ? uploadPublicPath('ocr', workId, path.basename(record.cardImage)) : '',
    })),
    images: photos.map((photo) => uploadPublicPath('ocr', workId, path.basename(photo))),
    header,
    status: `Low-memory OCR processed ${totalPages} page(s) sequentially and accepted ${records.length} confidence-checked voter record(s).`,
  };
};

exports.ocrPdf = lowMemoryOcrPdf;
