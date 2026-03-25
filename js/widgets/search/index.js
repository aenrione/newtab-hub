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
  .quick-search {
    width: 100%;
    border: 0;
    outline: none;
    background: transparent;
    color: var(--text);
    font-size: 1rem;
  }
  .quick-search::placeholder { color: var(--muted); }
  .quick-search::-webkit-search-decoration,
  .quick-search::-webkit-search-cancel-button,
  .quick-search::-webkit-search-results-button,
  .quick-search::-webkit-search-results-decoration { -webkit-appearance: none; display: none; }
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
  .search-config-note { margin-top: 2px; }
  .search-source-limit-input {
    width: 56px;
    margin-left: 6px;
    padding: 4px 6px;
    border: var(--border-width) solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--surface);
    color: var(--text);
  }
`);

function normalizeSearchWidgetConfig(config) {
  var normalized = Object.assign({
    searchBaseUrl: "https://duckduckgo.com/?q=",
    placeholder: "Search links, feeds, or type a URL",
    focusKey: "/",
    autoFocusOnLoad: true,
    sources: {
      dashboard: true,
      bookmarks: true,
      history: true,
      webSearch: true
    },
    sourceLimits: {
      dashboard: 6,
      bookmarks: 5,
      history: 5
    }
  }, config || {});

  normalized.placeholder = String(normalized.placeholder || "").trim() || "Search links, feeds, or type a URL";

  normalized.focusKey = sanitizeFocusKeyInput(normalized.focusKey);

  if (normalized.autoFocusOnLoad === "false" || normalized.autoFocusOnLoad === 0 || normalized.autoFocusOnLoad === "0") {
    normalized.autoFocusOnLoad = false;
  } else {
    normalized.autoFocusOnLoad = normalized.autoFocusOnLoad !== false;
  }

  normalized.sources = Hub.search && Hub.search.normalizeSourceConfig
    ? Hub.search.normalizeSourceConfig(normalized.sources)
    : Object.assign({ dashboard: true, bookmarks: true, history: true, webSearch: true }, normalized.sources || {});

  normalized.sourceLimits = Hub.search && Hub.search.normalizeSourceLimits
    ? Hub.search.normalizeSourceLimits(normalized.sourceLimits)
    : Object.assign({ dashboard: 6, bookmarks: 5, history: 5 }, normalized.sourceLimits || {});

  return normalized;
}

function displayFocusKey(key) {
  return key ? String(key).toUpperCase() : "";
}

function sanitizeFocusKeyInput(value) {
  var text = String(value || "").trim();
  return text ? text.slice(-1).toLowerCase() : "";
}

Hub.searchWidget = Hub.searchWidget || {};
Hub.searchWidget.normalizeConfig = normalizeSearchWidgetConfig;
Hub.searchWidget.displayFocusKey = displayFocusKey;
Hub.searchWidget.sanitizeFocusKeyInput = sanitizeFocusKeyInput;

Hub.registry.register("search", {
  label: "Search",
  icon: "search",

  render: function (container, config) {
    config = normalizeSearchWidgetConfig(config);
    var widgetId = (config && config._id) || Hub.uid();
    var inputId = "quick-search-" + widgetId;
    container.style.position = "relative";
    container.innerHTML =
      '<label class="search-wrap" for="' + Hub.escapeHtml(inputId) + '">' +
        '<span class="search-icon">' + Hub.escapeHtml(displayFocusKey(config.focusKey)) + '</span>' +
        '<input id="' + Hub.escapeHtml(inputId) + '" class="quick-search" data-search-input="true" type="search" autocomplete="off" spellcheck="false" placeholder="' + Hub.escapeHtml(config.placeholder) + '" />' +
      '</label>' +
      '<div class="search-results hidden" data-search-results="true" aria-live="polite"></div>';
  },

  renderEditor: function (container, config, onChange) {
    config = normalizeSearchWidgetConfig(config);
    container.innerHTML =
      '<label class="editor-field"><span>Search engine URL</span>' +
      '<input type="text" value="' + Hub.escapeHtml(config.searchBaseUrl || "https://duckduckgo.com/?q=") + '" data-key="searchBaseUrl" /></label>';
    container.innerHTML +=
      '<label class="editor-field"><span>Placeholder text</span>' +
      '<input type="text" value="' + Hub.escapeHtml(config.placeholder) + '" data-key="placeholder" /></label>';
    container.innerHTML +=
      '<label class="editor-field"><span>Focus key</span>' +
      '<input type="text" value="' + Hub.escapeHtml(config.focusKey || "/") + '" maxlength="1" data-key="focusKey" /></label>';
    container.querySelectorAll("[data-key]").forEach(function (input) {
      if (input.dataset.key === "focusKey") {
        input.addEventListener("focus", function () {
          input.select();
        });
      }
      input.addEventListener("input", function (e) {
        if (e.target.dataset.key === "focusKey") {
          config.focusKey = sanitizeFocusKeyInput(e.target.value);
          e.target.value = config.focusKey;
        } else if (e.target.dataset.key === "placeholder") {
          config.placeholder = e.target.value;
        } else {
          config.searchBaseUrl = e.target.value;
        }
        onChange(normalizeSearchWidgetConfig(config));
      });
    });
    var autoFocusRow = document.createElement("label");
    autoFocusRow.className = "theme-scope-label";
    autoFocusRow.innerHTML = '<input type="checkbox" data-bool-key="autoFocusOnLoad" ' + ((config.autoFocusOnLoad !== false) ? 'checked' : '') + ' /> Focus on new tab open';
    autoFocusRow.querySelector("input").addEventListener("change", function (e) {
      config.autoFocusOnLoad = e.target.checked;
      onChange(config);
    });
    container.appendChild(autoFocusRow);

    var sourceSection = document.createElement("div");
    sourceSection.className = "style-controls";
    var sourceTitle = document.createElement("p");
    sourceTitle.className = "customize-label";
    sourceTitle.textContent = "Search sources";
    container.appendChild(sourceTitle);
    [
      { key: "dashboard", label: "Dashboard items", hasLimit: true },
      { key: "bookmarks", label: "Bookmarks", hasLimit: true },
      { key: "history", label: "History", hasLimit: true },
      { key: "webSearch", label: "Web search action", hasLimit: false }
    ].forEach(function (source) {
      var row = document.createElement("div");
      row.className = "style-control-row";
      var left = document.createElement("label");
      left.className = "theme-scope-label";
      left.innerHTML = '<input type="checkbox" data-source-key="' + source.key + '" ' + (config.sources[source.key] ? 'checked' : '') + ' /> ' + Hub.escapeHtml(source.label);
      left.querySelector("input").addEventListener("change", function (e) {
        config.sources[source.key] = e.target.checked;
        onChange(normalizeSearchWidgetConfig(config));
      });
      row.appendChild(left);
      if (source.hasLimit) {
        var limitWrap = document.createElement("label");
        limitWrap.className = "theme-scope-label";
        limitWrap.innerHTML = 'Limit <input class="search-source-limit-input" type="number" min="1" max="20" step="1" data-source-limit="' + source.key + '" value="' + Hub.escapeHtml(String(config.sourceLimits[source.key])) + '" />';
        limitWrap.querySelector("input").addEventListener("input", function (e) {
          config.sourceLimits[source.key] = e.target.value;
          onChange(normalizeSearchWidgetConfig(config));
          e.target.value = String(normalizeSearchWidgetConfig(config).sourceLimits[source.key]);
        });
        row.appendChild(limitWrap);
      }
      sourceSection.appendChild(row);
    });
    container.appendChild(sourceSection);

    var help = document.createElement("p");
    help.className = "theme-sidebar-intro search-config-note";
    help.textContent = "Focus key opens this search box. Pick which sources it searches, and turn off new-tab focus if this profile should open quietly.";
    container.appendChild(help);
  },

  defaultConfig: function () {
    return normalizeSearchWidgetConfig();
  }
});
