const store = new Map();

export const cache = {
  get(key) {
    const entry = store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expires) {
      store.delete(key);
      return null;
    }
    return entry.data;
  },

  set(key, data, ttlMs = 60_000) {
    store.set(key, { data, expires: Date.now() + ttlMs });
  },

  invalidate(prefix) {
    for (const key of store.keys()) {
      if (key.startsWith(prefix)) store.delete(key);
    }
  },

  flush() {
    store.clear();
  },
};
