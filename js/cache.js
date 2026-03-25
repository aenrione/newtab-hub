/* ── Cache layer ── */

window.Hub = window.Hub || {};

Hub.cache = (function () {
  var STORAGE_KEY = "new-tab-cache";
  var mem = {}; /* in-memory mirror for fast access */
  var loaded = false;

  /* Default TTLs in milliseconds */
  var TTL = {
    markets:  5 * 60 * 1000,   /* 5 minutes  */
    feeds:    10 * 60 * 1000,   /* 10 minutes */
    favicon:  7 * 24 * 3600 * 1000, /* 7 days */
    default:  5 * 60 * 1000
  };

  /** Load cache from storage into memory (call once at init) */
  async function init(store) {
    var raw = await store.get(STORAGE_KEY);
    mem = (raw && typeof raw === "object") ? raw : {};
    loaded = true;
    prune();
  }

  /** Remove expired entries */
  function prune() {
    var now = Date.now();
    var changed = false;
    Object.keys(mem).forEach(function (key) {
      if (mem[key].exp && mem[key].exp < now) {
        delete mem[key];
        changed = true;
      }
    });
    return changed;
  }

  /** Persist to storage (debounced) */
  var saveTimer = null;
  function scheduleSave(store) {
    if (saveTimer) return;
    saveTimer = setTimeout(function () {
      saveTimer = null;
      prune();
      store.set(STORAGE_KEY, mem);
    }, 500);
  }

  /**
   * Get cached value.
   * Returns the data if valid, or null if expired/missing.
   */
  function get(key) {
    var entry = mem[key];
    if (!entry) return null;
    if (entry.exp && entry.exp < Date.now()) {
      delete mem[key];
      return null;
    }
    return entry.data;
  }

  /**
   * Set cached value.
   * @param {string} key
   * @param {*} data
   * @param {string} category - one of: markets, feeds, favicon, default
   * @param {object} store - storage api
   */
  function set(key, data, category, store) {
    var ttl = TTL[category] || TTL.default;
    mem[key] = { data: data, exp: Date.now() + ttl };
    if (store) scheduleSave(store);
  }

  function scopeKey(scope, key) {
    if (!scope) return key;
    return "scope::" + scope + "::" + key;
  }

  function clearScope(scope, store) {
    if (!scope) return;
    var prefix = scopeKey(scope, "");
    var changed = false;
    Object.keys(mem).forEach(function (key) {
      if (key.indexOf(prefix) !== 0) return;
      delete mem[key];
      changed = true;
    });
    if (changed && store) scheduleSave(store);
  }

  /** Clear all cache */
  async function clear(store) {
    mem = {};
    if (store) await store.set(STORAGE_KEY, {});
  }

  return {
    init: init,
    get: get,
    set: set,
    scopeKey: scopeKey,
    clearScope: clearScope,
    clear: clear,
    TTL: TTL
  };
})();

/**
 * Cached fetch wrapper.
 * Returns cached response body if available, otherwise fetches and caches.
 * @param {string} url
 * @param {string} category - cache category (markets, feeds, favicon)
 * @param {object} store - storage api
 * @param {object} [opts] - fetch options
 * @returns {Promise<string>} response text
 */
Hub.cachedFetch = async function (url, category, store, opts, cacheKeyOverride) {
  var cacheKey = cacheKeyOverride || (category + "::" + url);
  var cached = Hub.cache.get(cacheKey);
  if (cached !== null) return cached;

  var res = await fetch(url, opts || {});
  if (!res.ok) throw new Error("HTTP " + res.status);
  var text = await res.text();

  Hub.cache.set(cacheKey, text, category, store);
  return text;
};

/**
 * Cached JSON fetch wrapper.
 */
Hub.cachedFetchJSON = async function (url, category, store, opts, cacheKeyOverride) {
  var cacheKey = cacheKeyOverride || (category + "::" + url);
  var cached = Hub.cache.get(cacheKey);
  if (cached !== null) return cached;

  var res = await fetch(url, opts || {});
  if (!res.ok) throw new Error("HTTP " + res.status);
  var data = await res.json();

  Hub.cache.set(cacheKey, data, category, store);
  return data;
};
