const FIELDS = ['voterSerial', 'name', 'guardianName', 'relationType', 'houseNumber', 'age', 'gender', 'voterId'];

function normalize(value) {
  return value === null || value === undefined ? '' : String(value).trim();
}

function compareGoldenRecords(actualRecords, expectedRecords) {
  const actualBySerial = new Map(actualRecords.map((record) => [normalize(record.voterSerial), record]));
  const mismatches = [];
  for (const expected of expectedRecords) {
    const serial = normalize(expected.voterSerial);
    const actual = actualBySerial.get(serial);
    if (!actual) {
      mismatches.push({ voterSerial: serial, field: 'record', expected: 'present', actual: 'missing' });
      continue;
    }
    for (const field of FIELDS) {
      if (normalize(actual[field]) !== normalize(expected[field])) {
        mismatches.push({ voterSerial: serial, field, expected: expected[field], actual: actual[field] });
      }
    }
  }
  return {
    expectedCount: expectedRecords.length,
    actualCount: actualRecords.length,
    passed: actualRecords.length === expectedRecords.length && mismatches.length === 0,
    mismatches,
  };
}

module.exports = { FIELDS, compareGoldenRecords };