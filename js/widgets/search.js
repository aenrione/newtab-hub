/* ── Search widget plugin ── */

Hub.registry.register("search", {
  label: "Search",
  icon: "/",

  render: function (container, config) {
    container.style.position = "relative";
    container.innerHTML =
      '<label class="search-wrap" for="quick-search">' +
        '<span class="search-icon">/</span>' +
        '<input id="quick-search" type="search" autocomplete="off" spellcheck="false" autofocus placeholder="Search links, feeds, or type a URL" />' +
      '</label>' +
      '<div id="search-results" class="search-results hidden" aria-live="polite"></div>';
  },

  renderEditor: function (container, config, onChange) {
    container.innerHTML =
      '<label class="editor-field"><span>Search engine URL</span>' +
      '<input type="text" value="' + Hub.escapeHtml(config.searchBaseUrl || "https://duckduckgo.com/?q=") + '" data-key="searchBaseUrl" /></label>';
    container.querySelector("[data-key]").addEventListener("input", function (e) {
      config.searchBaseUrl = e.target.value;
      onChange(config);
    });
  },

  defaultConfig: function () {
    return { searchBaseUrl: "https://duckduckgo.com/?q=" };
  }
});
