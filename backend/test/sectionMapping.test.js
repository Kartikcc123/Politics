const assert = require('assert');
const {
  cleanSectionName,
  safeSectionMap,
  sectionHeaderForRecord,
} = require('../src/controllers/importController');

console.log('Running Section Mapping & Name Cleaning Tests...');

// Test 1: Clean English OCR gibberish
assert.strictEqual(cleanSectionName('पटवार भवन के ore, Hier'), 'पटवार भवन के');
assert.strictEqual(cleanSectionName('पटवार भवन के sifer after'), 'पटवार भवन के');
assert.strictEqual(cleanSectionName('चौराया के पास, भीटा'), 'चौराया के पास, भीटा');
assert.strictEqual(cleanSectionName('google polling station view'), '');
console.log('✔ Test 1 Passed: Section name cleaning & English gibberish rejection');

// Test 2: Safe section map building
const rawMap = {
  '1': 'पटवार भवन के ore, Hier',
  '2': 'चौराया के पास, भीटा',
  '3': 'रावला के पास, भीटा',
  '4': 'देवरी मगरी, भीटा',
  '5': 'सम्पूर्ण सेमलाट, सेमलाट',
};
const map = safeSectionMap(rawMap);
assert.strictEqual(map['1'], 'पटवार भवन के');
assert.strictEqual(map['2'], 'चौराया के पास, भीटा');
assert.strictEqual(map['3'], 'रावला के पास, भीटा');
assert.strictEqual(map['4'], 'देवरी मगरी, भीटा');
assert.strictEqual(map['5'], 'सम्पूर्ण सेमलाट, सेमलाट');
console.log('✔ Test 2 Passed: Section map normalization & cleaning');

// Test 3: Record section header resolution
const header = {
  assemblyNumber: '179',
  assemblyName: 'सहाड़ा',
  partNumber: '1',
  sectionNumber: '1',
  sectionName: 'पटवार भवन के पास, भीटा',
  sectionMap: {
    '1': 'पटवार भवन के पास, भीटा',
    '2': 'चौराया के पास, भीटा',
    '3': 'रावला के पास, भीटा',
    '4': 'देवरी मगरी, भीटा',
    '5': 'सम्पूर्ण सेमलाट, सेमलाट',
  },
};

const rec4 = { sectionNumber: '4', name: 'रामलाल' };
const secHeader4 = sectionHeaderForRecord(rec4, header);
assert.strictEqual(secHeader4.sectionNumber, '4');
assert.strictEqual(secHeader4.sectionName, 'देवरी मगरी, भीटा');

const rec2 = { sectionNumber: '2', name: 'नारायण' };
const secHeader2 = sectionHeaderForRecord(rec2, header);
assert.strictEqual(secHeader2.sectionNumber, '2');
assert.strictEqual(secHeader2.sectionName, 'चौराया के पास, भीटा');
console.log('✔ Test 3 Passed: Per-record section mapping by sectionNumber');

const noisyRec2 = {
  sectionNumber: '2',
  sectionName: 'चौराया के Gre, vier',
  name: 'नारायण',
};
const authoritativeSec2 = sectionHeaderForRecord(noisyRec2, header);
assert.strictEqual(authoritativeSec2.sectionName, map['2']);
console.log('✔ Test 4 Passed: Master section map overrides noisy voter-page header OCR');

// Regression: a noisy locality name must never move any valid master section
// number to another section. This protects every section, not just section 1.
const authoritativeMap = safeSectionMap(header.sectionMap);
for (const [sectionNumber, sectionName] of Object.entries(authoritativeMap)) {
  const resolved = sectionHeaderForRecord({
    sectionNumber,
    sectionName: map['4'], // deliberately conflicting OCR/text-layer locality
  }, header);
  assert.strictEqual(resolved.sectionNumber, sectionNumber);
  assert.strictEqual(resolved.sectionName, sectionName);
}
console.log('✔ Test 5 Passed: Every valid master section number overrides conflicting locality text');

console.log('ALL SECTION MAPPING TESTS PASSED SUCCESSFULLY!');
