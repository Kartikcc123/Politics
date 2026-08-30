const test = require('node:test');
const assert = require('node:assert/strict');
const fixture = require('./fixtures/bheeta-page3.golden.json');
const page8Fixture = require('./fixtures/bheeta-page8.golden.json');
const { compareGoldenRecords } = require('../src/utils/ocrGolden');

test('Bheeta page 3 golden fixture contains 30 admin-verified voter cards', () => {
  assert.equal(fixture.page, 3);
  assert.equal(fixture.verified, true);
  assert.equal(fixture.records.length, 30);
  assert.deepEqual(fixture.records.map((row) => Number(row.voterSerial)), Array.from({ length: 30 }, (_, index) => index + 1));
  assert.equal(compareGoldenRecords(fixture.records, fixture.records).passed, true);
});

test('golden comparison reports an exact field regression', () => {
  const actual = structuredClone(fixture.records);
  actual[18].guardianName = 'गलत नाम';
  const result = compareGoldenRecords(actual, fixture.records);
  assert.equal(result.passed, false);
  assert.deepEqual(result.mismatches[0], {
    voterSerial: '19', field: 'guardianName', expected: 'मांगीलाल', actual: 'गलत नाम',
  });
});
test('Bheeta page 8 golden fixture contains serials 127 through 156', () => {
  assert.equal(page8Fixture.records.length, 30);
  assert.deepEqual(page8Fixture.records.map((row) => Number(row.voterSerial)), Array.from({ length: 30 }, (_, index) => index + 127));
  assert.equal(compareGoldenRecords(page8Fixture.records, page8Fixture.records).passed, true);
});
