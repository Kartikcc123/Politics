const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const Member = require('../src/models/Member');

test('keeps raw, suggested and verified location snapshots independently', async () => {
  const verifier = new mongoose.Types.ObjectId();
  const member = new Member({
    name: 'Test Voter',
    voterId: 'ABC1234567',
    booth: new mongoose.Types.ObjectId(),
    locationResolution: {
      raw: { village: 'भीटा', sectionName: 'पटवार भवन भीटा' },
      suggested: { tehsil: 'रायपुर', gramPanchayat: 'भींटा', village: 'भींटा', pinCode: '311803' },
      verified: { tehsil: 'रायपुर', gramPanchayat: 'भींटा', village: 'भींटा', pinCode: '311803' },
      status: 'verified',
      confidence: 94,
      matchedAlias: 'भीटा',
      verifiedBy: verifier,
      verifiedAt: new Date('2026-08-20T00:00:00Z'),
    },
  });
  await member.validate();
  const stored = member.toObject().locationResolution;
  assert.equal(stored.raw.village, 'भीटा');
  assert.equal(stored.suggested.village, 'भींटा');
  assert.equal(stored.verified.village, 'भींटा');
  assert.equal(stored.status, 'verified');
  assert.equal(stored.confidence, 94);
  assert.equal(stored.matchedAlias, 'भीटा');
});