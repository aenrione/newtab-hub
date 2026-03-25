/* ── Change Detection widget plugin ── */

Hub.injectStyles("widget-change-detection", `
  .cd-list { display: grid; gap: 1px; }
  .cd-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 7px 8px;
    border-radius: var(--radius-sm);
    color: var(--text);
    text-decoration: none;
    font-size: 0.86rem;
    transition: background 80ms;
    overflow: hidden;
    min-width: 0;
  }
  .cd-row:hover { background: var(--surface-hover); }
  .cd-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
    background: var(--muted);
  }
  .cd-dot.has-change { background: var(--accent-2); }
  .cd-dot.has-error { background: var(--down); }
  .cd-label { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 500; }
  .cd-age { font-size: 0.68rem; color: var(--muted); flex-shrink: 0; }
  .cd-badge {
    font-size: 0.6rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    padding: 1px 5px;
    border-radius: 3px;
    flex-shrink: 0;
  }
  .cd-badge.has-change { background: rgba(var(--accent-2-rgb, 100,160,230), 0.15); color: var(--accent-2); }
  .cd-badge.has-error { background: rgba(220,60,60,0.12); color: var(--down); }
`);

Hub.registry.register("change-detection", {
  label: "Change Detection",
  icon: "eye",
  manualRefresh: true,

  credentialFields: [
    { key: "apiKey", label: "API Key", type: "password" }
  ],

  render: function (container, config) {
    container.innerHTML =
      '<div class="widget-header"><h2>' + Hub.escapeHtml(config.title || "Change Detection") + '</h2></div>' +
      '<div class="cd-list"><div class="empty-state">Loading\u2026</div></div>';
  },

  load: async function (container, config, state, token) {
    var listEl = container.querySelector(".cd-list");
    var instanceUrl = (config.url || "").replace(/\/$/, "");
    if (!instanceUrl) {
      listEl.innerHTML = '<div class="empty-state">Set your changedetection.io URL in the widget editor.</div>';
      return;
    }

    var creds = await Hub.credentials.load(config._id);
    if (!creds.apiKey) {
      listEl.innerHTML = '<div class="empty-state">Add your API key in the widget editor.</div>';
      return;
    }

    var limit = Math.min(config.limit || 10, 50);
    var url = instanceUrl + "/api/v1/watch?limit=" + limit;
    var store = state.store;

    try {
      var cacheKey = Hub.cache.scopeKey(config._id, "cd::" + url);
      var data = Hub.cache.get(cacheKey);
      if (!data) {
        var res = await Hub.fetchWithTimeout(url, {
          headers: { "x-api-key": creds.apiKey }
        }, 10000);
        if (!res.ok) throw new Error(String(res.status));
        data = await res.json();
        Hub.cache.set(cacheKey, data, "default", store);
      }

      if (token !== state.renderToken) return;

      /* API returns an object keyed by UUID */
      var watches = Object.values(data || {});
      if (!watches.length) {
        listEl.innerHTML = '<div class="empty-state">No watches configured.</div>';
        return;
      }

      /* Sort by last_changed descending */
      watches.sort(function (a, b) {
        return (b.last_changed || 0) - (a.last_changed || 0);
      });

      var frag = document.createDocumentFragment();
      watches.slice(0, limit).forEach(function (watch) {
        var label = watch.title || watch.url || "Watch";
        var href = watch.url || instanceUrl;
        var hasChange = watch.last_changed && watch.last_changed > (watch.last_checked - 300);
        var hasError = !!watch.last_error;
        var age = watch.last_changed ? cdAge(watch.last_changed * 1000) : "";

        state.links.push({ title: label, href: href, type: "change-detection" });

        var a = Hub.createLink("cd-row", href, label);
        a.dataset.searchText = label;
        a.innerHTML =
          '<span class="cd-dot' + (hasError ? " has-error" : hasChange ? " has-change" : "") + '"></span>' +
          '<span class="cd-label">' + Hub.escapeHtml(label) + '</span>' +
          (hasError
            ? '<span class="cd-badge has-error">Error</span>'
            : hasChange
              ? '<span class="cd-badge has-change">Changed</span>'
              : '') +
          (age ? '<span class="cd-age">' + Hub.escapeHtml(age) + '</span>' : '');
        frag.appendChild(a);
      });

      listEl.replaceChildren(frag);
    } catch (err) {
      if (token !== state.renderToken) return;
      var msg = String(err && err.message || "").includes("403")
        ? "Invalid API key."
        : "Failed to connect to changedetection.io.";
      listEl.innerHTML = '<div class="empty-state">' + Hub.escapeHtml(msg) + '</div>';
    }
  },

  renderEditor: function (container, config, onChange) {
    container.replaceChildren();

    var titleLabel = document.createElement("label");
    titleLabel.className = "editor-field";
    titleLabel.innerHTML = '<span>Widget title</span><input type="text" value="' + Hub.escapeHtml(config.title || "Change Detection") + '" />';
    titleLabel.querySelector("input").addEventListener("input", function (e) { config.title = e.target.value; onChange(config); });
    container.appendChild(titleLabel);

    var urlLabel = document.createElement("label");
    urlLabel.className = "editor-field";
    urlLabel.innerHTML = '<span>Instance URL</span><input type="url" value="' + Hub.escapeHtml(config.url || "") + '" placeholder="http://changedetection.local:5000" />';
    urlLabel.querySelector("input").addEventListener("input", function (e) { config.url = e.target.value; onChange(config); });
    container.appendChild(urlLabel);

    var limitLabel = document.createElement("label");
    limitLabel.className = "editor-field";
    limitLabel.innerHTML = '<span>Max watches</span><input type="number" min="1" max="50" value="' + (config.limit || 10) + '" />';
    limitLabel.querySelector("input").addEventListener("input", function (e) {
      var n = parseInt(e.target.value, 10);
      if (n > 0 && n <= 50) { config.limit = n; onChange(config); }
    });
    container.appendChild(limitLabel);
  },

  defaultConfig: function () {
    return { title: "Change Detection", url: "", limit: 10 };
  }
});

function cdAge(ms) {
  if (!ms) return "";
  var diff = Date.now() - ms;
  var mins = Math.floor(diff / 60000);
  if (mins < 60) return mins + "m ago";
  var hours = Math.floor(mins / 60);
  if (hours < 24) return hours + "h ago";
  return Math.floor(hours / 24) + "d ago";
}
