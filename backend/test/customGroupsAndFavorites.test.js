const assert = require('assert');
const test = require('node:test');

test('Favorite star rating logic cycles correctly and keeps isFavorite in sync', () => {
  // Test cycling: 0 -> 1 -> 2 -> 3 -> 0
  const cycle = (currentRating) => {
    const nextRating = (currentRating >= 3 ? 0 : (currentRating || 0) + 1);
    const isFav = nextRating > 0;
    return { favoriteRating: nextRating, isFavorite: isFav };
  };

  let state = { favoriteRating: 0, isFavorite: false };
  
  state = cycle(state.favoriteRating);
  assert.strictEqual(state.favoriteRating, 1);
  assert.strictEqual(state.isFavorite, true);

  state = cycle(state.favoriteRating);
  assert.strictEqual(state.favoriteRating, 2);
  assert.strictEqual(state.isFavorite, true);

  state = cycle(state.favoriteRating);
  assert.strictEqual(state.favoriteRating, 3);
  assert.strictEqual(state.isFavorite, true);

  state = cycle(state.favoriteRating);
  assert.strictEqual(state.favoriteRating, 0);
  assert.strictEqual(state.isFavorite, false);
});

test('Explicit favorite star rating clamp works between 0 and 3', () => {
  const setRating = (val) => {
    const parsed = parseInt(val, 10);
    const rating = isNaN(parsed) ? 0 : Math.max(0, Math.min(3, parsed));
    return { favoriteRating: rating, isFavorite: rating > 0 };
  };

  assert.deepStrictEqual(setRating(3), { favoriteRating: 3, isFavorite: true });
  assert.deepStrictEqual(setRating(2), { favoriteRating: 2, isFavorite: true });
  assert.deepStrictEqual(setRating(1), { favoriteRating: 1, isFavorite: true });
  assert.deepStrictEqual(setRating(0), { favoriteRating: 0, isFavorite: false });
  assert.deepStrictEqual(setRating(5), { favoriteRating: 3, isFavorite: true }); // clamped to max 3
  assert.deepStrictEqual(setRating(-1), { favoriteRating: 0, isFavorite: false }); // clamped to min 0
});

test('Custom group filter maps groupId or group name correctly', () => {
  const buildFilter = (query) => {
    const filter = {};
    if (query.favoriteRating !== undefined && query.favoriteRating !== '') {
      const fr = parseInt(query.favoriteRating, 10);
      if (!isNaN(fr) && fr >= 0 && fr <= 3) filter.favoriteRating = fr;
    }
    if (query.groupId) filter.groups = query.groupId;
    if (query.group) {
      if (/^[0-9a-fA-F]{24}$/.test(query.group)) {
        filter.groups = query.group;
      } else {
        filter.labels = String(query.group).trim();
      }
    }
    return filter;
  };

  assert.deepStrictEqual(buildFilter({ favoriteRating: '3' }), { favoriteRating: 3 });
  assert.deepStrictEqual(buildFilter({ group: 'परिवार' }), { labels: 'परिवार' });
  assert.deepStrictEqual(
    buildFilter({ group: '507f1f77bcf86cd799439011' }),
    { groups: '507f1f77bcf86cd799439011' }
  );
  assert.deepStrictEqual(
    buildFilter({ favoriteRating: '2', groupId: '507f1f77bcf86cd799439011' }),
    { favoriteRating: 2, groups: '507f1f77bcf86cd799439011' }
  );
});

test('Favorite update normalization correctly handles isFavorite and favoriteRating for non-admin users', () => {
  const normalize = (updates, member = { favoriteRating: 0, isFavorite: false }) => {
    const res = { ...updates };
    if (res.favoriteRating !== undefined && res.favoriteRating !== null && res.favoriteRating !== '') {
      const parsedRating = parseInt(res.favoriteRating, 10);
      res.favoriteRating = isNaN(parsedRating) ? 0 : Math.max(0, Math.min(3, parsedRating));
      res.isFavorite = res.favoriteRating > 0;
    } else if (res.isFavorite !== undefined) {
      res.isFavorite = res.isFavorite === true || res.isFavorite === 'true';
      res.favoriteRating = res.isFavorite ? Math.max(1, Number(member.favoriteRating) || 0) : 0;
    }
    return res;
  };

  // 1. Toggling on from false -> true defaults to 1 star
  assert.deepStrictEqual(normalize({ isFavorite: true }, { favoriteRating: 0 }), { isFavorite: true, favoriteRating: 1 });

  // 2. Preserves existing rating if turning back on
  assert.deepStrictEqual(normalize({ isFavorite: true }, { favoriteRating: 2 }), { isFavorite: true, favoriteRating: 2 });

  // 3. Toggling off sets both to false / 0
  assert.deepStrictEqual(normalize({ isFavorite: false }, { favoriteRating: 3 }), { isFavorite: false, favoriteRating: 0 });

  // 4. Setting explicit rating
  assert.deepStrictEqual(normalize({ favoriteRating: 3 }), { isFavorite: true, favoriteRating: 3 });
  assert.deepStrictEqual(normalize({ favoriteRating: 0 }), { isFavorite: false, favoriteRating: 0 });

  // 5. Check isFavoriteToggle detector
  const isFavoriteToggle = (body) => (body?.isFavorite !== undefined || body?.favoriteRating !== undefined) &&
    !Object.keys(body || {}).some((k) => !['isFavorite', 'favoriteRating', '_id', 'id'].includes(k));

  assert.strictEqual(isFavoriteToggle({ isFavorite: true }), true);
  assert.strictEqual(isFavoriteToggle({ isFavorite: false }), true);
  assert.strictEqual(isFavoriteToggle({ favoriteRating: 2 }), true);
  assert.strictEqual(isFavoriteToggle({ name: 'test', isFavorite: true }), false);
});

