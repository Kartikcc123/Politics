const test = require('node:test');
const assert = require('node:assert/strict');
const { matchingLocationNames, locationNameScore, findBestLocationMatch } = require('../src/utils/locationMerge');

test('allows equivalent section names with matra, nasal and spacing differences', () => {
  assert.equal(matchingLocationNames('पटवार भवन के पास, भीटा', 'पटवार भवन के पास, भींटा'), true);
  assert.equal(matchingLocationNames('अनुभाग चार', 'अनुभाग  चार'), true);
});

test('rejects unrelated section names and conflicting numbers', () => {
  assert.equal(matchingLocationNames('पटवार भवन के पास, भीटा', 'रावला के पास, भीटा'), false);
  assert.equal(matchingLocationNames('अनुभाग 4 भीटा', 'अनुभाग 5 भीटा'), false);
});

test('scores OCR spelling variants and explicit aliases', () => {
  assert.ok(locationNameScore('भीटा', 'भींटा') >= 0.82);
  const match = findBestLocationMatch('सेमलाट', [
    { _id: '1', name: 'सेमलाट', aliases: ['सेमलाट गांव'] },
    { _id: '2', name: 'सगरेव', aliases: [] },
  ]);
  assert.equal(match.candidate._id, '1');
  assert.equal(match.score, 1);
});

test('rejects ambiguous fuzzy village matches instead of selecting the first', () => {
  const match = findBestLocationMatch('थोरियाखेडा', [
    { _id: '1', name: 'थोरियाखेड़ा', aliases: [] },
    { _id: '2', name: 'थोरियाखेड़ा', aliases: [] },
  ]);
  assert.equal(match, null);
});

test('does not fuzzy match unrelated short village names', () => {
  assert.equal(findBestLocationMatch('रामा', [
    { _id: '1', name: 'राणा', aliases: [] },
    { _id: '2', name: 'रामा', aliases: [] },
  ]).candidate._id, '2');
  assert.equal(findBestLocationMatch('कोट', [{ _id: '1', name: 'कोटा', aliases: [] }]), null);
});