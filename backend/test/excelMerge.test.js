const test = require('node:test');
const assert = require('node:assert/strict');
const { canonicalizeExcelRow, buildSafeExcelMerge } = require('../src/utils/excelMerge');

test('Hindi and English Excel headers map to the same canonical voter fields', () => {
  const hindi = canonicalizeExcelRow({
    'नाम': 'रामलाल',
    'पिता का नाम': 'गोपाल',
    'मोबाइल नंबर': '9876543210',
    'मतदाता क्रमांक': 42,
    'पिन कोड': 311001,
  });
  assert.equal(hindi.name, 'रामलाल');
  assert.equal(hindi.guardianName, 'गोपाल');
  assert.equal(hindi.mobile, '9876543210');
  assert.equal(hindi.voterSerial, 42);
  assert.equal(hindi.pinCode, 311001);

  const english = canonicalizeExcelRow({
    'Voter Name': 'Ramlal',
    "Father's Name": 'Gopal',
    'Phone No.': '9876543210',
    'EPIC Number': 'SNE0125302',
  });
  assert.equal(english.name, 'Ramlal');
  assert.equal(english.guardianName, 'Gopal');
  assert.equal(english.mobile, '9876543210');
  assert.equal(english.voterId, 'SNE0125302');

  const customFormat = canonicalizeExcelRow({
    PartNo: 150,
    'MAKAN NO.': 9,
    Sno: 1,
    Sectionno: 1,
    EPICNo: 'SNE1175306',
    Name: 'BABOOL',
    NameHindi: 'बबूल',
    Age: 24,
    Gender: 'M',
    ParentName: 'kishan lal',
    PartentNameHindi: 'किशन लाल',
    Relation: 'F',
    MobileNo: '9876543210',
    Caste: 'खटीक',
    Address: 'खटीक मोहल्ला',
    Villege: 'गंगापुर',
    Samarthak: 'पक्ष'
  });
  assert.equal(customFormat.voterId, 'SNE1175306');
  assert.equal(customFormat.name, 'BABOOL');
  assert.equal(customFormat.guardianName, 'kishan lal');
  assert.equal(customFormat.mobile, '9876543210');
  assert.equal(customFormat.caste, 'खटीक');
  assert.equal(customFormat.village, 'गंगापुर');
  assert.equal(customFormat.houseNumber, 9);
  assert.equal(customFormat.partNumber, 150);
  assert.equal(customFormat.sectionNumber, 1);
  assert.equal(customFormat.voterSerial, 1);
  assert.equal(customFormat.supportLevel, 'पक्ष');
});

test('safe merge fills blanks but protects existing verified voter-list values', () => {
  const merge = buildSafeExcelMerge({
    voterId: 'SNE0125302',
    name: 'रामलाल',
    guardianName: 'गोपाल',
    mobile: '',
    occupation: '',
    houseNumber: '38',
    verificationStatus: 'verified',
    ocrValues: { status: 'verified', verified: { name: 'रामलाल' } },
  }, {
    voterId: 'SNE0125302',
    name: 'Ramlal',
    guardianName: 'Gopal',
    mobile: '9876543210',
    occupation: 'Teacher',
    houseNumber: '538',
  });
  assert.deepEqual(merge.updates, {
    mobile: '9876543210',
    occupation: 'Teacher',
  });
  assert.deepEqual(merge.filled, ['mobile', 'occupation']);
  assert.equal(merge.corrected.length, 0);
  assert.deepEqual(merge.conflicts.map((item) => item.field), [
    'name', 'guardianName', 'houseNumber',
  ]);
});

test('safe merge corrects only low-confidence OCR fields and keeps review provenance', () => {
  const merge = buildSafeExcelMerge({
    name: 'रामलाल',
    houseNumber: '538',
    mobile: '9999999999',
    verificationStatus: 'needs_review',
    ocrValues: { status: 'suggested', verified: {} },
    ocrFieldConfidence: { name: 92, houseNumber: 48 },
  }, {
    name: 'Ramlal',
    houseNumber: '38',
    mobile: '8888888888',
  });
  assert.deepEqual(merge.updates, { houseNumber: '38' });
  assert.deepEqual(merge.corrected, ['houseNumber']);
  assert.deepEqual(merge.conflicts.map((item) => item.field), ['name', 'mobile']);
});