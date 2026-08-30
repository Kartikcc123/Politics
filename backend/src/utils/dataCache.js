class BoundedTtlCache {
  constructor({ ttlMs = 30000, maxEntries = 1000 } = {}) {
    this.ttlMs = Math.max(1, Number(ttlMs) || 30000);
    this.maxEntries = Math.max(1, Number(maxEntries) || 1000);
    this.entries = new Map();
  }

  get size() {
    this.pruneExpired();
    return this.entries.size;
  }

  get(key) {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      this.entries.delete(key);
      return undefined;
    }
    // Refresh insertion order so eviction behaves like LRU.
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.value;
  }

  has(key) {
    return this.get(key) !== undefined;
  }

  set(key, value, ttlMs = this.ttlMs) {
    this.entries.delete(key);
    this.entries.set(key, {
      value,
      expiresAt: Date.now() + Math.max(1, Number(ttlMs) || this.ttlMs),
    });
    this.evictOverflow();
    return this;
  }

  delete(key) {
    return this.entries.delete(key);
  }

  clear() {
    this.entries.clear();
  }

  clearPrefix(prefix) {
    for (const key of this.entries.keys()) {
      if (String(key).startsWith(prefix)) this.entries.delete(key);
    }
  }

  pruneExpired(now = Date.now()) {
    for (const [key, entry] of this.entries) {
      if (entry.expiresAt <= now) this.entries.delete(key);
    }
  }

  evictOverflow() {
    this.pruneExpired();
    while (this.entries.size > this.maxEntries) {
      const oldestKey = this.entries.keys().next().value;
      this.entries.delete(oldestKey);
    }
  }

  async getOrSet(key, factory, ttlMs = this.ttlMs) {
    const cached = this.get(key);
    if (cached !== undefined) return cached;
    const pending = Promise.resolve().then(factory);
    this.set(key, pending, ttlMs);
    try {
      const value = await pending;
      this.set(key, value, ttlMs);
      return value;
    } catch (error) {
      this.delete(key);
      throw error;
    }
  }
}

const reportCache = new BoundedTtlCache({ ttlMs: 15000, maxEntries: 500 });
const areaImportCache = new BoundedTtlCache({ ttlMs: 30 * 60 * 1000, maxEntries: 5000 });
const pdfAreaHierarchyCache = new BoundedTtlCache({ ttlMs: 15 * 60 * 1000, maxEntries: 10000 });

const invalidateMemberData = () => reportCache.clear();
const invalidateAreaData = () => {
  areaImportCache.clear();
  pdfAreaHierarchyCache.clear();
};

module.exports = {
  BoundedTtlCache,
  reportCache,
  areaImportCache,
  pdfAreaHierarchyCache,
  invalidateMemberData,
  invalidateAreaData,
};