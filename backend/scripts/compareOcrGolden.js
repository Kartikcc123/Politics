const fs = require('node:fs');
const path = require('node:path');
const { compareGoldenRecords } = require('../src/utils/ocrGolden');

const actualPath = process.argv[2];
const goldenPath = process.argv[3] || path.join(__dirname, '../test/fixtures/bheeta-page3.golden.json');
if (!actualPath) {
  console.error('Usage: node scripts/compareOcrGolden.js <ocr-result.json> [golden.json]');
  process.exit(2);
}
const actualPayload = JSON.parse(fs.readFileSync(actualPath, 'utf8'));
const golden = JSON.parse(fs.readFileSync(goldenPath, 'utf8'));
const records = actualPayload.records || actualPayload.members || actualPayload.data?.records || [];
const pageRecords = records.filter((record) => !record.page || Number(record.page) === Number(golden.page));
const result = compareGoldenRecords(pageRecords, golden.records);
console.log(JSON.stringify(result, null, 2));
if (!result.passed) process.exitCode = 1;