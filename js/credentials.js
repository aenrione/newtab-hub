/* js/credentials.js
 * Per-widget credential storage via chrome.storage.local (localStorage fallback).
 * Storage key format: "new-tab-creds-{widgetId}"
 * Never synced, never exported, never imported.
 *
 * Usage in a widget's load() function:
 *   var creds = await Hub.credentials.load(config._id);
 *   if (!creds.apiKey) { ... show setup message ... return; }
 */
(function () {
  var PREFIX = "new-tab-creds-";

  function storageGet(key) {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      return new Promise(function (resolve) {
        chrome.storage.local.get([key], function (result) {
          resolve(result ? result[key] : undefined);
        });
      });
    }
    try { return Promise.resolve(JSON.parse(localStorage.getItem(key))); }
    catch (_) { return Promise.resolve(undefined); }
  }

  function storageSet(key, value) {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      return new Promise(function (resolve) {
        chrome.storage.local.set({ [key]: value }, resolve);
      });
    }
    localStorage.setItem(key, JSON.stringify(value));
    return Promise.resolve();
  }

  function storageRemove(key) {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      return new Promise(function (resolve) {
        chrome.storage.local.remove(key, resolve);
      });
    }
    localStorage.removeItem(key);
    return Promise.resolve();
  }

  Hub.credentials = {
    /** Load credentials for a widget instance. Resolves {} if none saved. */
    load: function (widgetId) {
      return storageGet(PREFIX + widgetId).then(function (val) {
        return val || {};
      });
    },

    /** Merge obj into the stored credentials for this widget. */
    save: function (widgetId, obj) {
      return Hub.credentials.load(widgetId).then(function (existing) {
        return storageSet(PREFIX + widgetId, Object.assign({}, existing, obj));
      });
    },

    /** Delete all credentials for this widget. */
    clear: function (widgetId) {
      return storageRemove(PREFIX + widgetId);
    }
  };
}());
