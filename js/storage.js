/* ── Storage abstraction ── */

window.Hub = window.Hub || {};

Hub.STORAGE_KEY = "new-tab-active-profile";
Hub.STORAGE_OVERRIDES_KEY = "new-tab-profile-overrides";
Hub.STORAGE_COLLAPSED_KEY = "new-tab-collapsed-groups";
Hub.STORAGE_LAYOUT_KEY = "new-tab-grid-layout";
Hub.STORAGE_THEME_KEY = "new-tab-color-scheme";
Hub.STORAGE_BG_IMAGE_KEY = "new-tab-bg-image";

Hub.storageApi = function () {
  if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
    return {
      async get(key) {
        return new Promise(function (resolve) {
          chrome.storage.local.get([key], function (result) {
            resolve(result ? result[key] : undefined);
          });
        });
      },
      async set(key, value) {
        return new Promise(function (resolve) {
          chrome.storage.local.set({ [key]: value }, resolve);
        });
      },
      async getAll() {
        return new Promise(function (resolve) {
          chrome.storage.local.get(null, function (result) {
            resolve(result || {});
          });
        });
      }
    };
  }

  return {
    async get(key) {
      var value = localStorage.getItem(key);
      if (value == null) return undefined;
      try { return JSON.parse(value); }
      catch (_) { return value; }
    },
    async set(key, value) {
      localStorage.setItem(key, JSON.stringify(value));
    },
    async getAll() {
      var result = {};
      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (!key.startsWith("new-tab-")) continue;
        try { result[key] = JSON.parse(localStorage.getItem(key)); }
        catch (_) { result[key] = localStorage.getItem(key); }
      }
      return result;
    }
  };
};
