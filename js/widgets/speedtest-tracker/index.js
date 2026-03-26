/* ── Speedtest Tracker widget plugin ── */

Hub.injectStyles("widget-speedtest-tracker", `
  .speedtest-tracker-stats {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 6px;
    padding: 8px 12px 12px;
  }
  .speedtest-tracker-stat {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 8px 10px;
    border-radius: var(--radius-sm);
    background: var(--surface);
  }
  .speedtest-tracker-stat-value {
    font-size: 1.15rem;
    font-weight: 700;
    font-family: var(--font-display);
    color: var(--text);
    line-height: 1;
  }
  .speedtest-tracker-stat-label {
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--muted);
  }
`);

Hub.registry.register("speedtest-tracker", {
  label: "Speedtest Tracker",
  icon: "assets/widget-icons/speedtest-tracker.svg",
  manualRefresh: true,

  credentialFields: [
    { key: "apiKey", label: "API Key", type: "password" }
  ],

  defaultConfig: function () {
    return { title: "Speedtest Tracker", url: "http://localhost:80" };
  },

  render: function (container, config) {
    container.innerHTML =
      '<div class="widget-header"><h2>' + Hub.escapeHtml(config.title || "Speedtest Tracker") + "</h2></div>" +
      '<div class="speedtest-tracker-stats"><div class="empty-state">Loading\u2026</div></div>';
  },

  load: async function (container, config, state, token) {
    var statsEl = container.querySelector(".speedtest-tracker-stats");

    var creds = await Hub.credentials.load(config._id);
    if (token !== state.renderToken) return;
    if (!creds.apiKey) {
      statsEl.innerHTML = '<div class="empty-state">Add your API Key in the widget editor.</div>';
      return;
    }

    var base = (config.url || "http://localhost:80").replace(/\/$/, "");
    try {
      var data = await Hub.cachedFetchJSON(
        base + "/api/v1/results/latest",
        "speedtest-tracker",
        state.store,
        { headers: { "Authorization": "Bearer " + creds.apiKey } },
        Hub.cache.scopeKey(config._id, "speedtestTracker::" + base)
      );
      if (token !== state.renderToken) return;

      var result = (data && data.data) ? data.data : {};
      var download = typeof result.download === "number" ? speedtestTrackerFmt(result.download) : "—";
      var upload = typeof result.upload === "number" ? speedtestTrackerFmt(result.upload) : "—";
      var ping = typeof result.ping === "number" ? String(Math.round(result.ping)) : "—";

      var stats = [
        { label: "Download", value: download + " Mbps" },
        { label: "Upload", value: upload + " Mbps" },
        { label: "Ping", value: ping + " ms" }
      ];

      var html = "";
      stats.forEach(function (s) {
        html +=
          '<div class="speedtest-tracker-stat">' +
            '<span class="speedtest-tracker-stat-value">' + Hub.escapeHtml(String(s.value)) + "</span>" +
            '<span class="speedtest-tracker-stat-label">' + Hub.escapeHtml(s.label) + "</span>" +
          "</div>";
      });
      statsEl.innerHTML = html;
    } catch (_) {
      if (token !== state.renderToken) return;
      statsEl.innerHTML = '<div class="empty-state">Could not reach Speedtest Tracker.</div>';
    }
  },

  renderEditor: function (container, config, onChange) {
    container.replaceChildren();

    var titleLabel = document.createElement("label");
    titleLabel.className = "editor-field";
    titleLabel.innerHTML =
      "<span>Widget title</span>" +
      '<input type="text" value="' + Hub.escapeHtml(config.title || "Speedtest Tracker") + '" />';
    var titleInput = titleLabel.querySelector("input");
    titleInput.addEventListener("input", function (e) {
      config.title = e.target.value;
      onChange(config);
    });
    container.appendChild(titleLabel);

    var urlLabel = document.createElement("label");
    urlLabel.className = "editor-field";
    urlLabel.innerHTML =
      "<span>Speedtest Tracker URL</span>" +
      '<input type="text" value="' + Hub.escapeHtml(config.url || "http://localhost:80") + '" />';
    urlLabel.querySelector("input").addEventListener("input", function (e) {
      config.url = e.target.value;
      onChange(config);
    });
    container.appendChild(urlLabel);
  }
});

/* ── Helpers ── */
function speedtestTrackerFmt(mbps) {
  return typeof mbps === "number" ? mbps.toFixed(1) : "—";
}
