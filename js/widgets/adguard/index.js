/* ── AdGuard Home widget plugin ── */

Hub.injectStyles("widget-adguard", `
  .adguard-stats {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 6px;
    padding: 8px 12px 12px;
  }
  .adguard-stat {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 8px 10px;
    border-radius: var(--radius-sm);
    background: var(--surface);
  }
  .adguard-stat-value {
    font-size: 1.15rem;
    font-weight: 700;
    font-family: var(--font-display);
    color: var(--text);
    line-height: 1;
  }
  .adguard-stat-label {
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--muted);
  }
`);

Hub.registry.register("adguard", {
  label: "AdGuard Home",
  icon: "\uD83D\uDEE1\uFE0F",
  manualRefresh: true,

  credentialFields: [
    { key: "username", label: "Username", type: "text" },
    { key: "password", label: "Password", type: "password" }
  ],

  defaultConfig: function () {
    return { title: "AdGuard Home", url: "http://localhost:3000" };
  },

  render: function (container, config) {
    container.innerHTML =
      '<div class="widget-header"><h2>' + Hub.escapeHtml(config.title || "AdGuard Home") + "</h2></div>" +
      '<div class="adguard-stats"><div class="empty-state">Loading\u2026</div></div>';
  },

  load: async function (container, config, state, token) {
    var statsEl = container.querySelector(".adguard-stats");

    var creds = await Hub.credentials.load(config._id);
    if (token !== state.renderToken) return;
    if (!creds.username || !creds.password) {
      statsEl.innerHTML = '<div class="empty-state">Add your AdGuard Home credentials<br>in the widget editor.</div>';
      return;
    }

    var base = (config.url || "http://localhost:3000").replace(/\/$/, "");
    var authHeader = adguardBasicAuth(creds.username, creds.password);
    var opts = { headers: { "Authorization": authHeader } };

    var statsData, statusData;
    try {
      var results = await Promise.all([
        Hub.cachedFetchJSON(
          base + "/control/stats",
          "adguard",
          state.store,
          opts,
          Hub.cache.scopeKey(config._id, "adguard::" + base + "::/control/stats")
        ),
        Hub.cachedFetchJSON(
          base + "/control/status",
          "adguard",
          state.store,
          opts,
          Hub.cache.scopeKey(config._id, "adguard::" + base + "::/control/status")
        )
      ]);
      statsData = results[0];
      statusData = results[1];
    } catch (_) {
      if (token !== state.renderToken) return;
      statsEl.innerHTML = '<div class="empty-state">Could not reach AdGuard Home.</div>';
      return;
    }

    if (token !== state.renderToken) return;

    var totalQueries = (statsData && typeof statsData.num_dns_queries === "number") ? statsData.num_dns_queries : 0;
    var blockedQueries = (statsData && typeof statsData.num_blocked_filtering === "number") ? statsData.num_blocked_filtering : 0;
    var blockedPercent = totalQueries > 0 ? ((blockedQueries / totalQueries) * 100).toFixed(1) + "%" : "0%";
    var rulesCount = (statusData && typeof statusData.num_dns_queries === "number")
      ? statusData.num_dns_queries
      : (statsData && typeof statsData.num_replaced_parental === "number" ? 0 : 0);

    /* rules count comes from status endpoint: filtering_enabled rules_count */
    var filteringRules = (statusData && statusData.filtering && typeof statusData.filtering.rules_count === "number")
      ? statusData.filtering.rules_count
      : 0;

    var stats = [
      { label: "Total Queries", value: totalQueries },
      { label: "Blocked", value: blockedQueries },
      { label: "Blocked %", value: blockedPercent },
      { label: "Filter Rules", value: filteringRules }
    ];

    var html = "";
    stats.forEach(function (s) {
      html +=
        '<div class="adguard-stat">' +
          '<span class="adguard-stat-value">' + Hub.escapeHtml(String(s.value)) + "</span>" +
          '<span class="adguard-stat-label">' + Hub.escapeHtml(s.label) + "</span>" +
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
      '<input type="text" value="' + Hub.escapeHtml(config.title || "AdGuard Home") + '" />';
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
      "<span>AdGuard Home URL</span>" +
      '<input type="text" value="' + Hub.escapeHtml(config.url || "http://localhost:3000") + '" />';
    urlLabel.querySelector("input").addEventListener("input", function (e) {
      config.url = e.target.value;
      onChange(config);
    });
    container.appendChild(urlLabel);
  }
});

/* ── Helpers ── */
function adguardBasicAuth(u, p) {
  return "Basic " + btoa(u + ":" + p);
}
