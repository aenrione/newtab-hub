/* ── Plex widget plugin ── */

Hub.injectStyles("widget-plex", `
  .plex-stats {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 6px;
    padding: 8px 12px 12px;
  }
  .plex-stat {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 8px 10px;
    border-radius: var(--radius-sm);
    background: var(--surface);
  }
  .plex-stat-value {
    font-size: 1.15rem;
    font-weight: 700;
    font-family: var(--font-display);
    color: var(--text);
    line-height: 1;
  }
  .plex-stat-label {
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--muted);
  }
`);

Hub.registry.register("plex", {
  label: "Plex",
  icon: "plex",
  manualRefresh: true,

  credentialFields: [
    { key: "token", label: "Plex Token", type: "password" }
  ],

  defaultConfig: function () {
    return { title: "Plex", url: "http://localhost:32400" };
  },

  render: function (container, config) {
    container.innerHTML =
      '<div class="widget-header"><h2>' + Hub.escapeHtml(config.title || "Plex") + "</h2></div>" +
      '<div class="plex-stats"><div class="empty-state">Loading\u2026</div></div>';
  },

  load: async function (container, config, state, token) {
    var statsEl = container.querySelector(".plex-stats");

    var creds = await Hub.credentials.load(config._id);
    if (token !== state.renderToken) return;
    if (!creds || !creds.token) {
      statsEl.innerHTML = '<div class="empty-state">Add your Plex Token in the widget editor.</div>';
      return;
    }

    var base = (config.url || "http://localhost:32400").replace(/\/$/, "");
    var opts = {
      headers: {
        "X-Plex-Token": creds.token,
        "Accept": "application/json"
      }
    };

    var sessions, sections;
    try {
      var results = await Promise.all([
        Hub.cachedFetchJSON(
          base + "/status/sessions?X-Plex-Token=" + encodeURIComponent(creds.token),
          "plex",
          state.store,
          opts,
          Hub.cache.scopeKey(config._id, "plex::" + base + "/status/sessions")
        ),
        Hub.cachedFetchJSON(
          base + "/library/sections?X-Plex-Token=" + encodeURIComponent(creds.token),
          "plex",
          state.store,
          opts,
          Hub.cache.scopeKey(config._id, "plex::" + base + "/library/sections")
        )
      ]);
      sessions = results[0];
      sections = results[1];
    } catch (_) {
      if (token !== state.renderToken) return;
      statsEl.innerHTML = '<div class="empty-state">Could not reach Plex.</div>';
      return;
    }

    if (token !== state.renderToken) return;

    var streams = 0;
    if (sessions && sessions.MediaContainer && typeof sessions.MediaContainer.size === "number") {
      streams = sessions.MediaContainer.size;
    } else if (sessions && sessions.MediaContainer && sessions.MediaContainer.Metadata) {
      streams = Array.isArray(sessions.MediaContainer.Metadata)
        ? sessions.MediaContainer.Metadata.length
        : 1;
    }

    var movies = 0;
    var tv = 0;
    var music = 0;
    if (sections && sections.MediaContainer && Array.isArray(sections.MediaContainer.Directory)) {
      sections.MediaContainer.Directory.forEach(function (dir) {
        if (dir.type === "movie") movies++;
        else if (dir.type === "show") tv++;
        else if (dir.type === "artist") music++;
      });
    }

    var stats = [
      { label: "Streams", value: streams },
      { label: "Movie Libs", value: movies },
      { label: "TV Libs", value: tv },
      { label: "Music Libs", value: music }
    ];

    var html = "";
    stats.forEach(function (s) {
      html +=
        '<div class="plex-stat">' +
          '<span class="plex-stat-value">' + Hub.escapeHtml(String(s.value)) + "</span>" +
          '<span class="plex-stat-label">' + Hub.escapeHtml(s.label) + "</span>" +
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
      '<input type="text" value="' + Hub.escapeHtml(config.title || "Plex") + '" />';
    var titleInput = titleLabel.querySelector("input");
    titleInput.addEventListener("input", function (e) {
      config.title = e.target.value;
      onChange(config);
    });
    container.appendChild(titleLabel);

    var urlLabel = document.createElement("label");
    urlLabel.className = "editor-field";
    urlLabel.innerHTML =
      "<span>Plex URL</span>" +
      '<input type="text" value="' + Hub.escapeHtml(config.url || "http://localhost:32400") + '" />';
    urlLabel.querySelector("input").addEventListener("input", function (e) {
      config.url = e.target.value;
      onChange(config);
    });
    container.appendChild(urlLabel);
  }
});
