/* ── Radarr widget plugin ── */

Hub.injectStyles("widget-radarr", `
  .radarr-stats {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 6px;
    padding: 8px 12px 12px;
  }
  .radarr-stat {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 8px 10px;
    border-radius: var(--radius-sm);
    background: var(--surface);
  }
  .radarr-stat-value {
    font-size: 1.15rem;
    font-weight: 700;
    font-family: var(--font-display);
    color: var(--text);
    line-height: 1;
  }
  .radarr-stat-label {
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--muted);
  }
`);

Hub.registry.register("radarr", {
  label: "Radarr",
  icon: "assets/widget-icons/radarr.svg",
  manualRefresh: true,

  credentialFields: [
    { key: "apiKey", label: "API Key", type: "password" }
  ],

  defaultConfig: function () {
    return { title: "Radarr", url: "http://localhost:7878" };
  },

  render: function (container, config) {
    container.innerHTML =
      '<div class="widget-header"><h2>' + Hub.escapeHtml(config.title || "Radarr") + "</h2></div>" +
      '<div class="radarr-stats"><div class="empty-state">Loading\u2026</div></div>';
  },

  load: async function (container, config, state, token) {
    var statsEl = container.querySelector(".radarr-stats");

    var creds = await Hub.credentials.load(config._id);
    if (token !== state.renderToken) return;
    if (!creds.apiKey) {
      statsEl.innerHTML = '<div class="empty-state">Add your Radarr API key<br>in the widget editor.</div>';
      return;
    }

    var base = (config.url || "http://localhost:7878").replace(/\/$/, "");
    var opts = { headers: { "X-Api-Key": creds.apiKey } };

    var movies, queue;
    try {
      var results = await Promise.all([
        Hub.cachedFetchJSON(base + "/api/v3/movie", "radarr", state.store, opts, Hub.cache.scopeKey(config._id, "radarr::" + base + "/api/v3/movie")),
        Hub.cachedFetchJSON(base + "/api/v3/queue/status", "radarr", state.store, opts, Hub.cache.scopeKey(config._id, "radarr::" + base + "/api/v3/queue/status"))
      ]);
      movies = results[0];
      queue = results[1];
    } catch (_) {
      if (token !== state.renderToken) return;
      statsEl.innerHTML = '<div class="empty-state">Could not reach Radarr.</div>';
      return;
    }

    if (token !== state.renderToken) return;

    var total = Array.isArray(movies) ? movies.length : 0;
    var monitored = Array.isArray(movies) ? movies.filter(function (m) { return m.monitored; }).length : 0;
    var available = Array.isArray(movies) ? movies.filter(function (m) { return m.hasFile; }).length : 0;
    var missing = Array.isArray(movies) ? movies.filter(function (m) { return m.monitored && !m.hasFile; }).length : 0;
    var queued = (queue && typeof queue.totalCount === "number") ? queue.totalCount : 0;

    var stats = [
      { label: "Movies", value: total },
      { label: "Available", value: available },
      { label: "Missing", value: missing },
      { label: "Queued", value: queued }
    ];

    var html = "";
    stats.forEach(function (s) {
      html +=
        '<div class="radarr-stat">' +
          '<span class="radarr-stat-value">' + Hub.escapeHtml(String(s.value)) + "</span>" +
          '<span class="radarr-stat-label">' + Hub.escapeHtml(s.label) + "</span>" +
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
      '<input type="text" value="' + Hub.escapeHtml(config.title || "Radarr") + '" />';
    var titleInput = titleLabel.querySelector("input");
    titleInput.addEventListener("input", function (e) {
      config.title = e.target.value;
      onChange(config);
    });
    container.appendChild(titleLabel);

    var urlLabel = document.createElement("label");
    urlLabel.className = "editor-field";
    urlLabel.innerHTML =
      "<span>Radarr URL</span>" +
      '<input type="text" value="' + Hub.escapeHtml(config.url || "http://localhost:7878") + '" />';
    urlLabel.querySelector("input").addEventListener("input", function (e) {
      config.url = e.target.value;
      onChange(config);
    });
    container.appendChild(urlLabel);
  }
});
