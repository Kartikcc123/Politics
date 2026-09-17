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
