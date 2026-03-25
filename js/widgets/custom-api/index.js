/* ── Custom API widget plugin ── */

Hub.injectStyles("widget-custom-api", `
  .capi-body { overflow: hidden; }
  .capi-list { display: grid; gap: 1px; }
  .capi-row {
    display: flex;
    align-items: baseline;
    gap: 8px;
    padding: 5px 8px;
    border-radius: var(--radius-sm);
    font-size: 0.84rem;
    overflow: hidden;
    min-width: 0;
  }
  .capi-key { color: var(--muted); font-size: 0.72rem; flex-shrink: 0; min-width: 80px; }
  .capi-value { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 500; }
  .capi-json {
    font-family: var(--font-display);
    font-size: 0.74rem;
    color: var(--text);
    white-space: pre-wrap;
    word-break: break-all;
    padding: 8px;
    background: var(--surface-hover);
    border-radius: var(--radius-sm);
    max-height: 300px;
    overflow: auto;
  }
  .capi-items { display: grid; gap: 1px; }
  .capi-item {
    display: flex;
    align-items: baseline;
    gap: 8px;
    padding: 5px 8px;
    border-radius: var(--radius-sm);
    font-size: 0.84rem;
  }
  .widget-custom-api .editor-field--col { flex-direction: column; align-items: flex-start; gap: 4px; }
  .widget-custom-api .editor-field--col textarea {
    width: 100%;
    min-height: 60px;
    padding: 6px 8px;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--bg);
    color: var(--text);
    font-size: 0.78rem;
    font-family: var(--font-display);
    resize: vertical;
  }
  .widget-custom-api .editor-field--col textarea:focus { outline: none; border-color: var(--accent-2); }
`);

