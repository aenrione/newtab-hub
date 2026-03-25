/* ── Jellyfin widget plugin ── */

Hub.injectStyles("widget-jellyfin", `
  .jellyfin-stats {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 6px;
    padding: 8px 12px 12px;
  }
  .jellyfin-stat {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 8px 10px;
    border-radius: var(--radius-sm);
    background: var(--surface);
  }
  .jellyfin-stat-value {
    font-size: 1.15rem;
    font-weight: 700;
    font-family: var(--font-display);
    color: var(--text);
    line-height: 1;
  }
  .jellyfin-stat-label {
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--muted);
  }
`);

Hub.registry.register("jellyfin", {
  label: "Jellyfin",
  icon: "https://jellyfin.org/favicon.ico",
  manualRefresh: true,

  credentialFields: [
    { key: "apiKey", label: "API Key", type: "password" }
  ],

  defaultConfig: function () {
    return { title: "Jellyfin", url: "http://localhost:8096" };
  },

  render: function (container, config) {
    container.innerHTML =
      '<div class="widget-header"><h2>' + Hub.escapeHtml(config.title || "Jellyfin") + "</h2></div>" +
      '<div class="jellyfin-stats"><div class="empty-state">Loading\u2026</div></div>';
  },

  load: async function (container, config, state, token) {
    var statsEl = container.querySelector(".jellyfin-stats");

    var creds = await Hub.credentials.load(config._id);
    if (token !== state.renderToken) return;
    if (!creds.apiKey) {
      statsEl.innerHTML = '<div class="empty-state">Add your Jellyfin API key<br>in the widget editor.</div>';
      return;
    }

    var base = (config.url || "http://localhost:8096").replace(/\/$/, "");
    var opts = {
      headers: {
        "Authorization": 'MediaBrowser Token="' + creds.apiKey + '"'
      }
    };

    var counts, sessions;
    try {
      var results = await Promise.all([
        Hub.cachedFetchJSON(
          base + "/Items/Counts",
          "jellyfin",
          state.store,
          opts,
          Hub.cache.scopeKey(config._id, "jellyfin::" + base + "::/Items/Counts")
        ),
        Hub.cachedFetchJSON(
          base + "/Sessions",
          "jellyfin",
          state.store,
          opts,
          Hub.cache.scopeKey(config._id, "jellyfin::" + base + "::/Sessions")
        )
      ]);
      counts = results[0];
      sessions = results[1];
    } catch (_) {
      if (token !== state.renderToken) return;
      statsEl.innerHTML = '<div class="empty-state">Could not reach Jellyfin.</div>';
      return;
    }

    if (token !== state.renderToken) return;

    var movies = (counts && typeof counts.MovieCount === "number") ? counts.MovieCount : 0;
    var series = (counts && typeof counts.SeriesCount === "number") ? counts.SeriesCount : 0;
    var episodes = (counts && typeof counts.EpisodeCount === "number") ? counts.EpisodeCount : 0;
    var streams = Array.isArray(sessions)
      ? sessions.filter(function (s) { return s.NowPlayingItem; }).length
      : 0;

    var stats = [
      { label: "Movies", value: movies },
      { label: "Series", value: series },
      { label: "Episodes", value: episodes },
      { label: "Active Streams", value: streams }
    ];

    var html = "";
    stats.forEach(function (s) {
      html +=
        '<div class="jellyfin-stat">' +
          '<span class="jellyfin-stat-value">' + Hub.escapeHtml(String(s.value)) + "</span>" +
          '<span class="jellyfin-stat-label">' + Hub.escapeHtml(s.label) + "</span>" +
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
      '<input type="text" value="' + Hub.escapeHtml(config.title || "Jellyfin") + '" />';
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
      "<span>Jellyfin URL</span>" +
      '<input type="text" value="' + Hub.escapeHtml(config.url || "http://localhost:8096") + '" />';
    urlLabel.querySelector("input").addEventListener("input", function (e) {
      config.url = e.target.value;
      onChange(config);
    });
    container.appendChild(urlLabel);
  }
});
