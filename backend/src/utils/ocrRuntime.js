const { spawn } = require('child_process');

const fs = require('fs');
const path = require('path');

// Auto-load backend .env if not already loaded by caller
try {
  require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
} catch (_) {}

const isWindows = process.platform === 'win32';
const isWindowsExecutablePath = (value = '') => /^[a-z]:\\/i.test(String(value));

const defaultWindowsCandidates = {
  PDFINFO_PATH: [
    'C:\\poppler\\Library\\bin\\pdfinfo.exe',
    'C:\\poppler\\poppler-24.08.0\\Library\\bin\\pdfinfo.exe',
  ],
  PDFTOPPM_PATH: [
    'C:\\poppler\\Library\\bin\\pdftoppm.exe',
    'C:\\poppler\\poppler-24.08.0\\Library\\bin\\pdftoppm.exe',
  ],
  PDFIMAGES_PATH: [
    'C:\\poppler\\Library\\bin\\pdfimages.exe',
    'C:\\poppler\\poppler-24.08.0\\Library\\bin\\pdfimages.exe',
  ],
  TESSERACT_PATH: [
    'C:\\poppler\\tesseract\\tesseract.exe',
    'C:\\Program Files\\Tesseract-OCR\\tesseract.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Programs\\Tesseract-OCR\\tesseract.exe'),
  ],
};

const getBundledTessdataPath = () => {
  const candidates = [
    path.resolve(__dirname, '../../tessdata'),
    path.resolve(__dirname, '../../.ocr-tessdata'),
    'C:\\poppler\\tesseract\\tessdata',
    path.join(process.env.LOCALAPPDATA || '', 'Programs\\Tesseract-OCR\\tessdata'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, 'hin.traineddata'))) {
      return candidate;
    }
  }
  return null;
};

const configureTessdataPrefix = () => {
  const current = process.env.TESSDATA_PREFIX;
  if (!current || (!isWindows && isWindowsExecutablePath(current)) || !fs.existsSync(path.join(current, 'hin.traineddata'))) {
    const bundled = getBundledTessdataPath();
    if (bundled) {
      process.env.TESSDATA_PREFIX = bundled;
    }
  }
  return process.env.TESSDATA_PREFIX;
};

const resolveWindowsPython = () => {
  const candidates = [
    process.env.PYTHON_PATH,
    'C:\\Users\\DELL\\AppData\\Local\\Programs\\Python\\Python311\\python.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Programs\\Python\\Python311\\python.exe'),
    path.join(process.env.LOCALAPPDATA || '', 'Programs\\Python\\Python310\\python.exe'),
    path.join(process.env.LOCALAPPDATA || '', 'Programs\\Python\\Python312\\python.exe'),
    'C:\\Python311\\python.exe',
    'C:\\Program Files\\Python311\\python.exe',
  ].filter(Boolean);
  for (const c of candidates) {
    if (isWindowsExecutablePath(c) && fs.existsSync(c)) {
      return c;
    }
  }
  return process.env.PYTHON_PATH || 'python';
};

const pythonCommand = () => {
  if (isWindows) return resolveWindowsPython();
  return process.env.PYTHON_PATH || 'python3';
};

const commandFromEnv = (envName, fallback) => {
  const configured = process.env[envName];
  if (configured) {
    if (!isWindows && isWindowsExecutablePath(configured)) return fallback;
    return configured;
  }
  if (isWindows && defaultWindowsCandidates[envName]) {
    for (const candidate of defaultWindowsCandidates[envName]) {
      if (fs.existsSync(candidate)) return candidate;
    }
  }
  return fallback;
};

const subprocessEnv = () => {
  configureTessdataPrefix();
  const env = { ...process.env };
  if (isWindows) {
    const existingPath = env.Path || env.PATH || '';
    const pyExe = resolveWindowsPython();
    const pyDir = isWindowsExecutablePath(pyExe) ? path.dirname(pyExe) : '';
    const extraDirs = [
      'C:\\poppler\\Library\\bin',
      'C:\\poppler\\tesseract',
      pyDir,
      pyDir ? path.join(pyDir, 'Scripts') : '',
      path.join(process.env.LOCALAPPDATA || '', 'Programs\\Tesseract-OCR'),
    ].filter((dir) => dir && fs.existsSync(dir));
    if (extraDirs.length) {
      const extra = extraDirs.join(path.delimiter);
      const combined = `${extra}${path.delimiter}${existingPath}`;
      env.Path = combined;
      env.PATH = combined;
    }
  }
  // Keep each OCR subprocess within a predictable native-memory budget.
  for (const name of ['OMP_NUM_THREADS', 'OPENBLAS_NUM_THREADS', 'MKL_NUM_THREADS', 'NUMEXPR_NUM_THREADS', 'VECLIB_MAXIMUM_THREADS']) {
    env[name] = String(process.env.OCR_NATIVE_THREADS || 1);
  }
  env.OMP_THREAD_LIMIT = String(process.env.OCR_NATIVE_THREADS || 1);
  if (!isWindows && isWindowsExecutablePath(env.TESSDATA_PREFIX)) delete env.TESSDATA_PREFIX;
  return env;
};

const friendlyMissingBinaryError = (command, originalError) => {
  if (originalError?.code !== 'ENOENT') return originalError;
  const error = new Error(
    `OCR dependency missing: "${command}" was not found on the server. `
    + 'Deploy the backend with Docker, or install Poppler/Tesseract/ImageMagick and set PDFTOPPM_PATH, PDFIMAGES_PATH, TESSERACT_PATH, and IMAGEMAGICK_PATH.',
  );
  error.code = originalError.code;
  error.status = 500;
  return error;
};

const runCommand = (command, args = []) => new Promise((resolve, reject) => {
  const child = spawn(command, args, { windowsHide: true, env: subprocessEnv() });
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
  child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
  child.on('error', (error) => reject(friendlyMissingBinaryError(command, error)));
  child.on('close', (code) => {
    if (code === 0) resolve({ stdout, stderr });
    else reject(new Error(stderr || `${command} exited with code ${code}`));
  });
});

const checkCommand = async (name, command, args) => {
  try {
    const result = await runCommand(command, args);
    return {
      name,
      command,
      ok: true,
      output: `${result.stdout}${result.stderr}`.trim().split(/\r?\n/)[0] || 'ok',
    };
  } catch (error) {
    return {
      name,
      command,
      ok: false,
      error: error.message,
    };
  }
};

const checkOcrRuntime = async () => {
  const checks = await Promise.all([
    checkCommand('pdftoppm', commandFromEnv('PDFTOPPM_PATH', 'pdftoppm'), ['-v']),
    checkCommand('pdfimages', commandFromEnv('PDFIMAGES_PATH', 'pdfimages'), ['-v']),
    checkCommand('tesseract', commandFromEnv('TESSERACT_PATH', 'tesseract'), ['--list-langs']),
    checkCommand('imagemagick', commandFromEnv('IMAGEMAGICK_PATH', 'magick'), ['-version']),
    checkCommand('python', process.env.PYTHON_PATH || 'python3', ['--version']),
  ]);
  return {
    ok: checks.every((check) => check.ok),
    checks,
  };
};

module.exports = {
  commandFromEnv,
  pythonCommand,
  friendlyMissingBinaryError,
  subprocessEnv,
  runCommand,
  checkOcrRuntime,
  configureTessdataPrefix,
};
