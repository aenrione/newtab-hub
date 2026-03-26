/* ── Nextcloud widget plugin ── */

Hub.injectStyles("widget-nextcloud", `
  .nextcloud-stats {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 6px;
    padding: 8px 12px 12px;
  }
  .nextcloud-stat {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 8px 10px;
    border-radius: var(--radius-sm);
    background: var(--surface);
  }
  .nextcloud-stat-value {
    font-size: 1.15rem;
    font-weight: 700;
    font-family: var(--font-display);
    color: var(--text);
    line-height: 1;
  }
  .nextcloud-stat-label {
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--muted);
  }
`);

Hub.registry.register("nextcloud", {
  label: "Nextcloud",
  icon: "cloud",
  manualRefresh: true,

  credentialFields: [
    { key: "username", label: "Username", type: "text" },
    { key: "password", label: "Password", type: "password" }
  ],

  defaultConfig: function () {
    return { title: "Nextcloud", url: "https://localhost" };
  },

  render: function (container, config) {
    container.innerHTML =
      '<div class="widget-header"><h2>' + Hub.escapeHtml(config.title || "Nextcloud") + "</h2></div>" +
      '<div class="nextcloud-stats"><div class="empty-state">Loading\u2026</div></div>';
  },

  load: async function (container, config, state, token) {
    var statsEl = container.querySelector(".nextcloud-stats");

    var creds = await Hub.credentials.load(config._id);
    if (token !== state.renderToken) return;
    if (!creds || !creds.username || !creds.password) {
      statsEl.innerHTML = '<div class="empty-state">Add your Nextcloud username and password in the widget editor.</div>';
      return;
    }

    var base = (config.url || "https://localhost").replace(/\/$/, "");
    var opts = {
      headers: {
        "Authorization": nextcloudBasicAuth(creds.username, creds.password),
        "OCS-APIRequest": "true",
        "Accept": "application/json"
      }
    };

    var data;
    try {
      data = await Hub.cachedFetchJSON(
        base + "/ocs/v2.php/apps/serverinfo/api/v1/info?format=json",
        "nextcloud",
        state.store,
        opts,
        Hub.cache.scopeKey(config._id, "nextcloud::" + base)
      );
    } catch (_) {
      if (token !== state.renderToken) return;
      statsEl.innerHTML = '<div class="empty-state">Could not reach Nextcloud.</div>';
      return;
    }

    if (token !== state.renderToken) return;

    var nc = (data && data.ocs && data.ocs.data) ? data.ocs.data : {};
    var activeUsers = (nc.activeUsers && typeof nc.activeUsers.last5minutes === "number")
      ? nc.activeUsers.last5minutes : 0;
    var numFiles = (nc.nextcloud && nc.nextcloud.storage && typeof nc.nextcloud.storage.num_files === "number")
      ? nc.nextcloud.storage.num_files : 0;
    var freeSpace = (nc.nextcloud && nc.nextcloud.system && typeof nc.nextcloud.system.freespace === "number")
      ? nextcloudFormatBytes(nc.nextcloud.system.freespace) : "—";

    var stats = [
      { label: "Active Users", value: activeUsers },
      { label: "Total Files", value: numFiles },
      { label: "Free Space", value: freeSpace }
    ];

    var html = "";
    stats.forEach(function (s) {
      html +=
        '<div class="nextcloud-stat">' +
          '<span class="nextcloud-stat-value">' + Hub.escapeHtml(String(s.value)) + "</span>" +
          '<span class="nextcloud-stat-label">' + Hub.escapeHtml(s.label) + "</span>" +
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
      '<input type="text" value="' + Hub.escapeHtml(config.title || "Nextcloud") + '" />';
    var titleInput = titleLabel.querySelector("input");
    titleInput.addEventListener("input", function (e) {
      config.title = e.target.value;
      onChange(config);
    });
    container.appendChild(titleLabel);

    var urlLabel = document.createElement("label");
    urlLabel.className = "editor-field";
    urlLabel.innerHTML =
      "<span>Nextcloud URL</span>" +
      '<input type="text" value="' + Hub.escapeHtml(config.url || "https://localhost") + '" />';
    urlLabel.querySelector("input").addEventListener("input", function (e) {
      config.url = e.target.value;
      onChange(config);
    });
    container.appendChild(urlLabel);
  }
});

/* ── Helpers ── */
function nextcloudBasicAuth(u, p) {
  return "Basic " + btoa(u + ":" + p);
}

function nextcloudFormatBytes(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + " GB";
}
