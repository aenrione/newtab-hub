/* ── Pi-hole widget plugin ── */

Hub.injectStyles("widget-pihole", `
  .pihole-stats {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 6px;
    padding: 8px 12px 12px;
  }
  .pihole-stat {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 8px 10px;
    border-radius: var(--radius-sm);
    background: var(--surface);
  }
  .pihole-stat-value {
    font-size: 1.15rem;
    font-weight: 700;
    font-family: var(--font-display);
    color: var(--text);
    line-height: 1;
  }
  .pihole-stat-label {
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--muted);
  }
`);

Hub.registry.register("pihole", {
  label: "Pi-hole",
  icon: "assets/widget-icons/pihole.svg",
  manualRefresh: true,

  credentialFields: [
    { key: "apiKey", label: "API Token/Password", type: "password" }
  ],

  defaultConfig: function () {
    return { title: "Pi-hole", url: "http://pi.hole" };
  },

  render: function (container, config) {
    container.innerHTML =
      '<div class="widget-header"><h2>' + Hub.escapeHtml(config.title || "Pi-hole") + "</h2></div>" +
      '<div class="pihole-stats"><div class="empty-state">Loading\u2026</div></div>';
  },

  load: async function (container, config, state, token) {
    var statsEl = container.querySelector(".pihole-stats");

    var creds = await Hub.credentials.load(config._id);
    if (token !== state.renderToken) return;

    var base = (config.url || "http://pi.hole").replace(/\/$/, "");
    var endpoint = base + "/admin/api.php?summaryRaw";
    if (creds && creds.apiKey) {
      endpoint += "&auth=" + encodeURIComponent(creds.apiKey);
    }

    var data;
    try {
      data = await Hub.cachedFetchJSON(
        endpoint,
        "pihole",
        state.store,
        {},
        Hub.cache.scopeKey(config._id, "pihole::" + base)
      );
    } catch (_) {
      if (token !== state.renderToken) return;
      statsEl.innerHTML = '<div class="empty-state">Could not reach Pi-hole.</div>';
      return;
    }

    if (token !== state.renderToken) return;

    var queriesTotal = (data && typeof data.dns_queries_today === "number") ? data.dns_queries_today : 0;
    var blocked = (data && typeof data.ads_blocked_today === "number") ? data.ads_blocked_today : 0;
    var blockPct = (data && typeof data.ads_percentage_today === "number")
      ? data.ads_percentage_today.toFixed(1) + "%"
      : "0.0%";
    var gravity = (data && typeof data.domains_being_blocked === "number") ? data.domains_being_blocked : 0;

    var stats = [
      { label: "Queries Today", value: queriesTotal },
      { label: "Blocked Today", value: blocked },
      { label: "Block Rate", value: blockPct },
      { label: "Blocklist", value: gravity }
    ];

    var html = "";
    stats.forEach(function (s) {
      html +=
        '<div class="pihole-stat">' +
          '<span class="pihole-stat-value">' + Hub.escapeHtml(String(s.value)) + "</span>" +
          '<span class="pihole-stat-label">' + Hub.escapeHtml(s.label) + "</span>" +
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
      '<input type="text" value="' + Hub.escapeHtml(config.title || "Pi-hole") + '" />';
    var titleInput = titleLabel.querySelector("input");
    titleInput.addEventListener("input", function (e) {
      config.title = e.target.value;
      onChange(config);
    });
    container.appendChild(titleLabel);

    var urlLabel = document.createElement("label");
    urlLabel.className = "editor-field";
    urlLabel.innerHTML =
      "<span>Pi-hole URL</span>" +
      '<input type="text" value="' + Hub.escapeHtml(config.url || "http://pi.hole") + '" />';
    urlLabel.querySelector("input").addEventListener("input", function (e) {
      config.url = e.target.value;
      onChange(config);
    });
    container.appendChild(urlLabel);
  }
});
