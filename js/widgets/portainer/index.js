/* ── Portainer widget plugin ── */

Hub.injectStyles("widget-portainer", `
  .portainer-stats {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 6px;
    padding: 8px 12px 12px;
  }
  .portainer-stat {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 8px 10px;
    border-radius: var(--radius-sm);
    background: var(--surface);
  }
  .portainer-stat-value {
    font-size: 1.15rem;
    font-weight: 700;
    font-family: var(--font-display);
    color: var(--text);
    line-height: 1;
  }
  .portainer-stat-label {
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--muted);
  }
`);

Hub.registry.register("portainer", {
  label: "Portainer",
  icon: "monitor",
  manualRefresh: true,

  credentialFields: [
    { key: "apiKey", label: "API Key", type: "password" }
  ],

  defaultConfig: function () {
    return { title: "Portainer", url: "http://localhost:9000", envId: "" };
  },

  render: function (container, config) {
    container.innerHTML =
      '<div class="widget-header"><h2>' + Hub.escapeHtml(config.title || "Portainer") + "</h2></div>" +
      '<div class="portainer-stats"><div class="empty-state">Loading\u2026</div></div>';
  },

  load: async function (container, config, state, token) {
    var statsEl = container.querySelector(".portainer-stats");

    var creds = await Hub.credentials.load(config._id);
    if (token !== state.renderToken) return;
    if (!creds || !creds.apiKey) {
      statsEl.innerHTML = '<div class="empty-state">Add your Portainer API Key<br>in the widget editor.</div>';
      return;
    }

    var base = (config.url || "http://localhost:9000").replace(/\/$/, "");
    var opts = { headers: { "X-API-Key": creds.apiKey } };
    var envId = config.envId || "";

    var endpoints;
    try {
      endpoints = await Hub.cachedFetchJSON(
        base + "/api/endpoints",
        "portainer",
        state.store,
        opts,
        Hub.cache.scopeKey(config._id, "portainer::endpoints::" + base)
      );
    } catch (_) {
      if (token !== state.renderToken) return;
      statsEl.innerHTML = '<div class="empty-state">Could not reach Portainer.</div>';
      return;
    }

    if (token !== state.renderToken) return;

    if (!Array.isArray(endpoints)) {
      statsEl.innerHTML = '<div class="empty-state">Unexpected response from Portainer.</div>';
      return;
    }

    var targetEndpoints = envId
      ? endpoints.filter(function (ep) { return String(ep.Id) === String(envId); })
      : endpoints;

    var containerResults;
    try {
      containerResults = await Promise.all(
        targetEndpoints.map(function (ep) {
          var id = ep.Id;
          return Hub.cachedFetchJSON(
            base + "/api/endpoints/" + id + "/docker/containers/json?all=true",
            "portainer",
            state.store,
            opts,
            Hub.cache.scopeKey(config._id, "portainer::containers::" + id)
          );
        })
      );
    } catch (_) {
      if (token !== state.renderToken) return;
      statsEl.innerHTML = '<div class="empty-state">Could not fetch container data.</div>';
      return;
    }

    if (token !== state.renderToken) return;

    var totalRunning = 0;
    var totalStopped = 0;

    containerResults.forEach(function (list) {
      if (!Array.isArray(list)) return;
      list.forEach(function (c) {
        if (c.State === "running") {
          totalRunning += 1;
        } else {
          totalStopped += 1;
        }
      });
    });

    var stats = [
      { label: "Running", value: totalRunning },
      { label: "Stopped", value: totalStopped },
      { label: "Total", value: totalRunning + totalStopped },
      { label: "Environments", value: targetEndpoints.length }
    ];

    var html = "";
    stats.forEach(function (s) {
      html +=
        '<div class="portainer-stat">' +
          '<span class="portainer-stat-value">' + Hub.escapeHtml(String(s.value)) + "</span>" +
          '<span class="portainer-stat-label">' + Hub.escapeHtml(s.label) + "</span>" +
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
      '<input type="text" value="' + Hub.escapeHtml(config.title || "Portainer") + '" />';
    var titleInput = titleLabel.querySelector("input");
    titleInput.addEventListener("input", function (e) {
      config.title = e.target.value;
      onChange(config);
    });
    container.appendChild(titleLabel);

    var urlLabel = document.createElement("label");
    urlLabel.className = "editor-field";
    urlLabel.innerHTML =
      "<span>Portainer URL</span>" +
      '<input type="text" value="' + Hub.escapeHtml(config.url || "http://localhost:9000") + '" />';
    urlLabel.querySelector("input").addEventListener("input", function (e) {
      config.url = e.target.value;
      onChange(config);
    });
    container.appendChild(urlLabel);

    var envLabel = document.createElement("label");
    envLabel.className = "editor-field";
    envLabel.innerHTML =
      "<span>Environment ID (leave blank for all)</span>" +
      '<input type="text" value="' + Hub.escapeHtml(config.envId || "") + '" />';
    envLabel.querySelector("input").addEventListener("input", function (e) {
      config.envId = e.target.value;
      onChange(config);
    });
    container.appendChild(envLabel);
  }
});
