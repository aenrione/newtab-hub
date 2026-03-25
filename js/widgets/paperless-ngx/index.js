/* ── Paperless-ngx widget plugin ── */

Hub.injectStyles("widget-paperless-ngx", `
  .paperless-ngx-stats {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 6px;
    padding: 8px 12px 12px;
  }
  .paperless-ngx-stat {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 8px 10px;
    border-radius: var(--radius-sm);
    background: var(--surface);
  }
  .paperless-ngx-stat-value {
    font-size: 1.15rem;
    font-weight: 700;
    font-family: var(--font-display);
    color: var(--text);
    line-height: 1;
  }
  .paperless-ngx-stat-label {
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--muted);
  }
`);

Hub.registry.register("paperless-ngx", {
  label: "Paperless-ngx",
  icon: "\uD83D\uDCC4",
  manualRefresh: true,

  credentialFields: [
    { key: "apiKey", label: "API Key", type: "password" }
  ],

  defaultConfig: function () {
    return { title: "Paperless-ngx", url: "http://localhost:8000" };
  },

  render: function (container, config) {
    container.innerHTML =
      '<div class="widget-header"><h2>' + Hub.escapeHtml(config.title || "Paperless-ngx") + "</h2></div>" +
      '<div class="paperless-ngx-stats"><div class="empty-state">Loading\u2026</div></div>';
  },

  load: async function (container, config, state, token) {
    var statsEl = container.querySelector(".paperless-ngx-stats");

    var creds = await Hub.credentials.load(config._id);
    if (token !== state.renderToken) return;
    if (!creds.apiKey) {
      statsEl.innerHTML = '<div class="empty-state">Add your Paperless-ngx API key<br>in the widget editor.</div>';
      return;
    }

    var base = (config.url || "http://localhost:8000").replace(/\/$/, "");
    var opts = { headers: { "Authorization": "Token " + creds.apiKey } };

    var data;
    try {
      data = await Hub.cachedFetchJSON(
        base + "/api/statistics/",
        "paperless-ngx",
        state.store,
        opts,
        Hub.cache.scopeKey(config._id, "paperlessNgx::" + base)
      );
    } catch (_) {
      if (token !== state.renderToken) return;
      statsEl.innerHTML = '<div class="empty-state">Could not reach Paperless-ngx.</div>';
      return;
    }

    if (token !== state.renderToken) return;

    var docs = (data && typeof data.documents_total === "number") ? data.documents_total : 0;
    var inbox = (data && typeof data.documents_inbox === "number") ? data.documents_inbox : 0;
    var tags = (data && typeof data.documents_file_type_count === "number")
      ? data.documents_file_type_count
      : (data && typeof data.tags_count === "number") ? data.tags_count : 0;
    var correspondents = (data && typeof data.correspondents_count === "number") ? data.correspondents_count : 0;

    var stats = [
      { label: "Documents", value: docs },
      { label: "Inbox", value: inbox },
      { label: "Tags", value: tags },
      { label: "Correspondents", value: correspondents }
    ];

    var html = "";
    stats.forEach(function (s) {
      html +=
        '<div class="paperless-ngx-stat">' +
          '<span class="paperless-ngx-stat-value">' + Hub.escapeHtml(String(s.value)) + "</span>" +
          '<span class="paperless-ngx-stat-label">' + Hub.escapeHtml(s.label) + "</span>" +
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
      '<input type="text" value="' + Hub.escapeHtml(config.title || "Paperless-ngx") + '" />';
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
      "<span>Paperless-ngx URL</span>" +
      '<input type="text" value="' + Hub.escapeHtml(config.url || "http://localhost:8000") + '" />';
    urlLabel.querySelector("input").addEventListener("input", function (e) {
      config.url = e.target.value;
      onChange(config);
    });
    container.appendChild(urlLabel);
  }
});
