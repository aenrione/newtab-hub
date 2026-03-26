/* ── DNS Stats widget plugin ──
   Supports Pi-hole v6 (/api/stats/summary), Pi-hole v5 (api.php), and AdGuard Home (/control/stats).
── */

Hub.injectStyles("widget-dns-stats", `
  .dns-stats-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 6px;
    margin-bottom: 8px;
  }
  .dns-stat-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: 8px 4px;
    border-radius: var(--radius-sm);
    background: var(--surface-hover);
  }
  .dns-stat-value {
    font-family: var(--font-display);
    font-size: 1.1rem;
    font-weight: 700;
    line-height: 1;
  }
  .dns-stat-value.is-blocked { color: var(--ok); }
  .dns-stat-label { font-size: 0.62rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; text-align: center; }
  .dns-bar-wrap {
    height: 4px;
    background: var(--surface-hover);
    border-radius: 2px;
    overflow: hidden;
    margin-top: 4px;
  }
  .dns-bar-fill {
    height: 100%;
    background: var(--ok);
    border-radius: 2px;
    transition: width 0.4s ease;
  }
  .dns-footer {
    font-size: 0.68rem;
    color: var(--muted);
    text-align: center;
    margin-top: 4px;
  }
`);

Hub.registry.register("dns-stats", {
  label: "DNS Stats",
  icon: "shield",
  manualRefresh: true,

  credentialFields: [
    { key: "apiKey", label: "API Key / Password", type: "password" }
  ],

  render: function (container, config) {
    container.innerHTML =
      '<div class="widget-header"><h2>' + Hub.escapeHtml(config.title || "DNS Stats") + '</h2></div>' +
      '<div class="dns-body"><div class="empty-state">Loading\u2026</div></div>';
  },

  load: async function (container, config, state, token) {
    var bodyEl = container.querySelector(".dns-body");
    var service = config.service || "pihole";
    var instanceUrl = (config.url || "").replace(/\/$/, "");
    if (!instanceUrl) {
      var svcName = service === "adguard" ? "AdGuard Home" : "Pi-hole";
      bodyEl.innerHTML = '<div class="empty-state">Set your ' + svcName + ' URL in the widget editor.</div>';
      return;
    }

    var creds = await Hub.credentials.load(config._id);
    var store = state.store;

    try {
      var stats;
      if (service === "adguard") {
        stats = await dnsAdguard(instanceUrl, creds, store, config._id);
      } else if (service === "pihole6") {
        stats = await dnsPiholeV6(instanceUrl, creds, store, config._id);
      } else {
        stats = await dnsPihole(instanceUrl, creds, store, config._id);
      }

      if (token !== state.renderToken) return;

      var pct = stats.total > 0 ? ((stats.blocked / stats.total) * 100).toFixed(1) : "0.0";

      bodyEl.innerHTML =
        '<div class="dns-stats-grid">' +
          dnsStat(dnsShortNum(stats.total), "Queries today") +
          dnsStat(dnsShortNum(stats.blocked), "Blocked today", true) +
          dnsStat(pct + "%", "Blocked %", true) +
          (stats.domains !== undefined ? dnsStat(dnsShortNum(stats.domains), "Domains blocked") : "") +
        '</div>' +
        '<div class="dns-bar-wrap"><div class="dns-bar-fill" style="width:' + Math.min(100, parseFloat(pct)) + '%"></div></div>' +
        (stats.clients !== undefined ? '<div class="dns-footer">' + stats.clients + ' active clients</div>' : '');
    } catch (_) {
      if (token !== state.renderToken) return;
      bodyEl.innerHTML = '<div class="empty-state">Failed to load DNS stats. Check URL and credentials.</div>';
    }
  },

  renderEditor: function (container, config, onChange) {
    container.replaceChildren();

    var titleLabel = document.createElement("label");
    titleLabel.className = "editor-field";
    titleLabel.innerHTML = '<span>Widget title</span><input type="text" value="' + Hub.escapeHtml(config.title || "DNS Stats") + '" />';
    titleLabel.querySelector("input").addEventListener("input", function (e) { config.title = e.target.value; onChange(config); });
    container.appendChild(titleLabel);

    container.appendChild(Hub.createCustomSelect("Service", [
      { value: "pihole6", label: "Pi-hole (v6)" },
      { value: "pihole", label: "Pi-hole (v5)" },
      { value: "adguard", label: "AdGuard Home" }
    ], config.service || "pihole6", function (v) { config.service = v; onChange(config); }));

    var urlLabel = document.createElement("label");
    urlLabel.className = "editor-field";
    urlLabel.innerHTML = '<span>Instance URL</span><input type="url" value="' + Hub.escapeHtml(config.url || "") + '" placeholder="http://pi.hole or http://adguard.local:3000" />';
    urlLabel.querySelector("input").addEventListener("input", function (e) { config.url = e.target.value; onChange(config); });
    container.appendChild(urlLabel);

    var hint = document.createElement("p");
    hint.className = "editor-hint";
    hint.textContent = "Pi-hole v6: enter your web password. Pi-hole v5: enter API token (Settings \u2192 API). AdGuard Home: enter username:password.";
    container.appendChild(hint);
  },

  rawEditorSchema: {
    fields: {
      title: { type: "string" },
      service: { type: "string", enum: ["pihole6", "pihole", "adguard"] },
      url: { type: "string" }
    }
  },

  defaultConfig: function () {
    return { title: "DNS Stats", service: "pihole6", url: "" };
  }
});

