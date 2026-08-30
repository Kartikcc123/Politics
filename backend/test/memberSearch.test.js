const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const Member = require('../src/models/Member');
const {
  buildMemberSearchData,
  buildSearchConditions,
  buildFieldSearchConditions,
  buildStrictFieldSearchConditions,
  canonicalEpic,
  searchExactCandidates,
} = require('../src/utils/memberSearch');

test('indexes Hindi names, joined-name substrings, mobile suffixes and Hindi digits', () => {
  const data = buildMemberSearchData({
    name: 'नेनूराम',
    guardianName: 'प्रतापचन्द',
    mobile: '98765 43210',
    voterId: 'SNEO573606',
    houseNumber: '८',
    village: 'सहाडा',
  });
  assert.ok(data.searchKeys.includes('नेनू'));
  assert.ok(data.searchKeys.includes('राम'));
  assert.ok(data.searchKeys.includes('43210'));
  assert.ok(data.searchKeys.includes('8'));
  assert.ok(data.searchKeys.includes('sne0573606'));
});

test('supports loose Hindi matra matching and multi-field query tokens', () => {
  const conditions = buildSearchConditions('नैनुराम सहाडा');
  assert.equal(conditions.length, 2);
  assert.ok(conditions[0].$or);
  assert.ok(conditions[1].$or);
  assert.ok(conditions[1].$or[0].searchKeys.$in.includes('सहाडा'));
});

test('scopes quick search to voter name, guardian name or EPIC', () => {
  const name = buildFieldSearchConditions('राम', 'name');
  assert.deepEqual(Object.keys(name[0].$or[0]), ['searchNameKeys']);
  assert.ok(name[0].$or.some((condition) => condition.name));
  assert.ok(name[0].$or.some((condition) => condition.surname));

  const guardian = buildFieldSearchConditions('मोहनलाल', 'guardian');
  assert.deepEqual(Object.keys(guardian[0].$or[0]), ['searchGuardianKeys']);
  assert.ok(guardian[0].$or.some((condition) => condition.guardianName));

  const epic = buildFieldSearchConditions('ABC1234567', 'epic');
  assert.deepEqual(Object.keys(epic[0].$or[0]), ['searchEpicKeys']);
  assert.ok(epic[0].$or.some((condition) => condition.voterId));
});

