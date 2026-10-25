const fs = require('fs');
const path = require('path');

function patchUtilsFile() {
  const candidatePaths = [
    path.join(__dirname, '../node_modules/whatsapp-web.js/src/util/Injected/Utils.js'),
    path.join(process.cwd(), 'node_modules/whatsapp-web.js/src/util/Injected/Utils.js'),
    '/app/node_modules/whatsapp-web.js/src/util/Injected/Utils.js'
  ];

  let targetPath = candidatePaths.find(p => fs.existsSync(p));
  if (!targetPath) {
    console.log('[Patch] whatsapp-web.js Utils.js not found yet, skipping.');
    return false;
  }

  let code = fs.readFileSync(targetPath, 'utf8');
  if (code.includes('delete message.__x_id;')) {
    console.log('[Patch] whatsapp-web.js is already patched against memoize collision.');
    return true;
  }

  let modified = false;

  // Patch 1: clean mediaOptions before spreading
  const target1 = `delete options.media;\n            delete options.sendMediaAsSticker;`;
  const replacement1 = `delete options.media;\n            delete options.sendMediaAsSticker;\n            delete mediaOptions.__x_id;\n            delete mediaOptions.id;`;
  if (code.includes(target1)) {
    code = code.replace(target1, replacement1);
    modified = true;
  }

  // Patch 2: drop __x_id on message object and ensure id is preserved
  const target2 = `...extraOptions,\n        };`;
  const replacement2 = `...extraOptions,\n        };\n\n        // Fix: drop colliding __x_id and ensure message.id is never overwritten\n        delete message.__x_id;\n        if (!message.id || typeof message.id !== 'object' || !message.id._serialized) {\n            message.id = newMsgKey;\n        }`;
  if (code.includes(target2)) {
    code = code.replace(target2, replacement2);
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(targetPath, code, 'utf8');
    console.log(`[Patch] Successfully patched whatsapp-web.js at ${targetPath}`);
    return true;
  } else {
    console.warn(`[Patch] Could not find patch markers in ${targetPath}`);
    return false;
  }
}

if (require.main === module) {
  patchUtilsFile();
}

module.exports = { patchUtilsFile };
