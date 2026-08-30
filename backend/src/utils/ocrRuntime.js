const { spawn } = require('child_process');

const fs = require('fs');
const path = require('path');

const isWindows = process.platform === 'win32';
const isWindowsExecutablePath = (value = '') => /^[a-z]:\\/i.test(String(value));

const getBundledTessdataPath = () => {
  const candidates = [
    path.resolve(__dirname, '../../tessdata'),
    path.resolve(__dirname, '../../.ocr-tessdata'),
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

const commandFromEnv = (envName, fallback) => {
  const configured = process.env[envName];
  if (!configured) return fallback;
  if (!isWindows && isWindowsExecutablePath(configured)) return fallback;
  return configured;
};

const subprocessEnv = () => {
  configureTessdataPrefix();
  const env = { ...process.env };
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
  friendlyMissingBinaryError,
  subprocessEnv,
  runCommand,
  checkOcrRuntime,
  configureTessdataPrefix,
};
