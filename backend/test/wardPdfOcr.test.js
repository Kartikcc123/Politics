const test = require('node:test');
const assert = require('node:assert/strict');
const { _epicHints } = require('../src/utils/wardPdfOcr');

test('municipal PDF embedded text supplies exact ordered EPIC hints', () => {
  const text = `
    1 SNE1175306       2 SNE1088194       3 SNE0931618
    7 RJ/20/152/354059 8 RJ/20/152/355013 9 SNE0094961
  `;
  assert.deepEqual(_epicHints(text), [
    { serial: '1', epic: 'SNE1175306', action: 'upsert' },
    { serial: '2', epic: 'SNE1088194', action: 'upsert' },
    { serial: '3', epic: 'SNE0931618', action: 'upsert' },
    { serial: '7', epic: 'RJ/20/152/354059', action: 'upsert' },
    { serial: '8', epic: 'RJ/20/152/355013', action: 'upsert' },
    { serial: '9', epic: 'SNE0094961', action: 'upsert' },
  ]);
});

test('municipal deletion markers are preserved for final-roll reconciliation', () => {
  assert.deepEqual(_epicHints('S     47 KDY1303791  R     94 KDY1064021'), [
    { serial: '47', epic: 'KDY1303791', action: 'delete' },
    { serial: '94', epic: 'KDY1064021', action: 'delete' },
  ]);
});
test('municipal layout keeps ordered serial hints when EPIC is blank', () => {
  const text = `    432          433          434
नरम: voter one    नरम: voter two    नरम: voter three`;
  assert.deepEqual(_epicHints(text), [
    { serial: '432', epic: '', action: 'upsert' },
    { serial: '433', epic: '', action: 'upsert' },
    { serial: '434', epic: '', action: 'upsert' },
  ]);
});
test('municipal EPIC hint parser ignores serials without EPIC', () => {
  assert.deepEqual(_epicHints('432     433     434'), []);
});
