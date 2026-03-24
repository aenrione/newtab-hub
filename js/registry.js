/* ── Widget Plugin Registry ── */

window.Hub = window.Hub || {};

Hub.registry = (function () {
  var plugins = {};

  /**
   * Register a widget plugin.
   * @param {string} type - unique type identifier (e.g. "link-group", "markets")
   * @param {object} def
   *   - label:          display name for picker
   *   - icon:           small emoji/symbol for picker
   *   - render:         function(container, config, state) — sync render
   *   - load:           function(container, config, state, token) — async fetch (optional)
   *   - renderEditor:   function(container, config, onChange) — config editor UI
   *   - defaultConfig:  function() — returns default config for new instances
   */
  function register(type, def) {
    plugins[type] = Object.assign({ type: type }, def);
  }

  function get(type) { return plugins[type] || null; }

  function list() { return Object.keys(plugins).map(function (k) { return plugins[k]; }); }

  function addable() {
    return list();
  }

  return { register: register, get: get, list: list, addable: addable };
})();

/** Generate a short unique id */
Hub.uid = function () {
  return "w" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
};
