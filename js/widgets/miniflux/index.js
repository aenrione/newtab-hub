/* ── Miniflux widget plugin ── */

Hub.injectStyles("widget-miniflux", `
  .miniflux-stats {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 6px;
    padding: 8px 12px 12px;
  }
  .miniflux-stat {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 8px 10px;
    border-radius: var(--radius-sm);
    background: var(--surface);
  }
  .miniflux-stat-value {
    font-size: 1.15rem;
    font-weight: 700;
    font-family: var(--font-display);
    color: var(--text);
    line-height: 1;
  }
  .miniflux-stat-label {
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--muted);
  }
`);

Hub.registry.register("miniflux", {
  label: "Miniflux",
  icon: "rss",
  manualRefresh: true,

  credentialFields: [
    { key: "apiKey", label: "API Key", type: "password" }
  ],

  defaultConfig: function () {
    return { title: "Miniflux", url: "http://localhost:8080" };
  },

  render: function (container, config) {
    container.innerHTML =
      '<div class="widget-header"><h2>' + Hub.escapeHtml(config.title || "Miniflux") + "</h2></div>" +
      '<div class="miniflux-stats"><div class="empty-state">Loading\u2026</div></div>';
  },

  load: async function (container, config, state, token) {
    var statsEl = container.querySelector(".miniflux-stats");

    var creds = await Hub.credentials.load(config._id);
    if (token !== state.renderToken) return;
    if (!creds.apiKey) {
      statsEl.innerHTML = '<div class="empty-state">Add your Miniflux API key<br>in the widget editor.</div>';
      return;
    }

    var base = (config.url || "http://localhost:8080").replace(/\/$/, "");
    var opts = { headers: { "X-Auth-Token": creds.apiKey } };

    var feeds, entries;
    try {
      var results = await Promise.all([
        Hub.cachedFetchJSON(
          base + "/v1/feeds",
          "miniflux",
          state.store,
          opts,
          Hub.cache.scopeKey(config._id, "miniflux::" + base + "::/v1/feeds")
        ),
        Hub.cachedFetchJSON(
          base + "/v1/entries?status=unread&limit=1",
          "miniflux",
          state.store,
          opts,
          Hub.cache.scopeKey(config._id, "miniflux::" + base + "::/v1/entries")
        )
      ]);
      feeds = results[0];
      entries = results[1];
    } catch (_) {
      if (token !== state.renderToken) return;
      statsEl.innerHTML = '<div class="empty-state">Could not reach Miniflux.</div>';
      return;
    }

    if (token !== state.renderToken) return;

    var feedCount = Array.isArray(feeds) ? feeds.length : 0;
    var unreadCount = (entries && typeof entries.total === "number") ? entries.total : 0;

    var stats = [
      { label: "Feeds", value: feedCount },
      { label: "Unread", value: unreadCount }
    ];

    var html = "";
    stats.forEach(function (s) {
      html +=
        '<div class="miniflux-stat">' +
          '<span class="miniflux-stat-value">' + Hub.escapeHtml(String(s.value)) + "</span>" +
          '<span class="miniflux-stat-label">' + Hub.escapeHtml(s.label) + "</span>" +
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
      '<input type="text" value="' + Hub.escapeHtml(config.title || "Miniflux") + '" />';
    var titleInput = titleLabel.querySelector("input");
    titleInput.addEventListener("input", function (e) {
      config.title = e.target.value;
      onChange(config);
    });
    container.appendChild(titleLabel);

    var urlLabel = document.createElement("label");
    urlLabel.className = "editor-field";
    urlLabel.innerHTML =
      "<span>Miniflux URL</span>" +
      '<input type="text" value="' + Hub.escapeHtml(config.url || "http://localhost:8080") + '" />';
    urlLabel.querySelector("input").addEventListener("input", function (e) {
      config.url = e.target.value;
      onChange(config);
    });
    container.appendChild(urlLabel);
  }
});
