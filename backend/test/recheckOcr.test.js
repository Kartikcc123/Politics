const test = require('node:test');
const assert = require('node:assert/strict');
const { recheckCardOcr } = require('../src/utils/cardOcr');

test('recheckCardOcr module exports function', () => {
  assert.equal(typeof recheckCardOcr, 'function');
});
