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
  var store = Hub.storageApi();

  Hub.credentials = {
    /** Load credentials for a widget instance. Resolves {} if none saved. */
    load: function (widgetId) {
      return store.get(PREFIX + widgetId).then(function (val) {
        return val || {};
      });
    },

    /** Merge obj into the stored credentials for this widget. */
    save: function (widgetId, obj) {
      return Hub.credentials.load(widgetId).then(function (existing) {
        return store.set(PREFIX + widgetId, Object.assign({}, existing, obj));
      });
    },

    /** Delete all credentials for this widget. */
    clear: function (widgetId) {
      return store.remove(PREFIX + widgetId);
    }
  };
}());
