const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function compressImage(inputPath, outputPath, maxDim = 600, quality = 80) {
  // Method 1: ImageMagick (magick)
  try {
    execSync(`magick "${inputPath}" -resize ${maxDim}x${maxDim}> -quality ${quality} -strip "${outputPath}"`, { stdio: 'pipe' });
    if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
      return true;
    }
  } catch (e1) {
    // console.warn('magick failed, trying python PIL:', e1.message);
  }

  // Method 2: Python PIL
  try {
    const pyScript = `
import sys
from PIL import Image
try:
    img = Image.open(sys.argv[1])
    img = img.convert('RGB')
    img.thumbnail((${maxDim}, ${maxDim}))
    img.save(sys.argv[2], format='JPEG', quality=${quality}, optimize=True)
    print("OK")
except Exception as e:
    print(str(e), file=sys.stderr)
    sys.exit(1)
`;
    execSync(`python -c "${pyScript.replace(/\n/g, ';').replace(/"/g, '\\"')}" "${inputPath}" "${outputPath}"`, { stdio: 'pipe' });
    if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
      return true;
    }
  } catch (e2) {
    // console.warn('python PIL failed:', e2.message);
  }

  // Fallback: Copy file
  try {
    fs.copyFileSync(inputPath, outputPath);
    return true;
  } catch (e3) {
    return false;
  }
}

// Let's test with any image
const testDir = path.join(__dirname, '../scratch');
fs.mkdirSync(testDir, { recursive: true });
console.log('Testing compressImage function...');
