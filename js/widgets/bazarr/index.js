/* ── Bazarr widget plugin ── */

Hub.injectStyles("widget-bazarr", `
  .bazarr-stats {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 6px;
    padding: 8px 12px 12px;
  }
  .bazarr-stat {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 8px 10px;
    border-radius: var(--radius-sm);
    background: var(--surface);
  }
  .bazarr-stat-value {
    font-size: 1.15rem;
    font-weight: 700;
    font-family: var(--font-display);
    color: var(--text);
    line-height: 1;
  }
  .bazarr-stat-label {
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--muted);
  }
`);

Hub.registry.register("bazarr", {
  label: "Bazarr",
  icon: "tv",
  manualRefresh: true,

  credentialFields: [
    { key: "apiKey", label: "API Key", type: "password" }
  ],

  defaultConfig: function () {
    return { title: "Bazarr", url: "http://localhost:6767" };
  },

  render: function (container, config) {
    container.innerHTML =
      '<div class="widget-header"><h2>' + Hub.escapeHtml(config.title || "Bazarr") + "</h2></div>" +
      '<div class="bazarr-stats"><div class="empty-state">Loading\u2026</div></div>';
  },

  load: async function (container, config, state, token) {
    var statsEl = container.querySelector(".bazarr-stats");

    var creds = await Hub.credentials.load(config._id);
    if (token !== state.renderToken) return;
    if (!creds.apiKey) {
      statsEl.innerHTML = '<div class="empty-state">Add your Bazarr API key<br>in the widget editor.</div>';
      return;
    }

    var base = (config.url || "http://localhost:6767").replace(/\/$/, "");
    var keyParam = "?apikey=" + encodeURIComponent(creds.apiKey);
    var opts = {};

    var moviesData, episodesData;
    try {
      var results = await Promise.all([
        Hub.cachedFetchJSON(
          base + "/api/movies/wanted" + keyParam,
          "bazarr",
          state.store,
          opts,
          Hub.cache.scopeKey(config._id, "bazarr::" + base + "/movies")
        ),
        Hub.cachedFetchJSON(
          base + "/api/episodes/wanted" + keyParam,
          "bazarr",
          state.store,
          opts,
          Hub.cache.scopeKey(config._id, "bazarr::" + base + "/episodes")
        )
      ]);
      moviesData = results[0];
      episodesData = results[1];
    } catch (_) {
      if (token !== state.renderToken) return;
      statsEl.innerHTML = '<div class="empty-state">Could not reach Bazarr.</div>';
      return;
    }

    if (token !== state.renderToken) return;

    var missingMovies = (moviesData && typeof moviesData.total === "number") ? moviesData.total : 0;
    var missingEpisodes = (episodesData && typeof episodesData.total === "number") ? episodesData.total : 0;

    var stats = [
      { label: "Missing Movies", value: missingMovies },
      { label: "Missing Episodes", value: missingEpisodes }
    ];

    var html = "";
    stats.forEach(function (s) {
      html +=
        '<div class="bazarr-stat">' +
          '<span class="bazarr-stat-value">' + Hub.escapeHtml(String(s.value)) + "</span>" +
          '<span class="bazarr-stat-label">' + Hub.escapeHtml(s.label) + "</span>" +
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
      '<input type="text" value="' + Hub.escapeHtml(config.title || "Bazarr") + '" />';
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
      "<span>Bazarr URL</span>" +
      '<input type="text" value="' + Hub.escapeHtml(config.url || "http://localhost:6767") + '" />';
    urlLabel.querySelector("input").addEventListener("input", function (e) {
      config.url = e.target.value;
      onChange(config);
    });
    container.appendChild(urlLabel);
  }
});
