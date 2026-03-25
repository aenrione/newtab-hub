/* ── Readarr widget plugin ── */

Hub.injectStyles("widget-readarr", `
  .readarr-stats {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 6px;
    padding: 8px 12px 12px;
  }
  .readarr-stat {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 8px 10px;
    border-radius: var(--radius-sm);
    background: var(--surface);
  }
  .readarr-stat-value {
    font-size: 1.15rem;
    font-weight: 700;
    font-family: var(--font-display);
    color: var(--text);
    line-height: 1;
  }
  .readarr-stat-label {
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--muted);
  }
`);

Hub.registry.register("readarr", {
  label: "Readarr",
  icon: "\uD83D\uDCDA",
  manualRefresh: true,

  credentialFields: [
    { key: "apiKey", label: "API Key", type: "password" }
  ],

  defaultConfig: function () {
    return { title: "Readarr", url: "http://localhost:8787" };
  },

  render: function (container, config) {
    container.innerHTML =
      '<div class="widget-header"><h2>' + Hub.escapeHtml(config.title || "Readarr") + "</h2></div>" +
      '<div class="readarr-stats"><div class="empty-state">Loading\u2026</div></div>';
  },

  load: async function (container, config, state, token) {
    var statsEl = container.querySelector(".readarr-stats");

    var creds = await Hub.credentials.load(config._id);
    if (token !== state.renderToken) return;
    if (!creds.apiKey) {
      statsEl.innerHTML = '<div class="empty-state">Add your Readarr API key<br>in the widget editor.</div>';
      return;
    }

    var base = (config.url || "http://localhost:8787").replace(/\/$/, "");
    var key = "?apikey=" + encodeURIComponent(creds.apiKey);
    var opts = {};

    var books, wanted, queue;
    try {
      var results = await Promise.all([
        Hub.cachedFetchJSON(
          base + "/api/v1/book" + key,
          "readarr",
          state.store,
          opts,
          Hub.cache.scopeKey(config._id, "readarr::" + base + "/api/v1/book")
        ),
        Hub.cachedFetchJSON(
          base + "/api/v1/wanted/missing" + key,
          "readarr",
          state.store,
          opts,
          Hub.cache.scopeKey(config._id, "readarr::" + base + "/api/v1/wanted/missing")
        ),
        Hub.cachedFetchJSON(
          base + "/api/v1/queue/status" + key,
          "readarr",
          state.store,
          opts,
          Hub.cache.scopeKey(config._id, "readarr::" + base + "/api/v1/queue/status")
        )
      ]);
      books = results[0];
      wanted = results[1];
      queue = results[2];
    } catch (_) {
      if (token !== state.renderToken) return;
      statsEl.innerHTML = '<div class="empty-state">Could not reach Readarr.</div>';
      return;
    }

    if (token !== state.renderToken) return;

    var have = Array.isArray(books)
      ? books.filter(function (b) { return b && b.statistics && b.statistics.bookFileCount > 0; }).length
      : 0;
    var total = Array.isArray(books) ? books.length : 0;
    var missing = (wanted && typeof wanted.totalRecords === "number") ? wanted.totalRecords : 0;
    var queued = (queue && typeof queue.totalCount === "number") ? queue.totalCount : 0;

    var stats = [
      { label: "Books", value: total },
      { label: "Have", value: have },
      { label: "Wanted", value: missing },
      { label: "Queued", value: queued }
    ];

    var html = "";
    stats.forEach(function (s) {
      html +=
        '<div class="readarr-stat">' +
          '<span class="readarr-stat-value">' + Hub.escapeHtml(String(s.value)) + "</span>" +
          '<span class="readarr-stat-label">' + Hub.escapeHtml(s.label) + "</span>" +
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
      '<input type="text" value="' + Hub.escapeHtml(config.title || "Readarr") + '" />';
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
      "<span>Readarr URL</span>" +
      '<input type="text" value="' + Hub.escapeHtml(config.url || "http://localhost:8787") + '" />';
    urlLabel.querySelector("input").addEventListener("input", function (e) {
      config.url = e.target.value;
      onChange(config);
    });
    container.appendChild(urlLabel);
  }
});
