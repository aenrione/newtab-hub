/* ── Transmission widget plugin ── */

Hub.injectStyles("widget-transmission", `
  .transmission-stats {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 6px;
    padding: 8px 12px 12px;
  }
  .transmission-stat {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 8px 10px;
    border-radius: var(--radius-sm);
    background: var(--surface);
  }
  .transmission-stat-value {
    font-size: 1.15rem;
    font-weight: 700;
    font-family: var(--font-display);
    color: var(--text);
    line-height: 1;
  }
  .transmission-stat-label {
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--muted);
  }
`);

Hub.registry.register("transmission", {
  label: "Transmission",
  icon: "\uD83D\uDCE1",
  manualRefresh: true,

  credentialFields: [
    { key: "username", label: "Username", type: "text" },
    { key: "password", label: "Password", type: "password" }
  ],

  defaultConfig: function () {
    return { title: "Transmission", url: "http://localhost:9091" };
  },

  render: function (container, config) {
    container.innerHTML =
      '<div class="widget-header"><h2>' + Hub.escapeHtml(config.title || "Transmission") + "</h2></div>" +
      '<div class="transmission-stats"><div class="empty-state">Loading\u2026</div></div>';
  },

  load: async function (container, config, state, token) {
    var statsEl = container.querySelector(".transmission-stats");

    var creds = await Hub.credentials.load(config._id);
    if (token !== state.renderToken) return;
    if (!creds.username && !creds.password) {
      statsEl.innerHTML = '<div class="empty-state">Add your Transmission credentials<br>in the widget editor.</div>';
      return;
    }

    var base = (config.url || "http://localhost:9091").replace(/\/$/, "");
    var rpcUrl = base + "/transmission/rpc";
    var authHeader = transmissionBasicAuth(creds.username || "", creds.password || "");

    var body = JSON.stringify({
      method: "session-stats",
      arguments: {}
    });

    var data;
    try {
      /* First request — Transmission responds 409 with X-Transmission-Session-Id */
      var firstResp = await fetch(rpcUrl, {
        method: "POST",
        headers: {
          "Authorization": authHeader,
          "Content-Type": "application/json"
        },
        body: body
      });

      if (token !== state.renderToken) return;

      var sessionId = firstResp.headers.get("x-transmission-session-id");

      if (firstResp.status === 409 && sessionId) {
        /* Second request — include the session-id header */
        var secondResp = await fetch(rpcUrl, {
          method: "POST",
          headers: {
            "Authorization": authHeader,
            "Content-Type": "application/json",
            "X-Transmission-Session-Id": sessionId
          },
          body: body
        });

        if (token !== state.renderToken) return;

        data = await secondResp.json();
      } else if (firstResp.ok) {
        data = await firstResp.json();
      } else {
        throw new Error("Unexpected status: " + firstResp.status);
      }
    } catch (_) {
      if (token !== state.renderToken) return;
      statsEl.innerHTML = '<div class="empty-state">Could not reach Transmission.</div>';
      return;
    }

    if (token !== state.renderToken) return;

    var args = (data && data.arguments) ? data.arguments : {};
    var activeTorrents = typeof args.activeTorrentCount === "number" ? args.activeTorrentCount : 0;
    var pausedTorrents = typeof args.pausedTorrentCount === "number" ? args.pausedTorrentCount : 0;
    var dlSpeed = typeof args.downloadSpeed === "number" ? args.downloadSpeed : 0;
    var ulSpeed = typeof args.uploadSpeed === "number" ? args.uploadSpeed : 0;

    var stats = [
      { label: "Active", value: activeTorrents },
      { label: "Paused", value: pausedTorrents },
      { label: "Download", value: transmissionFormatSpeed(dlSpeed) },
      { label: "Upload", value: transmissionFormatSpeed(ulSpeed) }
    ];

    var html = "";
    stats.forEach(function (s) {
      html +=
        '<div class="transmission-stat">' +
          '<span class="transmission-stat-value">' + Hub.escapeHtml(String(s.value)) + "</span>" +
          '<span class="transmission-stat-label">' + Hub.escapeHtml(s.label) + "</span>" +
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
      '<input type="text" value="' + Hub.escapeHtml(config.title || "Transmission") + '" />';
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
      "<span>Transmission URL</span>" +
      '<input type="text" value="' + Hub.escapeHtml(config.url || "http://localhost:9091") + '" />';
    urlLabel.querySelector("input").addEventListener("input", function (e) {
      config.url = e.target.value;
      onChange(config);
    });
    container.appendChild(urlLabel);
  }
});

/* ── Helpers ── */
function transmissionBasicAuth(u, p) {
  return "Basic " + btoa(u + ":" + p);
}

function transmissionFormatSpeed(bytesPerSec) {
  if (bytesPerSec >= 1048576) {
    return (bytesPerSec / 1048576).toFixed(1) + " MB/s";
  }
  if (bytesPerSec >= 1024) {
    return (bytesPerSec / 1024).toFixed(1) + " KB/s";
  }
  return bytesPerSec + " B/s";
}
