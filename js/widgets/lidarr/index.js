/* ── Lidarr widget plugin ── */

Hub.injectStyles("widget-lidarr", `
  .lidarr-stats {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 6px;
    padding: 8px 12px 12px;
  }
  .lidarr-stat {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 8px 10px;
    border-radius: var(--radius-sm);
    background: var(--surface);
  }
  .lidarr-stat-value {
    font-size: 1.15rem;
    font-weight: 700;
    font-family: var(--font-display);
    color: var(--text);
    line-height: 1;
  }
  .lidarr-stat-label {
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--muted);
  }
`);

Hub.registry.register("lidarr", {
  label: "Lidarr",
  icon: "assets/widget-icons/lidarr.svg",
  manualRefresh: true,

  credentialFields: [
    { key: "apiKey", label: "API Key", type: "password" }
  ],

  defaultConfig: function () {
    return { title: "Lidarr", url: "http://localhost:8686" };
  },

  render: function (container, config) {
    container.innerHTML =
      '<div class="widget-header"><h2>' + Hub.escapeHtml(config.title || "Lidarr") + "</h2></div>" +
      '<div class="lidarr-stats"><div class="empty-state">Loading\u2026</div></div>';
  },

  load: async function (container, config, state, token) {
    var statsEl = container.querySelector(".lidarr-stats");

    var creds = await Hub.credentials.load(config._id);
    if (token !== state.renderToken) return;
    if (!creds.apiKey) {
      statsEl.innerHTML = '<div class="empty-state">Add your Lidarr API key<br>in the widget editor.</div>';
      return;
    }

    var base = (config.url || "http://localhost:8686").replace(/\/$/, "");
    var qs = "?apikey=" + encodeURIComponent(creds.apiKey);
    var opts = {};

    var artists, wanted, queue;
    try {
      var results = await Promise.all([
        Hub.cachedFetchJSON(
          base + "/api/v1/artist" + qs,
          "lidarr",
          state.store,
          opts,
          Hub.cache.scopeKey(config._id, "lidarr::" + base + "/api/v1/artist")
        ),
        Hub.cachedFetchJSON(
          base + "/api/v1/wanted/missing" + qs,
          "lidarr",
          state.store,
          opts,
          Hub.cache.scopeKey(config._id, "lidarr::" + base + "/api/v1/wanted/missing")
        ),
        Hub.cachedFetchJSON(
          base + "/api/v1/queue/status" + qs,
          "lidarr",
          state.store,
          opts,
          Hub.cache.scopeKey(config._id, "lidarr::" + base + "/api/v1/queue/status")
        )
      ]);
      artists = results[0];
      wanted = results[1];
      queue = results[2];
    } catch (_) {
      if (token !== state.renderToken) return;
      statsEl.innerHTML = '<div class="empty-state">Could not reach Lidarr.</div>';
      return;
    }

    if (token !== state.renderToken) return;

    var artistCount = Array.isArray(artists) ? artists.length : 0;
    var wantedCount = (wanted && typeof wanted.totalRecords === "number") ? wanted.totalRecords : 0;
    var queuedCount = (queue && typeof queue.totalCount === "number") ? queue.totalCount : 0;

    var stats = [
      { label: "Artists", value: artistCount },
      { label: "Wanted",  value: wantedCount },
      { label: "Queued",  value: queuedCount }
    ];

    var html = "";
    stats.forEach(function (s) {
      html +=
        '<div class="lidarr-stat">' +
          '<span class="lidarr-stat-value">' + Hub.escapeHtml(String(s.value)) + "</span>" +
          '<span class="lidarr-stat-label">' + Hub.escapeHtml(s.label) + "</span>" +
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
      '<input type="text" value="' + Hub.escapeHtml(config.title || "Lidarr") + '" />';
    var titleInput = titleLabel.querySelector("input");
    titleInput.addEventListener("input", function (e) {
      config.title = e.target.value;
      onChange(config);
    });
    container.appendChild(titleLabel);

    var urlLabel = document.createElement("label");
    urlLabel.className = "editor-field";
    urlLabel.innerHTML =
      "<span>Lidarr URL</span>" +
      '<input type="text" value="' + Hub.escapeHtml(config.url || "http://localhost:8686") + '" />';
    urlLabel.querySelector("input").addEventListener("input", function (e) {
      config.url = e.target.value;
      onChange(config);
    });
    container.appendChild(urlLabel);
  }
});
