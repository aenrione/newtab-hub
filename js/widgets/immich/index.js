/* ── Immich widget plugin ── */

Hub.injectStyles("widget-immich", `
  .immich-stats {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 6px;
    padding: 8px 12px 12px;
  }
  .immich-stat {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 8px 10px;
    border-radius: var(--radius-sm);
    background: var(--surface);
  }
  .immich-stat-value {
    font-size: 1.15rem;
    font-weight: 700;
    font-family: var(--font-display);
    color: var(--text);
    line-height: 1;
  }
  .immich-stat-label {
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--muted);
  }
`);

Hub.registry.register("immich", {
  label: "Immich",
  icon: "https://immich.app/favicon.ico",
  manualRefresh: true,

  credentialFields: [
    { key: "apiKey", label: "API Key", type: "password" }
  ],

  defaultConfig: function () {
    return { title: "Immich", url: "http://localhost:2283" };
  },

  render: function (container, config) {
    container.innerHTML =
      '<div class="widget-header"><h2>' + Hub.escapeHtml(config.title || "Immich") + "</h2></div>" +
      '<div class="immich-stats"><div class="empty-state">Loading\u2026</div></div>';
  },

  load: async function (container, config, state, token) {
    var statsEl = container.querySelector(".immich-stats");

    var creds = await Hub.credentials.load(config._id);
    if (token !== state.renderToken) return;
    if (!creds || !creds.apiKey) {
      statsEl.innerHTML = '<div class="empty-state">Add your Immich API key<br>in the widget editor.</div>';
      return;
    }

    var base = (config.url || "http://localhost:2283").replace(/\/$/, "");
    var opts = { headers: { "x-api-key": creds.apiKey } };

    var data;
    try {
      data = await Hub.cachedFetchJSON(
        base + "/api/server-info/statistics",
        "immich",
        state.store,
        opts,
        Hub.cache.scopeKey(config._id, "immich::" + base)
      );
    } catch (_) {
      if (token !== state.renderToken) return;
      statsEl.innerHTML = '<div class="empty-state">Could not reach Immich.</div>';
      return;
    }

    if (token !== state.renderToken) return;

    var photos = (data && typeof data.photos === "number") ? data.photos : 0;
    var videos = (data && typeof data.videos === "number") ? data.videos : 0;
    var total = (data && typeof data.usage === "number")
      ? data.usage
      : photos + videos;

    var stats = [
      { label: "Photos", value: photos },
      { label: "Videos", value: videos },
      { label: "Total Assets", value: photos + videos },
      { label: "Storage Used", value: immichFormatBytes(total) }
    ];

    var html = "";
    stats.forEach(function (s) {
      html +=
        '<div class="immich-stat">' +
          '<span class="immich-stat-value">' + Hub.escapeHtml(String(s.value)) + "</span>" +
          '<span class="immich-stat-label">' + Hub.escapeHtml(s.label) + "</span>" +
        "</div>";
    });

    statsEl.innerHTML = html;
  },

  renderEditor: function (container, config, onChange) {
    container.replaceChildren();

    var titleLabel = document.createElement("label");
    titleLabel.className = "editor-field";
    titleLabel.innerHTML =
      "<span>Widget title</span>" +
      '<input type="text" value="' + Hub.escapeHtml(config.title || "Immich") + '" />';
    var titleInput = titleLabel.querySelector("input");
    titleInput.addEventListener("input", function (e) {
      config.title = e.target.value;
      onChange(config);
    });
    container.appendChild(titleLabel);

    var urlLabel = document.createElement("label");
    urlLabel.className = "editor-field";
    urlLabel.innerHTML =
      "<span>Immich URL</span>" +
      '<input type="text" value="' + Hub.escapeHtml(config.url || "http://localhost:2283") + '" />';
    urlLabel.querySelector("input").addEventListener("input", function (e) {
      config.url = e.target.value;
      onChange(config);
    });
    container.appendChild(urlLabel);
  }
});

/* ── Helpers ── */
function immichFormatBytes(bytes) {
  if (!bytes || bytes === 0) return "0 B";
  var units = ["B", "KB", "MB", "GB", "TB"];
  var i = Math.floor(Math.log(bytes) / Math.log(1024));
  if (i >= units.length) i = units.length - 1;
  return (bytes / Math.pow(1024, i)).toFixed(1) + " " + units[i];
}