/* ── Fetchers ── */

async function dnsPihole(base, creds, store, cacheScope) {
  var token = creds.apiKey || "";
  var url = base + "/admin/api.php?summaryRaw" + (token ? "&auth=" + encodeURIComponent(token) : "");
  var cacheKey = Hub.cache.scopeKey(cacheScope, "dns-pihole::" + base);
  var cached = Hub.cache.get(cacheKey);
  if (!cached) {
    var res = await Hub.fetchWithTimeout(url, {}, 8000);
    if (!res.ok) throw new Error("HTTP " + res.status);
    cached = await res.json();
    Hub.cache.set(cacheKey, cached, "default", store);
  }
  return {
    total: cached.dns_queries_today || 0,
    blocked: cached.ads_blocked_today || 0,
    domains: cached.domains_being_blocked || undefined,
    clients: cached.unique_clients || undefined
  };
}

async function dnsPiholeV6(base, creds, store, cacheScope) {
  var password = creds.apiKey || "";
  var cacheKey = Hub.cache.scopeKey(cacheScope, "dns-pihole6::" + base);
  var cached = Hub.cache.get(cacheKey);
  if (!cached) {
    // Authenticate to get a session ID
    var sid = "";
    if (password) {
      var authRes = await Hub.fetchWithTimeout(base + "/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: password })
      }, 8000);
      if (!authRes.ok) {
        var errBody = {};
        try { errBody = await authRes.json(); } catch (_) {}
        var msg = (errBody.session && errBody.session.message) || ("HTTP " + authRes.status);
        throw new Error("Auth failed: " + msg);
      }
      var authData = await authRes.json();
      if (!authData.session || !authData.session.valid) {
        var hint = (authData.session && authData.session.message) || "invalid credentials";
        throw new Error("Auth failed: " + hint);
      }
      sid = authData.session.sid || "";
    }

    // Use X-FTL-SID header (preferred by browser clients) and query param as fallback
    var statsUrl = base + "/api/stats/summary" + (sid ? "?sid=" + encodeURIComponent(sid) : "");
    var statsHeaders = sid ? { "X-FTL-SID": sid } : {};
    var res = await Hub.fetchWithTimeout(statsUrl, { headers: statsHeaders }, 8000);
    if (!res.ok) throw new Error("Stats fetch failed: HTTP " + res.status);
    cached = await res.json();
    Hub.cache.set(cacheKey, cached, "default", store);
  }
  return {
    total: (cached.queries && cached.queries.total) || 0,
    blocked: (cached.queries && cached.queries.blocked) || 0,
    domains: (cached.gravity && cached.gravity.domains_being_blocked) || undefined,
    clients: (cached.clients && cached.clients.active) || undefined
  };
}

async function dnsAdguard(base, creds, store, cacheScope) {
  var headers = {};
  if (creds.apiKey && creds.apiKey.includes(":")) {
    headers["Authorization"] = "Basic " + btoa(creds.apiKey);
  }
  var cacheKey = Hub.cache.scopeKey(cacheScope, "dns-adguard::" + base);
  var cached = Hub.cache.get(cacheKey);
  if (!cached) {
    var res = await Hub.fetchWithTimeout(base + "/control/stats", { headers: headers }, 8000);
    if (!res.ok) throw new Error("HTTP " + res.status);
    cached = await res.json();
    Hub.cache.set(cacheKey, cached, "default", store);
  }
  return {
    total: cached.num_dns_queries || 0,
    blocked: cached.num_blocked_filtering || 0,
    domains: undefined,
    clients: cached.num_active_clients || undefined
  };
}

function dnsStat(value, label, highlight) {
  return '<div class="dns-stat-card">' +
    '<span class="dns-stat-value' + (highlight ? ' is-blocked' : '') + '">' + Hub.escapeHtml(String(value)) + '</span>' +
    '<span class="dns-stat-label">' + Hub.escapeHtml(label) + '</span>' +
    '</div>';
}

function dnsShortNum(n) {
  if (!n) return "0";
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return String(n);
}
