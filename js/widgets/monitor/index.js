/* ── Monitor widget plugin ── */

Hub.injectStyles("widget-monitor", `
  .monitor-list { display: grid; gap: 1px; }
  .monitor-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 7px 8px;
    border-radius: var(--radius-sm);
    color: var(--text);
    text-decoration: none;
    font-size: 0.86rem;
    transition: background 80ms;
  }
  .monitor-row:hover { background: var(--surface-hover); }
  .monitor-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
    background: var(--muted);
  }
  .monitor-dot.is-up { background: var(--ok); }
  .monitor-dot.is-down { background: var(--down); }
  .monitor-dot.is-checking {
    background: var(--muted);
    animation: monitor-pulse 1.2s ease-in-out infinite;
  }
  @keyframes monitor-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.25; }
  }
  .monitor-label { flex: 1; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .monitor-status { font-size: 0.72rem; color: var(--muted); flex-shrink: 0; }
  .monitor-status.is-up { color: var(--ok); }
  .monitor-status.is-down { color: var(--down); }
  .monitor-ms { font-size: 0.68rem; color: var(--muted); flex-shrink: 0; font-family: var(--font-display); min-width: 36px; text-align: right; }
`);

Hub.registry.register("monitor", {
  label: "Monitor",
  icon: "monitor",

  render: function (container, config) {
    container.innerHTML =
      '<div class="widget-header"><h2>' + Hub.escapeHtml(config.title || "Monitor") + '</h2></div>' +
      '<div class="monitor-list"><div class="empty-state">Loading\u2026</div></div>';
  },

  load: async function (container, config, state, token) {
    var listEl = container.querySelector(".monitor-list");
    var sites = config.sites || [];
    if (!sites.length) {
      listEl.innerHTML = '<div class="empty-state">Add sites in the widget editor.</div>';
      return;
    }

    /* Render skeleton rows immediately so the user sees something */
    var frag = document.createDocumentFragment();
    sites.forEach(function (site) {
      var a = Hub.createLink("monitor-row", site.url || "#", site.label || site.url || "");
      a.innerHTML =
        '<span class="monitor-dot is-checking"></span>' +
        '<span class="monitor-label">' + Hub.escapeHtml(site.label || site.url || "") + '</span>' +
        '<span class="monitor-status"></span>' +
        '<span class="monitor-ms"></span>';
      frag.appendChild(a);
    });
    listEl.replaceChildren(frag);

    /* Check each site independently */
    sites.forEach(function (site, i) {
      var row = listEl.children[i];
      if (!row || !site.url) return;
      var dot = row.querySelector(".monitor-dot");
      var statusEl = row.querySelector(".monitor-status");
      var msEl = row.querySelector(".monitor-ms");
      var start = Date.now();

      /* no-cors: resolves on any server response (opaque), rejects only on
         network failure or timeout — perfect for LAN / uptime monitoring */
      Hub.fetchWithTimeout(site.url, { mode: "no-cors" }, 8000)
        .then(function () {
          if (token !== state.renderToken) return;
          var ms = Date.now() - start;
          dot.className = "monitor-dot is-up";
          statusEl.textContent = "Up";
          statusEl.className = "monitor-status is-up";
          msEl.textContent = ms + "ms";
        })
        .catch(function (err) {
          if (token !== state.renderToken) return;
          var isTimeout = err && err.name === "AbortError";
          dot.className = "monitor-dot is-down";
          statusEl.textContent = isTimeout ? "Timeout" : "Down";
          statusEl.className = "monitor-status is-down";
        });
    });
  },

  renderEditor: function (container, config, onChange, navOptions) {
    container.replaceChildren();

    var titleLabel = document.createElement("label");
    titleLabel.className = "editor-field";
    titleLabel.innerHTML = '<span>Widget title</span><input type="text" value="' + Hub.escapeHtml(config.title || "Monitor") + '" />';
    var titleInput = titleLabel.querySelector("input");
    titleInput.dataset.navHeaderField = "";
    titleInput.addEventListener("input", function (e) { config.title = e.target.value; onChange(config); });
    container.appendChild(titleLabel);

    var hint = document.createElement("p");
    hint.className = "editor-hint";
    hint.textContent = 'Sites are checked with a no-cors fetch. "Up" means a network response was received; "Down" means the host is unreachable or timed out.';
    container.appendChild(hint);

    var itemsWrap = document.createElement("div");
    container.appendChild(itemsWrap);
    buildListEditor(itemsWrap, config, "sites", onChange, [
      { key: "label", label: "Label" },
      { key: "url", label: "URL" }
    ], function () { return { label: "", url: "https://" }; }, navOptions);
  },

  defaultConfig: function () {
    return {
      title: "Monitor",
      sites: [
        { label: "Google", url: "https://google.com" },
        { label: "GitHub", url: "https://github.com" }
      ]
    };
  }
});
