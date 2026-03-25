/* ── Mealie widget plugin ── */

Hub.injectStyles("widget-mealie", `
  .mealie-stats {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 6px;
    padding: 8px 12px 12px;
  }
  .mealie-stat {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 8px 10px;
    border-radius: var(--radius-sm);
    background: var(--surface);
  }
  .mealie-stat-value {
    font-size: 1.15rem;
    font-weight: 700;
    font-family: var(--font-display);
    color: var(--text);
    line-height: 1;
  }
  .mealie-stat-label {
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--muted);
  }
`);

Hub.registry.register("mealie", {
  label: "Mealie",
  icon: "\uD83C\uDF7D\uFE0F",

  credentialFields: [
    { key: "apiKey", label: "API Token", type: "password" }
  ],

  defaultConfig: function () {
    return { title: "Mealie", url: "http://localhost:9000", version: 1 };
  },

  render: function (container, config) {
    container.innerHTML =
      '<div class="widget-header"><h2>' + Hub.escapeHtml(config.title || "Mealie") + "</h2></div>" +
      '<div class="mealie-stats"><div class="empty-state">Loading\u2026</div></div>';
  },

  load: async function (container, config, state, token) {
    var statsEl = container.querySelector(".mealie-stats");

    var creds = await Hub.credentials.load(config._id);
    if (token !== state.renderToken) return;
    if (!creds.apiKey) {
      statsEl.innerHTML = '<div class="empty-state">Add your API Token in the widget editor.</div>';
      return;
    }

    var base = (config.url || "http://localhost:9000").replace(/\/$/, "");
    var version = config.version === 2 ? 2 : 1;
    var endpoint = version === 2 ? "/api/households/statistics" : "/api/groups/statistics";
    var opts = { headers: { "Authorization": "Bearer " + creds.apiKey } };

    try {
      var data = await Hub.cachedFetchJSON(
        base + endpoint,
        "mealie",
        state.store,
        opts,
        Hub.cache.scopeKey(config._id, "mealie::" + base)
      );
      if (token !== state.renderToken) return;

      var stats = [
        { label: "Recipes", value: (data && typeof data.totalRecipes === "number") ? data.totalRecipes : 0 },
        { label: "Users", value: (data && typeof data.totalUsers === "number") ? data.totalUsers : 0 },
        { label: "Categories", value: (data && typeof data.totalCategories === "number") ? data.totalCategories : 0 },
        { label: "Tags", value: (data && typeof data.totalTags === "number") ? data.totalTags : 0 }
      ];

      var html = "";
      stats.forEach(function (s) {
        html +=
          '<div class="mealie-stat">' +
            '<span class="mealie-stat-value">' + Hub.escapeHtml(String(s.value)) + "</span>" +
            '<span class="mealie-stat-label">' + Hub.escapeHtml(s.label) + "</span>" +
          "</div>";
      });

      statsEl.innerHTML = html;
    } catch (_) {
      if (token !== state.renderToken) return;
      statsEl.innerHTML = '<div class="empty-state">Could not reach Mealie.</div>';
    }
  },

  renderEditor: function (container, config, onChange) {
    container.replaceChildren();

    var titleLabel = document.createElement("label");
    titleLabel.className = "editor-field";
    titleLabel.innerHTML =
      "<span>Widget title</span>" +
      '<input type="text" value="' + Hub.escapeHtml(config.title || "Mealie") + '" />';
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
      "<span>Mealie URL</span>" +
      '<input type="text" value="' + Hub.escapeHtml(config.url || "http://localhost:9000") + '" />';
    urlLabel.querySelector("input").addEventListener("input", function (e) {
      config.url = e.target.value;
      onChange(config);
    });
    container.appendChild(urlLabel);

    var versionLabel = document.createElement("label");
    versionLabel.className = "editor-field";
    versionLabel.innerHTML =
      "<span>API Version (1 or 2)</span>" +
      '<input type="number" min="1" max="2" value="' + Hub.escapeHtml(String(config.version === 2 ? 2 : 1)) + '" />';
    versionLabel.querySelector("input").addEventListener("input", function (e) {
      config.version = parseInt(e.target.value, 10) === 2 ? 2 : 1;
      onChange(config);
    });
    container.appendChild(versionLabel);
  }
});
