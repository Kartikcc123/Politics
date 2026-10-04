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

function runPython(scriptPath, inputPayload) {
  return new Promise((resolve, reject) => {
    const pythonCmd = commandFromEnv('PYTHON_PATH', 'python');
    const child = spawn(pythonCmd, [scriptPath], { windowsHide: true, env: subprocessEnv() });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    child.on('close', (code) => {
      if (code === 0) {
        try {
          resolve(JSON.parse(stdout));
        } catch (e) {
          resolve(stdout);
        }
      } else {
        reject(new Error(stderr || `Python exited with code ${code}`));
      }
    });
    child.stdin.write(JSON.stringify(inputPayload));
    child.stdin.end();
  });
}

async function testPdf(pdfPath) {
  console.log('='.repeat(60));
  console.log('Testing PDF:', path.basename(pdfPath));
  console.log('='.repeat(60));

  const tmpDir = path.resolve(__dirname, '../scratch/test_village_' + Date.now());
  fs.mkdirSync(tmpDir, { recursive: true });

  try {
    const pdftoppm = commandFromEnv('PDFTOPPM_PATH', 'pdftoppm');
    console.log('Rendering Page 1 & 2 with pdftoppm...');
    await run(pdftoppm, ['-png', '-r', '200', '-f', '1', '-l', '2', pdfPath, path.join(tmpDir, 'page')]);

    const rendered = fs.readdirSync(tmpDir).filter(f => f.endsWith('.png')).sort().map(f => path.join(tmpDir, f));
    console.log('Rendered pages:', rendered.map(f => path.basename(f)));

    const workerScript = path.resolve(__dirname, '../python/ocr_worker.py');
    const payload = {
      pages: rendered,
      pageNumbers: [1, 2],
      pdfPath: pdfPath,
      fileName: path.basename(pdfPath),
      outputDir: tmpDir,
    };

    console.log('Running OCR Worker...');
    const result = await runPython(workerScript, payload);
    const header = result.header || {};

    console.log('\n--- EXTRACTED HEADER INFO ---');
    console.log('विधानसभा (Assembly)   :', `${header.assemblyNumber || ''} - ${header.assemblyName || ''}`);
    console.log('भाग संख्या (Part Number) :', header.partNumber);
    console.log('मतदान केंद्र (Booth/PartName):', header.partName);
    console.log('गाँव का नाम (Village)    :', `"${header.village || ''}"`);
    console.log('डाकघर (Post Office)     :', `"${header.postOffice || ''}"`);
    console.log('पुलिस थाना (Police Stn)  :', `"${header.policeStation || ''}"`);
    console.log('तहसील (Tehsil)           :', `"${header.tehsil || ''}"`);
    console.log('जिला (District)         :', `"${header.district || ''}"`);
    console.log('पिन कोड (Pin Code)      :', `"${header.pinCode || header.rawPinCode || ''}"`);

    if (header.sectionMap && Object.keys(header.sectionMap).length) {
      console.log('\n--- ANUBHAG (SECTIONS) MAP ---');
      for (const [k, v] of Object.entries(header.sectionMap)) {
        console.log(`  अनुभाग ${k}: ${v}`);
      }
    }
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

async function main() {
  const pdf112 = 'D:\\Randeep Trivedi Voter list\\Final Publication 21.02.2026\\2026-EROLLGEN-S20-179-SIR-FinalRoll-Revision1-HIN-112.pdf';
  const pdf1 = 'D:\\Randeep Trivedi Voter list\\Final Publication 21.02.2026\\2026-EROLLGEN-S20-179-SIR-FinalRoll-Revision1-HIN-1.pdf';

  if (fs.existsSync(pdf112)) {
    await testPdf(pdf112);
  }
  if (fs.existsSync(pdf1)) {
    await testPdf(pdf1);
  }
}

main().catch(console.error);