Hub.registry.register("custom-api", {
  label: "Custom API",
  icon: "\uD83D\uDD0C",

  render: function (container, config) {
    container.className += " widget-custom-api";
    var title = (config.title || "").trim();
    container.innerHTML =
      (title ? '<div class="widget-header"><h2>' + Hub.escapeHtml(title) + '</h2></div>' : '') +
      '<div class="capi-body"><div class="empty-state">Loading\u2026</div></div>';
  },

  load: async function (container, config, state, token) {
    var bodyEl = container.querySelector(".capi-body");
    var url = (config.url || "").trim();
    if (!url) {
      bodyEl.innerHTML = '<div class="empty-state">Set an API URL in the widget editor.</div>';
      return;
    }

    var headers = {};
    (config.headers || []).forEach(function (h) {
      if (h.key && h.value) headers[h.key] = h.value;
    });

    try {
      var cacheKey = "capi::" + url;
      var data = Hub.cache.get(cacheKey);
      if (!data) {
        var res = await Hub.fetchWithTimeout(url, {
          method: config.method || "GET",
          headers: headers
        }, 12000);
        if (!res.ok) throw new Error("HTTP " + res.status);
        data = await res.json();
        Hub.cache.set(cacheKey, data, "default", state.store);
      }

      if (token !== state.renderToken) return;

      var template = (config.template || "").trim();
      if (template) {
        /* Template mode: substitute {{path}} placeholders */
        if (Array.isArray(data)) {
          var limit = Math.min(config.limit || 10, 50);
          var html = '<div class="capi-items">';
          data.slice(0, limit).forEach(function (item) {
            html += '<div class="capi-item">' + capiApplyTemplate(template, item) + '</div>';
          });
          html += '</div>';
          bodyEl.innerHTML = html;
        } else {
          bodyEl.innerHTML = '<div class="capi-item">' + capiApplyTemplate(template, data) + '</div>';
        }
      } else if (Array.isArray(data)) {
        /* Array mode: show as rows with key-value pairs from first few fields */
        var limit = Math.min(config.limit || 10, 50);
        var frag = document.createDocumentFragment();
        var listEl = document.createElement("div");
        listEl.className = "capi-items";
        data.slice(0, limit).forEach(function (item) {
          var row = document.createElement("div");
          row.className = "capi-row";
          if (typeof item === "object" && item !== null) {
            var keys = Object.keys(item).slice(0, 3);
            row.innerHTML = keys.map(function (k) {
              return '<span class="capi-key">' + Hub.escapeHtml(k) + '</span>' +
                     '<span class="capi-value">' + Hub.escapeHtml(String(item[k] !== null && item[k] !== undefined ? item[k] : "")) + '</span>';
            }).join('');
          } else {
            row.innerHTML = '<span class="capi-value">' + Hub.escapeHtml(String(item)) + '</span>';
          }
          listEl.appendChild(row);
        });
        frag.appendChild(listEl);
        bodyEl.replaceChildren(frag);
      } else {
        /* Object / primitive: pretty-print JSON */
        var pre = document.createElement("pre");
        pre.className = "capi-json";
        pre.textContent = JSON.stringify(data, null, 2);
        bodyEl.replaceChildren(pre);
      }
    } catch (err) {
      if (token !== state.renderToken) return;
      bodyEl.innerHTML = '<div class="empty-state">' + Hub.escapeHtml("Error: " + (err && err.message || "Failed to load")) + '</div>';
    }
  },

  renderEditor: function (container, config, onChange, navOptions) {
    container.replaceChildren();
    container.className += " widget-custom-api";

    var titleLabel = document.createElement("label");
    titleLabel.className = "editor-field";
    titleLabel.innerHTML = '<span>Widget title (optional)</span><input type="text" value="' + Hub.escapeHtml(config.title || "") + '" />';
    titleLabel.querySelector("input").addEventListener("input", function (e) { config.title = e.target.value; onChange(config); });
    container.appendChild(titleLabel);

    var urlLabel = document.createElement("label");
    urlLabel.className = "editor-field";
    urlLabel.innerHTML = '<span>API URL</span><input type="url" value="' + Hub.escapeHtml(config.url || "") + '" placeholder="https://api.example.com/data" />';
    urlLabel.querySelector("input").addEventListener("input", function (e) { config.url = e.target.value; onChange(config); });
    container.appendChild(urlLabel);

    var methodLabel = document.createElement("label");
    methodLabel.className = "editor-field";
    var methodVal = config.method || "GET";
    methodLabel.innerHTML =
      '<span>Method</span>' +
      '<select>' +
        '<option value="GET"' + (methodVal === "GET" ? " selected" : "") + '>GET</option>' +
        '<option value="POST"' + (methodVal === "POST" ? " selected" : "") + '>POST</option>' +
      '</select>';
    methodLabel.querySelector("select").addEventListener("change", function (e) { config.method = e.target.value; onChange(config); });
    container.appendChild(methodLabel);

    var limitLabel = document.createElement("label");
    limitLabel.className = "editor-field";
    limitLabel.innerHTML = '<span>Max rows (for arrays)</span><input type="number" min="1" max="50" value="' + (config.limit || 10) + '" />';
    limitLabel.querySelector("input").addEventListener("input", function (e) {
      var n = parseInt(e.target.value, 10);
      if (n > 0 && n <= 50) { config.limit = n; onChange(config); }
    });
    container.appendChild(limitLabel);

    var tplHint = document.createElement("p");
    tplHint.className = "editor-hint";
    tplHint.textContent = 'Optional HTML template. Use {{field}} or {{nested.field}} to substitute values. Applied per item for arrays.';
    container.appendChild(tplHint);

    var tplLabel = document.createElement("label");
    tplLabel.className = "editor-field editor-field--col";
    tplLabel.innerHTML =
      '<span>Template (optional)</span>' +
      '<textarea rows="4" placeholder="<b>{{name}}</b> &mdash; {{status}}">' +
      Hub.escapeHtml(config.template || "") +
      '</textarea>';
    tplLabel.querySelector("textarea").addEventListener("input", function (e) { config.template = e.target.value; onChange(config); });
    container.appendChild(tplLabel);

    var hdrHint = document.createElement("p");
    hdrHint.className = "editor-hint";
    hdrHint.textContent = "Optional request headers (e.g. Authorization, Accept).";
    container.appendChild(hdrHint);

    var hdrsWrap = document.createElement("div");
    container.appendChild(hdrsWrap);
    buildListEditor(hdrsWrap, config, "headers", onChange, [
      { key: "key", label: "Header" },
      { key: "value", label: "Value" }
    ], function () { return { key: "", value: "" }; }, navOptions);
  },

  defaultConfig: function () {
    return { title: "", url: "", method: "GET", limit: 10, template: "", headers: [] };
  }
});

/* ── Template renderer ── */

function capiApplyTemplate(template, data) {
  return template.replace(/\{\{([\w.]+)\}\}/g, function (_, path) {
    var parts = path.split(".");
    var val = data;
    for (var i = 0; i < parts.length; i++) {
      if (val == null) break;
      val = val[parts[i]];
    }
    return Hub.escapeHtml(val != null ? String(val) : "");
  });
}
