const test = require('node:test');
const assert = require('node:assert/strict');
const { BoundedTtlCache } = require('../src/utils/dataCache');

test('bounded cache expires entries and enforces its maximum size', async () => {
  const cache = new BoundedTtlCache({ ttlMs: 15, maxEntries: 2 });
  cache.set('a', 1);
  cache.set('b', 2);
  cache.set('c', 3);
  assert.equal(cache.get('a'), undefined);
  assert.equal(cache.get('b'), 2);
  assert.equal(cache.get('c'), 3);
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(cache.get('b'), undefined);
  assert.equal(cache.size, 0);
});

test('getOrSet coalesces concurrent work and does not retain failures', async () => {
  const cache = new BoundedTtlCache({ ttlMs: 1000, maxEntries: 5 });
  let calls = 0;
  const factory = async () => {
    calls += 1;
    await new Promise((resolve) => setTimeout(resolve, 5));
    return 42;
  };
  const values = await Promise.all([
    cache.getOrSet('dashboard', factory),
    cache.getOrSet('dashboard', factory),
    cache.getOrSet('dashboard', factory),
  ]);
  assert.deepEqual(values, [42, 42, 42]);
  assert.equal(calls, 1);

  await assert.rejects(() => cache.getOrSet('failure', async () => {
    throw new Error('temporary');
  }));
  assert.equal(cache.has('failure'), false);
});

test('clearPrefix invalidates only the requested namespace', () => {
  const cache = new BoundedTtlCache({ ttlMs: 1000, maxEntries: 5 });
  cache.set('reports:one', 1);
  cache.set('reports:two', 2);
  cache.set('areas:one', 3);
  cache.clearPrefix('reports:');
  assert.equal(cache.has('reports:one'), false);
  assert.equal(cache.has('reports:two'), false);
  assert.equal(cache.get('areas:one'), 3);
});