/* ── Prowlarr widget plugin ── */

Hub.injectStyles("widget-prowlarr", `
  .prowlarr-stats {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 6px;
    padding: 8px 12px 12px;
  }
  .prowlarr-stat {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 8px 10px;
    border-radius: var(--radius-sm);
    background: var(--surface);
  }
  .prowlarr-stat-value {
    font-size: 1.15rem;
    font-weight: 700;
    font-family: var(--font-display);
    color: var(--text);
    line-height: 1;
  }
  .prowlarr-stat-label {
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--muted);
  }
`);

Hub.registry.register("prowlarr", {
  label: "Prowlarr",
  icon: "\uD83D\uDD0D",
  manualRefresh: true,

  credentialFields: [
    { key: "apiKey", label: "API Key", type: "password" }
  ],

  defaultConfig: function () {
    return { title: "Prowlarr", url: "http://localhost:9696" };
  },

  render: function (container, config) {
    container.innerHTML =
      '<div class="widget-header"><h2>' + Hub.escapeHtml(config.title || "Prowlarr") + "</h2></div>" +
      '<div class="prowlarr-stats"><div class="empty-state">Loading\u2026</div></div>';
  },

  load: async function (container, config, state, token) {
    var statsEl = container.querySelector(".prowlarr-stats");

    var creds = await Hub.credentials.load(config._id);
    if (token !== state.renderToken) return;
    if (!creds.apiKey) {
      statsEl.innerHTML = '<div class="empty-state">Add your Prowlarr API key<br>in the widget editor.</div>';
      return;
    }

    var base = (config.url || "http://localhost:9696").replace(/\/$/, "");
    var key = encodeURIComponent(creds.apiKey);
    var opts = { headers: {} };

    var indexers, stats;
    try {
      var results = await Promise.all([
        Hub.cachedFetchJSON(
          base + "/api/v1/indexer?apikey=" + key,
          "prowlarr",
          state.store,
          opts,
          Hub.cache.scopeKey(config._id, "prowlarr::" + base + "/api/v1/indexer")
        ),
        Hub.cachedFetchJSON(
          base + "/api/v1/indexerstats?apikey=" + key,
          "prowlarr",
          state.store,
          opts,
          Hub.cache.scopeKey(config._id, "prowlarr::" + base + "/api/v1/indexerstats")
        )
      ]);
      indexers = results[0];
      stats = results[1];
    } catch (_) {
      if (token !== state.renderToken) return;
      statsEl.innerHTML = '<div class="empty-state">Could not reach Prowlarr.</div>';
      return;
    }

    if (token !== state.renderToken) return;

    var indexerCount = Array.isArray(indexers) ? indexers.length : 0;
    var numberOfGrabs = 0;
    var numberOfQueries = 0;
    var numberOfFailedGrabs = 0;

    if (stats && Array.isArray(stats.indexers)) {
      stats.indexers.forEach(function (el) {
        numberOfGrabs += (el.numberOfGrabs || 0);
        numberOfQueries += (el.numberOfQueries || 0);
        numberOfFailedGrabs += (el.numberOfFailedGrabs || 0);
      });
    }

    var statItems = [
      { label: "Indexers", value: indexerCount },
      { label: "Grabs", value: numberOfGrabs },
      { label: "Queries", value: numberOfQueries },
      { label: "Failed Grabs", value: numberOfFailedGrabs }
    ];

    var html = "";
    statItems.forEach(function (s) {
      html +=
        '<div class="prowlarr-stat">' +
          '<span class="prowlarr-stat-value">' + Hub.escapeHtml(String(s.value)) + "</span>" +
          '<span class="prowlarr-stat-label">' + Hub.escapeHtml(s.label) + "</span>" +
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
      '<input type="text" value="' + Hub.escapeHtml(config.title || "Prowlarr") + '" />';
    var titleInput = titleLabel.querySelector("input");
    titleInput.dataset.navHeaderField = "";
    titleInput.addEventListener("input", function (e) {
      config.title = e.target.value;
      onChange(config);
    });
    container.appendChild(titleLabel);

    var urlLabel = document.createElement("label");
    urlLabel.className = "editor-field";
    urlLabel.innerHTML =
      "<span>Prowlarr URL</span>" +
      '<input type="text" value="' + Hub.escapeHtml(config.url || "http://localhost:9696") + '" />';
    urlLabel.querySelector("input").addEventListener("input", function (e) {
      config.url = e.target.value;
      onChange(config);
    });
    container.appendChild(urlLabel);
  }
});
