const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

function commandFromEnv(name, fallback) {
  return process.env[name] || fallback;
}

const run = (command, args) => new Promise((resolve, reject) => {
  const child = spawn(command, args, { windowsHide: true });
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
  child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
  child.on('close', (code) => {
    if (code === 0) resolve(stdout);
    else reject(new Error(stderr || `${command} exited with code ${code}`));
  });
});

async function main() {
  const pdfPath = 'C:\\Users\\Ashish Sharma\\OneDrive\\Documents\\Downloads\\2026-EROLLGEN-S20-179-SIR-FinalRoll-Revision1-HIN-177.pdf';
  const outputDir = path.join(__dirname, '..');
  const prefix = path.join(outputDir, 'temp_p3');
  await run(commandFromEnv('PDFTOPPM_PATH', 'pdftoppm'), [
    '-png', '-singlefile', '-r', '300',
    '-f', '3', '-l', '3', pdfPath, prefix,
  ]);
  console.log('Rendered page 3 to:', `${prefix}.png`);
}

main().catch(console.error);
