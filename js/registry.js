/* ── Widget Plugin Registry ── */

window.Hub = window.Hub || {};

Hub.registry = (function () {
  var plugins = {};

  /**
   * Register a widget plugin.
   * @param {string} type - unique type identifier (e.g. "link-group", "markets")
   * @param {object} def
   *   - label:          display name for picker
   *   - icon:           Hub.icons key (e.g. "rss") or a URL (e.g. "https://example.com/favicon.ico") shown in the Add Widget picker
    *   - render:         function(container, config, state) — sync render
 *   - load:           function(container, config, state, token) — async fetch (optional)
 *   - manualRefresh:  boolean — show a manual refresh action and clear scoped cache before reloading
 *   - renderEditor:   function(container, config, onChange) — config editor UI
    *   - defaultConfig:  function() — returns default config for new instances
    *   - minSize:        optional { cols, rows } or function(config) => { cols, rows }
    */
  function register(type, def) {
    plugins[type] = Object.assign({ type: type }, def);
  }

  function getMinSize(type, config) {
    var plugin = get(type);
    var minSize = plugin && plugin.minSize;
    if (!minSize) return null;
    if (typeof minSize === "function") minSize = minSize(config || {});
    if (!minSize) return null;
    minSize = minSize || {};
    return {
      cols: Math.max(1, parseInt(minSize.cols, 10) || 1),
      rows: Math.max(1, parseInt(minSize.rows, 10) || 1)
    };
  }

  function get(type) { return plugins[type] || null; }

  function list() { return Object.keys(plugins).map(function (k) { return plugins[k]; }); }

  function addable() {
    return list();
  }

  return { register: register, get: get, getMinSize: getMinSize, list: list, addable: addable };
})();

/** Generate a short unique id */
Hub.uid = function () {
  return "w" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
};
