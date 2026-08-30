const { convert_kruti_to_unicode: convertWithVendor } = require('./vendor/krutidev');

const legacyDocument = {
  legacy_text: { value: '' },
  unicode_text: { value: '' },
};

const convertKrutiDevToUnicode = (value) => {
  const input = String(value || '').trim();
  if (!input || /[\u0900-\u097F]/.test(input)) return input;
  const previousDocument = global.document;
  try {
    legacyDocument.legacy_text.value = input;
    legacyDocument.unicode_text.value = '';
    global.document = {
      getElementById(id) {
        return legacyDocument[id];
      },
    };
    convertWithVendor();
    return legacyDocument.unicode_text.value.trim();
  } finally {
    global.document = previousDocument;
  }
};

module.exports = { convertKrutiDevToUnicode };
