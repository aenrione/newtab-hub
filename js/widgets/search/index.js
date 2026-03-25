/* ── Search widget plugin ── */

Hub.injectStyles("widget-search", `
  .widget-search { border: none; padding: 0; overflow: visible; }
  .widget-search::before { display: none; }
  .search-wrap {
    display: flex;
    align-items: center;
    gap: 10px;
    height: 46px;
    padding: 0 14px;
    border: var(--border-width) solid var(--border);
    border-radius: var(--radius-lg);
    background: transparent;
    position: relative;
    transition: box-shadow 120ms;
  }
  .search-wrap:focus-within { box-shadow: 0 0 0 2px rgba(121, 174, 232, 0.15); }
  .search-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border-radius: var(--radius-sm);
    background: rgba(121, 174, 232, 0.14);
    color: var(--accent-2);
    font-size: 11px;
    font-weight: 700;
    flex-shrink: 0;
  }
  #quick-search {
    width: 100%;
    border: 0;
    outline: none;
    background: transparent;
    color: var(--text);
    font-size: 1rem;
  }
  #quick-search::placeholder { color: var(--muted); }
  #quick-search::-webkit-search-decoration,
  #quick-search::-webkit-search-cancel-button,
  #quick-search::-webkit-search-results-button,
  #quick-search::-webkit-search-results-decoration { -webkit-appearance: none; display: none; }
  .search-results {
    position: absolute;
    z-index: 20;
    left: 0; right: 0;
    top: calc(100% + 4px);
    display: grid;
    gap: 2px;
    padding: 4px;
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-md);
    background: var(--surface);
    box-shadow: 0 8px 24px rgba(2, 6, 23, 0.3);
  }
  .search-result {
    display: grid;
    gap: 1px;
    width: 100%;
    padding: 6px 8px;
    border: none;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--text);
    text-align: left;
    cursor: pointer;
    font-size: 0.84rem;
    transition: background 80ms;
  }
  .search-result:hover, .search-result.active-result { background: var(--surface-hover); }
  .search-result small { color: var(--muted); font-size: 0.74rem; }
`);

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