test('matches joined names and one-character typing mistakes within selected fields', () => {
  const data = buildMemberSearchData({
    name: 'Arjun Lal',
    guardianName: 'Mohan Lal',
    voterId: 'ABC1234567',
    mobile: '9876543210',
    houseNumber: '1234',
  });
  assert.ok(data.searchNameKeys.includes('arjunlal'));
  assert.ok(data.searchNameKeys.includes('arjnlal'));

  const typoName = buildFieldSearchConditions('arjnlal', 'name');
  assert.ok(typoName[0].$or[0].searchNameKeys.$in.includes('arjnlal'));
  const typoGuardian = buildFieldSearchConditions('mohnlal', 'guardian');
  assert.ok(typoGuardian[0].$or[0].searchGuardianKeys.$in.length > 0);
  const typoEpic = buildFieldSearchConditions('ABC1234568', 'epic');
  assert.ok(typoEpic[0].$or[0].searchEpicKeys.$in.length > 0);
});
test('matches Latin typing with Hindi and OCR-transposed voter names', () => {
  const hindi = buildMemberSearchData({ name: 'अजुर्नलाल' });
  const latinQuery = buildFieldSearchConditions('arjunlal', 'name');
  const queryKeys = latinQuery[0].$or[0].searchNameKeys.$in;
  assert.ok(hindi.searchNameKeys.some((key) => queryKeys.includes(key)));
});
test('rejects unrelated short phonetic names while matching the Hindi equivalent', () => {
  const query = buildFieldSearchConditions('ashok', 'name');
  const queryKeys = query[0].$or[0].searchNameKeys.$in;
  const ashok = buildMemberSearchData({ name: 'अशोक' });
  const sukhi = buildMemberSearchData({ name: 'सुखी' });
  const manju = buildMemberSearchData({ name: 'मंजु' });
  assert.ok(ashok.searchNameKeys.some((key) => queryKeys.includes(key)));
  assert.ok(!sukhi.searchNameKeys.some((key) => queryKeys.includes(key)));
  assert.ok(!manju.searchNameKeys.some((key) => queryKeys.includes(key)));
});
test('matches a shorter name prefix without phonetic collisions', () => {
  const query = buildFieldSearchConditions('arjun', 'name');
  const queryKeys = query[0].$or[0].searchNameKeys.$in;
  const arjunlal = buildMemberSearchData({ name: 'अजुर्नलाल' });
  const ratanlal = buildMemberSearchData({ name: 'रतन लाल' });
  assert.ok(arjunlal.searchNameKeys.some((key) => queryKeys.includes(key)));
  assert.ok(!ratanlal.searchNameKeys.some((key) => queryKeys.includes(key)));
});
test('does not merge distinct long names through phonetic deletion', () => {
  const cases = [
    ['arjunlal', 'रतन लाल'],
    ['roshanlal', 'शान्तिलाल'],
    ['shantilal', 'रोशनलाल'],
    ['hiralal', 'भेरूलाल'],
    ['ratanlal', 'अजुर्नलाल'],
  ];
  for (const [queryText, unrelatedName] of cases) {
    const query = buildFieldSearchConditions(queryText, 'name');
    const queryKeys = query[0].$or[0].searchNameKeys.$in;
    const unrelated = buildMemberSearchData({ name: unrelatedName });
    assert.ok(!unrelated.searchNameKeys.some((key) => queryKeys.includes(key)));
  }
});
test('canonicalizes common OCR mistakes in EPIC numbers', () => {
  assert.equal(canonicalEpic('SNEO5736O6'), 'SNE0573606');
  assert.ok(searchExactCandidates('SNE0573606').includes('sne0573606'));
});
test('keeps EPIC fuzzy search scoped to the complete identifier', () => {
  const query = buildFieldSearchConditions('KDY0910562', 'epic');
  const queryKeys = query[0].$or[0].searchEpicKeys.$in;
  const target = buildMemberSearchData({ voterId: 'KDY0910562' });
  const unrelated = buildMemberSearchData({ voterId: 'KDY0955278' });
  assert.ok(target.searchEpicKeys.some((key) => queryKeys.includes(key)));
  assert.ok(!unrelated.searchEpicKeys.some((key) => queryKeys.includes(key)));
});
test('strict field search keeps exact EPIC and house number isolated', () => {
  const epic = buildStrictFieldSearchConditions('KDY0910562', 'epic');
  assert.ok(epic[0].$or.some((item) => item.voterId?.test('KDY0910562')));
  assert.ok(!epic[0].$or.some((item) => item.voterId?.test('KDY0910521')));
  const house = buildStrictFieldSearchConditions('9', 'house');
  assert.ok(house[0].$or.some((item) => item.houseNumber?.test('9')));
  assert.ok(!house[0].$or.some((item) => item.houseNumber?.test('29')));
  const legacyEpic = buildStrictFieldSearchConditions('RJ/20/152/000223', 'epic');
  assert.equal(legacyEpic.length, 1);
  const hindiHouse = buildMemberSearchData({ houseNumber: '२६' });
  const hindiHouseQuery = buildStrictFieldSearchConditions('26', 'house');
  const houseKeys = hindiHouseQuery[0].$or[0].searchHouseKeys.$in;
  assert.ok(hindiHouse.searchHouseKeys.some((key) => houseKeys.includes(key)));
});
test('strict name search supports a Latin prefix without deletion keys', () => {
  const query = buildStrictFieldSearchConditions('arjun', 'name');
  const queryKeys = query[0].$or[0].searchNameKeys.$in;
  const target = buildMemberSearchData({ name: 'अजुर्नलाल' });
  const unrelated = buildMemberSearchData({ name: 'रतन लाल' });
  assert.ok(target.searchNameKeys.some((key) => queryKeys.includes(key)));
  assert.ok(!unrelated.searchNameKeys.some((key) => queryKeys.includes(key)));
});

test('member validation automatically refreshes search data', async () => {
  const member = new Member({
    name: 'रामलाल',
    guardianName: 'मोहनलाल',
    voterId: 'ABC1234567',
    booth: new mongoose.Types.ObjectId(),
  });
  await member.validate();
  assert.equal(member.searchVersion, 8);
  assert.ok(member.searchKeys.includes('राम'));
  assert.ok(member.searchKeys.includes('लाल'));
});

test('dedicated PIN and village search remain correctly scoped', () => {
  const target = buildMemberSearchData({ village: 'भींटा', pinCode: '311803' });
  const villageQuery = buildFieldSearchConditions('भीटा', 'village');
  assert.deepEqual(Object.keys(villageQuery[0].$or[0]), ['searchVillageKeys']);
  assert.ok(target.searchVillageKeys.some((key) => villageQuery[0].$or[0].searchVillageKeys.$in.includes(key)));

  const pinQuery = buildStrictFieldSearchConditions('311803', 'pin');
  assert.ok(pinQuery[0].$or.some((item) => item.pinCode?.test('311803')));
  assert.ok(!pinQuery[0].$or.some((item) => item.pinCode?.test('311804')));
  assert.ok(target.searchPinKeys.length > 0);
});