/* ── Tautulli widget plugin ── */

Hub.injectStyles("widget-tautulli", `
  .tautulli-stats {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 6px;
    padding: 8px 12px 12px;
  }
  .tautulli-stat {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 8px 10px;
    border-radius: var(--radius-sm);
    background: var(--surface);
  }
  .tautulli-stat-value {
    font-size: 1.15rem;
    font-weight: 700;
    font-family: var(--font-display);
    color: var(--text);
    line-height: 1;
  }
  .tautulli-stat-label {
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--muted);
  }
`);

Hub.registry.register("tautulli", {
  label: "Tautulli",
  icon: "trendingUp",
  manualRefresh: true,

  credentialFields: [
    { key: "apiKey", label: "API Key", type: "password" }
  ],

  defaultConfig: function () {
    return { title: "Tautulli", url: "http://localhost:8181" };
  },

  render: function (container, config) {
    container.innerHTML =
      '<div class="widget-header"><h2>' + Hub.escapeHtml(config.title || "Tautulli") + "</h2></div>" +
      '<div class="tautulli-stats"><div class="empty-state">Loading\u2026</div></div>';
  },

  load: async function (container, config, state, token) {
    var statsEl = container.querySelector(".tautulli-stats");

    var creds = await Hub.credentials.load(config._id);
    if (token !== state.renderToken) return;
    if (!creds.apiKey) {
      statsEl.innerHTML = '<div class="empty-state">Add your Tautulli API key<br>in the widget editor.</div>';
      return;
    }

    var base = (config.url || "http://localhost:8181").replace(/\/$/, "");
    var endpoint = base + "/api/v2?apikey=" + encodeURIComponent(creds.apiKey) + "&cmd=get_activity&output=json";
    var cacheKey = Hub.cache.scopeKey(config._id, "tautulli::" + base);

    var data;
    try {
      data = await Hub.cachedFetchJSON(
        endpoint,
        "tautulli",
        state.store,
        {},
        cacheKey
      );
    } catch (_) {
      if (token !== state.renderToken) return;
      statsEl.innerHTML = '<div class="empty-state">Could not reach Tautulli.</div>';
      return;
    }

    if (token !== state.renderToken) return;

    var activity = (data && data.response && data.response.data) ? data.response.data : {};
    var streams = typeof activity.stream_count === "number" ? activity.stream_count : 0;
    var directPlay = typeof activity.stream_count_direct_play === "number" ? activity.stream_count_direct_play : 0;
    var transcode = typeof activity.stream_count_transcode === "number" ? activity.stream_count_transcode : 0;
    var bandwidth = typeof activity.total_bandwidth === "number" ? tautulliFormatBandwidth(activity.total_bandwidth) : "0 kbps";

    var stats = [
      { label: "Streams", value: streams },
      { label: "Direct Play", value: directPlay },
      { label: "Transcode", value: transcode },
      { label: "Bandwidth", value: bandwidth }
    ];

    var html = "";
    stats.forEach(function (s) {
      html +=
        '<div class="tautulli-stat">' +
          '<span class="tautulli-stat-value">' + Hub.escapeHtml(String(s.value)) + "</span>" +
          '<span class="tautulli-stat-label">' + Hub.escapeHtml(s.label) + "</span>" +
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
      '<input type="text" value="' + Hub.escapeHtml(config.title || "Tautulli") + '" />';
    var titleInput = titleLabel.querySelector("input");
    titleInput.addEventListener("input", function (e) {
      config.title = e.target.value;
      onChange(config);
    });
    container.appendChild(titleLabel);

    var urlLabel = document.createElement("label");
    urlLabel.className = "editor-field";
    urlLabel.innerHTML =
      "<span>Tautulli URL</span>" +
      '<input type="text" value="' + Hub.escapeHtml(config.url || "http://localhost:8181") + '" />';
    urlLabel.querySelector("input").addEventListener("input", function (e) {
      config.url = e.target.value;
      onChange(config);
    });
    container.appendChild(urlLabel);
  }
});

/* ── Helpers ── */
function tautulliFormatBandwidth(kbps) {
  if (kbps >= 1000) {
    return (kbps / 1000).toFixed(1) + " Mbps";
  }
  return kbps + " kbps";
}
