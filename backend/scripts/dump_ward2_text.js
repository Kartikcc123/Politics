const { execSync } = require('child_process');
const fs = require('fs');

const pdfPath = 'C:\\Users\\Ashish Sharma\\Downloads\\PEETHA KA KHERA-Ward No-002.pdf';
try {
  const output = execSync(`pdftotext "${pdfPath}" -`, { encoding: 'utf8' });
  console.log('PDF text length:', output.length);
  fs.writeFileSync('scratch_ward2_text.txt', output, 'utf8');
  console.log('Saved to scratch_ward2_text.txt');
  console.log('Sample:\n', output.slice(0, 1500));
} catch (e) {
  console.error('pdftotext error:', e.message);
}
