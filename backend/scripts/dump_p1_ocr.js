const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { commandFromEnv, subprocessEnv } = require('../src/utils/ocrRuntime');

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { windowsHide: true, env: subprocessEnv() });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    child.on('close', (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(stderr || `${command} exited with code ${code}`));
    });
  });
}

async function main() {
  const pdf112 = 'D:\\Randeep Trivedi Voter list\\Final Publication 21.02.2026\\2026-EROLLGEN-S20-179-SIR-FinalRoll-Revision1-HIN-112.pdf';
  const tmpDir = path.resolve(__dirname, '../scratch/dump_p1');
  fs.mkdirSync(tmpDir, { recursive: true });

  const pdftoppm = commandFromEnv('PDFTOPPM_PATH', 'pdftoppm');
  await run(pdftoppm, ['-png', '-r', '200', '-f', '1', '-l', '1', pdf112, path.join(tmpDir, 'page')]);

  const tesseract = commandFromEnv('TESSERACT_PATH', 'tesseract');
  const imgPath = path.join(tmpDir, 'page-01.png');
  const ocrTxt = await run(tesseract, [imgPath, 'stdout', '-l', 'hin+eng', '--psm', '6']);
  console.log('--- RAW OCR OF PAGE 1 ---');
  console.log(ocrTxt);
}

main().catch(console.error);
