/* ── NZBGet widget plugin ── */

Hub.injectStyles("widget-nzbget", `
  .nzbget-stats {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 6px;
    padding: 8px 12px 12px;
  }
  .nzbget-stat {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 8px 10px;
    border-radius: var(--radius-sm);
    background: var(--surface);
  }
  .nzbget-stat-value {
    font-size: 1.15rem;
    font-weight: 700;
    font-family: var(--font-display);
    color: var(--text);
    line-height: 1;
  }
  .nzbget-stat-label {
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--muted);
  }
`);

Hub.registry.register("nzbget", {
  label: "NZBGet",
  icon: "arrowDownRight",
  manualRefresh: true,

  credentialFields: [
    { key: "username", label: "Username", type: "text" },
    { key: "password", label: "Password", type: "password" }
  ],

  defaultConfig: function () {
    return { title: "NZBGet", url: "http://localhost:6789" };
  },

  render: function (container, config) {
    container.innerHTML =
      '<div class="widget-header"><h2>' + Hub.escapeHtml(config.title || "NZBGet") + "</h2></div>" +
      '<div class="nzbget-stats"><div class="empty-state">Loading\u2026</div></div>';
  },

  load: async function (container, config, state, token) {
    var statsEl = container.querySelector(".nzbget-stats");

    var creds = await Hub.credentials.load(config._id);
    if (token !== state.renderToken) return;
    if (!creds || (!creds.username && !creds.password)) {
      statsEl.innerHTML = '<div class="empty-state">Add your NZBGet credentials in the widget editor.</div>';
      return;
    }

    var base = (config.url || "http://localhost:6789").replace(/\/$/, "");
    var authHeader = nzbgetBasicAuth(creds.username || "", creds.password || "");

    var data;
    try {
      data = await Hub.cachedFetchJSON(
        base + "/jsonrpc",
        "nzbget",
        state.store,
        {
          method: "POST",
          headers: {
            "Authorization": authHeader,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ method: "status", params: [], id: 1 })
        },
        Hub.cache.scopeKey(config._id, "nzbget::" + base)
      );
    } catch (_) {
      if (token !== state.renderToken) return;
      statsEl.innerHTML = '<div class="empty-state">Could not reach NZBGet.</div>';
      return;
    }

    if (token !== state.renderToken) return;

    var result = (data && data.result) ? data.result : {};

    var speedKBs = typeof result.DownloadRate === "number" ? result.DownloadRate : 0;
    var speedMBs = (speedKBs / 1024).toFixed(1);

    var remainingMB = typeof result.RemainingSizeMB === "number" ? result.RemainingSizeMB : 0;

    var paused = result.DownloadPaused === true ? "Yes" : "No";

    var freeDiskMB = typeof result.FreeDiskSpaceMB === "number" ? result.FreeDiskSpaceMB : 0;
    var freeDiskGB = (freeDiskMB / 1024).toFixed(1);

    var stats = [
      { label: "Speed", value: speedMBs + " MB/s" },
      { label: "Remaining", value: remainingMB + " MB" },
      { label: "Paused", value: paused },
      { label: "Free Disk", value: freeDiskGB + " GB" }
    ];

    var html = "";
    stats.forEach(function (s) {
      html +=
        '<div class="nzbget-stat">' +
          '<span class="nzbget-stat-value">' + Hub.escapeHtml(String(s.value)) + "</span>" +
          '<span class="nzbget-stat-label">' + Hub.escapeHtml(s.label) + "</span>" +
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
      '<input type="text" value="' + Hub.escapeHtml(config.title || "NZBGet") + '" />';
    var titleInput = titleLabel.querySelector("input");
    titleInput.addEventListener("input", function (e) {
      config.title = e.target.value;
      onChange(config);
    });
    container.appendChild(titleLabel);

    var urlLabel = document.createElement("label");
    urlLabel.className = "editor-field";
    urlLabel.innerHTML =
      "<span>NZBGet URL</span>" +
      '<input type="text" value="' + Hub.escapeHtml(config.url || "http://localhost:6789") + '" />';
    urlLabel.querySelector("input").addEventListener("input", function (e) {
      config.url = e.target.value;
      onChange(config);
    });
    container.appendChild(urlLabel);
  }
});

/* ── Helpers ── */
function nzbgetBasicAuth(user, pass) {
  return "Basic " + btoa(user + ":" + pass);
}
