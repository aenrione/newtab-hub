/* ── Overseerr widget plugin ── */

Hub.injectStyles("widget-overseerr", `
  .overseerr-stats {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 6px;
    padding: 8px 12px 12px;
  }
  .overseerr-stat {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 8px 10px;
    border-radius: var(--radius-sm);
    background: var(--surface);
  }
  .overseerr-stat-value {
    font-size: 1.15rem;
    font-weight: 700;
    font-family: var(--font-display);
    color: var(--text);
    line-height: 1;
  }
  .overseerr-stat-label {
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--muted);
  }
`);

Hub.registry.register("overseerr", {
  label: "Overseerr",
  icon: "\uD83C\uDFAC",
  manualRefresh: true,

  credentialFields: [
    { key: "apiKey", label: "API Key", type: "password" }
  ],

  defaultConfig: function () {
    return { title: "Overseerr", url: "http://localhost:5055" };
  },

  render: function (container, config) {
    container.innerHTML =
      '<div class="widget-header"><h2>' + Hub.escapeHtml(config.title || "Overseerr") + "</h2></div>" +
      '<div class="overseerr-stats"><div class="empty-state">Loading\u2026</div></div>';
  },

  load: async function (container, config, state, token) {
    var statsEl = container.querySelector(".overseerr-stats");

    var creds = await Hub.credentials.load(config._id);
    if (token !== state.renderToken) return;
    if (!creds.apiKey) {
      statsEl.innerHTML = '<div class="empty-state">Add your Overseerr API key<br>in the widget editor.</div>';
      return;
    }

    var base = (config.url || "http://localhost:5055").replace(/\/$/, "");
    var opts = { headers: { "X-Api-Key": creds.apiKey } };

    var data;
    try {
      data = await Hub.cachedFetchJSON(
        base + "/api/v1/request/count",
        "overseerr",
        state.store,
        opts,
        Hub.cache.scopeKey(config._id, "overseerr::" + base)
      );
    } catch (_) {
      if (token !== state.renderToken) return;
      statsEl.innerHTML = '<div class="empty-state">Could not reach Overseerr.</div>';
      return;
    }

    if (token !== state.renderToken) return;

    var stats = [
      { label: "Pending",   value: (data && typeof data.pending   === "number") ? data.pending   : 0 },
      { label: "Approved",  value: (data && typeof data.approved  === "number") ? data.approved  : 0 },
      { label: "Available", value: (data && typeof data.available === "number") ? data.available : 0 },
      { label: "Total",     value: (data && typeof data.total     === "number") ? data.total     : 0 }
    ];

    var html = "";
    stats.forEach(function (s) {
      html +=
        '<div class="overseerr-stat">' +
          '<span class="overseerr-stat-value">' + Hub.escapeHtml(String(s.value)) + "</span>" +
          '<span class="overseerr-stat-label">' + Hub.escapeHtml(s.label) + "</span>" +
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
      '<input type="text" value="' + Hub.escapeHtml(config.title || "Overseerr") + '" />';
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
      "<span>Overseerr URL</span>" +
      '<input type="text" value="' + Hub.escapeHtml(config.url || "http://localhost:5055") + '" />';
    urlLabel.querySelector("input").addEventListener("input", function (e) {
      config.url = e.target.value;
      onChange(config);
    });
    container.appendChild(urlLabel);
  }
});
