/* ── Storybook: chrome.storage stub ──
   Runs before all other scripts.
   If chrome.storage.local is unavailable (e.g. local file:// access),
   fall back to localStorage so widgets that use Hub.credentials still work.
── */
(function () {
  if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) return;
  window.chrome = window.chrome || {};
  window.chrome.storage = {
    local: {
      get: function (keys, cb) {
        var r = {};
        (Array.isArray(keys) ? keys : [keys]).forEach(function (k) {
          try { var v = localStorage.getItem(k); if (v !== null) r[k] = JSON.parse(v); } catch (e) {}
        });
        if (cb) cb(r);
      },
      set: function (obj, cb) {
        Object.keys(obj).forEach(function (k) {
          try { localStorage.setItem(k, JSON.stringify(obj[k])); } catch (e) {}
        });
        if (cb) cb();
      },
      remove: function (keys, cb) {
        (Array.isArray(keys) ? keys : [keys]).forEach(function (k) { localStorage.removeItem(k); });
        if (cb) cb();
      }
    }
  };
})();

window.Hub = window.Hub || {};
