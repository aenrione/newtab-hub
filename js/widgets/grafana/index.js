/* ── Grafana widget plugin ──
   Modes:
     alerts  — active alerts from Grafana Alertmanager API
     metrics — current metric values via datasource query API
     panels  — embedded panel iframes
── */

Hub.injectStyles("widget-grafana", `
  /* ── Alerts ── */
  .grafana-alert-list { display: grid; gap: 1px; }
  .grafana-alert-row {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 7px 8px;
    border-radius: var(--radius-sm);
    transition: background 80ms;
  }
  .grafana-alert-row:hover { background: var(--surface-hover); }
  .grafana-alert-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
    margin-top: 5px;
    background: var(--muted);
  }
  .grafana-alert-dot.is-firing { background: var(--down); }
  .grafana-alert-dot.is-pending { background: #f59e0b; }
  .grafana-alert-dot.is-suppressed { background: var(--muted); }
  .grafana-alert-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
  .grafana-alert-name {
    font-size: 0.84rem;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .grafana-alert-summary { font-size: 0.72rem; color: var(--muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .grafana-alert-right { display: flex; flex-direction: column; align-items: flex-end; gap: 3px; flex-shrink: 0; }
  .grafana-alert-badge {
    font-size: 0.6rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    padding: 2px 5px;
    border-radius: 3px;
  }
  .grafana-alert-badge.is-firing { background: rgba(220,60,60,0.15); color: var(--down); }
  .grafana-alert-badge.is-pending { background: rgba(245,158,11,0.15); color: #f59e0b; }
  .grafana-alert-badge.is-suppressed { background: var(--surface-hover); color: var(--muted); }
  .grafana-alert-age { font-size: 0.66rem; color: var(--muted); }
  .grafana-alert-labels { display: flex; flex-wrap: wrap; gap: 3px; margin-top: 2px; }
  .grafana-alert-label {
    font-size: 0.6rem;
    padding: 1px 4px;
    border-radius: 3px;
    background: var(--surface-hover);
    color: var(--muted);
  }

  /* ── Metrics ── */
  .grafana-metrics-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 6px;
  }
  .grafana-metric-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: 10px 6px;
    border-radius: var(--radius-sm);
    background: var(--surface-hover);
    cursor: default;
  }
  .grafana-metric-value {
    font-family: var(--font-display);
    font-size: 1.2rem;
    font-weight: 700;
    line-height: 1;
  }
  .grafana-metric-label {
    font-size: 0.62rem;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    text-align: center;
  }
  .grafana-metric-card.is-error .grafana-metric-value { color: var(--down); font-size: 0.72rem; font-weight: 400; }

  /* ── Panels ── */
  .grafana-panels { display: grid; gap: 8px; }
  .grafana-panel-title { font-size: 0.72rem; color: var(--muted); margin-bottom: 2px; font-weight: 600; }
  .grafana-panel-frame {
    width: 100%;
    border: none;
    border-radius: var(--radius-sm);
    display: block;
    background: var(--surface-hover);
  }

  /* ── Editor ── */
  .grafana-mode-section { margin-top: 8px; }
  .widget-grafana .editor-field--col { flex-direction: column; align-items: flex-start; gap: 4px; }
  .widget-grafana .editor-field--col textarea {
    width: 100%;
    min-height: 60px;
    padding: 6px 8px;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--bg);
    color: var(--text);
    font-size: 0.78rem;
    font-family: var(--font-display);
    resize: vertical;
  }
  .widget-grafana .editor-field--col textarea:focus { outline: none; border-color: var(--accent-2); }
`);

Hub.registry.register("grafana", {
  label: "Grafana",
  icon: "https://grafana.com/favicon.ico",
  manualRefresh: true,

  credentialFields: [
    { key: "token", label: "Service Account Token", type: "password" }
  ],

  render: function (container, config) {
    container.className += " widget-grafana";
    container.innerHTML =
      '<div class="widget-header"><h2>' + Hub.escapeHtml(config.title || "Grafana") + '</h2></div>' +
      '<div class="grafana-body"><div class="empty-state">Loading\u2026</div></div>';
  },

  load: async function (container, config, state, token) {
    var bodyEl = container.querySelector(".grafana-body");
    var instanceUrl = (config.instanceUrl || "").replace(/\/$/, "");
    if (!instanceUrl) {
      bodyEl.innerHTML = '<div class="empty-state">Set your Grafana URL in the widget editor.</div>';
      return;
    }

    var mode = config.mode || "alerts";

    /* Panels mode doesn't need a token */
    if (mode === "panels") {
      grafanaRenderPanels(bodyEl, instanceUrl, config);
      return;
    }

    var creds = await Hub.credentials.load(config._id);
    if (!creds.token) {
      bodyEl.innerHTML = '<div class="empty-state">Add your Grafana service account token in the widget editor.</div>';
      return;
    }

    var headers = { "Authorization": "Bearer " + creds.token, "Content-Type": "application/json" };
    var store = state.store;

    try {
      if (mode === "alerts") {
        await grafanaLoadAlerts(bodyEl, instanceUrl, headers, config, store, state, token, config._id);
      } else if (mode === "metrics") {
        await grafanaLoadMetrics(bodyEl, instanceUrl, headers, config, store, token, state, config._id);
      }
    } catch (err) {
      if (token !== state.renderToken) return;
      var msg = String(err && err.message || "").includes("401")
        ? "Invalid token \u2014 check your service account token."
        : "Failed to connect to Grafana.";
      bodyEl.innerHTML = '<div class="empty-state">' + Hub.escapeHtml(msg) + '</div>';
    }
  },

  renderEditor: function (container, config, onChange, navOptions) {
    container.replaceChildren();
    container.className += " widget-grafana";

    /* Title */
    var titleLabel = document.createElement("label");
    titleLabel.className = "editor-field";
    titleLabel.innerHTML = '<span>Widget title</span><input type="text" value="' + Hub.escapeHtml(config.title || "Grafana") + '" />';
    var titleInput = titleLabel.querySelector("input");
    titleInput.dataset.navHeaderField = "";
    titleInput.addEventListener("input", function (e) { config.title = e.target.value; onChange(config); });
    container.appendChild(titleLabel);

    /* Instance URL */
    var urlLabel = document.createElement("label");
    urlLabel.className = "editor-field";
    urlLabel.innerHTML = '<span>Grafana URL</span><input type="url" value="' + Hub.escapeHtml(config.instanceUrl || "") + '" placeholder="http://grafana.local:3000" />';
    urlLabel.querySelector("input").addEventListener("input", function (e) { config.instanceUrl = e.target.value; onChange(config); });
    container.appendChild(urlLabel);

    /* Mode selector */
    var modeLabel = document.createElement("label");
    modeLabel.className = "editor-field";
    var modeVal = config.mode || "alerts";
    modeLabel.innerHTML =
      '<span>Mode</span>' +
      '<select>' +
        '<option value="alerts"' + (modeVal === "alerts" ? " selected" : "") + '>Alerts</option>' +
        '<option value="metrics"' + (modeVal === "metrics" ? " selected" : "") + '>Metrics</option>' +
        '<option value="panels"' + (modeVal === "panels" ? " selected" : "") + '>Panels (iframes)</option>' +
      '</select>';
    var modeSection = document.createElement("div");
    modeSection.className = "grafana-mode-section";
    modeLabel.querySelector("select").addEventListener("change", function (e) {
      config.mode = e.target.value;
      onChange(config);
      buildModeSection(modeSection, config, onChange, navOptions);
    });
    container.appendChild(modeLabel);
    container.appendChild(modeSection);
    buildModeSection(modeSection, config, onChange, navOptions);
  },

  defaultConfig: function () {
    return {
      title: "Grafana",
      instanceUrl: "",
      mode: "alerts",
      alertLimit: 10,
      showSuppressed: false,
      metrics: [],
      panels: []
    };
  }
});

/* ════════════════════════════════════════════
   ALERTS
════════════════════════════════════════════ */

async function grafanaLoadAlerts(bodyEl, instanceUrl, headers, config, store, state, token, cacheScope) {
  var url = instanceUrl + "/api/alertmanager/grafana/api/v2/alerts";
  var cacheKey = Hub.cache.scopeKey(cacheScope, "grafana-alerts::" + instanceUrl);
  var data = Hub.cache.get(cacheKey);
  if (!data) {
    var res = await Hub.fetchWithTimeout(url, { headers: headers }, 10000);
    if (!res.ok) throw new Error(String(res.status));
    data = await res.json();
    Hub.cache.set(cacheKey, data, "default", store);
  }

  if (token !== state.renderToken) return;

  var alerts = Array.isArray(data) ? data : [];
  var showSuppressed = config.showSuppressed || false;
  var limit = Math.min(config.alertLimit || 10, 50);

  if (!showSuppressed) {
    alerts = alerts.filter(function (a) { return a.status && a.status.state !== "suppressed"; });
  }

  /* Sort: firing first, then pending, then others */
  alerts.sort(function (a, b) {
    var order = { active: 0, unprocessed: 1, suppressed: 2 };
    return (order[a.status && a.status.state] || 3) - (order[b.status && b.status.state] || 3);
  });

  if (!alerts.length) {
    bodyEl.innerHTML = '<div class="empty-state">\u2705 No active alerts.</div>';
    return;
  }

  var frag = document.createDocumentFragment();
  var listEl = document.createElement("div");
  listEl.className = "grafana-alert-list";

  alerts.slice(0, limit).forEach(function (alert) {
    var labels = alert.labels || {};
    var annotations = alert.annotations || {};
    var alertState = (alert.status && alert.status.state) || "unprocessed";
    var alertName = labels.alertname || "Alert";
    var summary = annotations.summary || annotations.description || "";
    var severity = labels.severity || "";
    var age = alert.startsAt ? grafanaAge(alert.startsAt) : "";

    /* Map API state to display state */
    var displayState = alertState === "active" ? "firing"
      : alertState === "unprocessed" ? "pending"
      : "suppressed";

    var dotCls = "grafana-alert-dot is-" + displayState;
    var badgeCls = "grafana-alert-badge is-" + displayState;
    var badgeText = displayState.charAt(0).toUpperCase() + displayState.slice(1);

    /* Extra labels to show (skip alertname, severity — already displayed) */
    var extraLabels = Object.keys(labels)
      .filter(function (k) { return k !== "alertname" && k !== "severity" && k !== "__alert_rule_uid__"; })
      .slice(0, 4)
      .map(function (k) {
        return '<span class="grafana-alert-label">' + Hub.escapeHtml(k + "=" + labels[k]) + '</span>';
      }).join("");

    var row = document.createElement("div");
    row.className = "grafana-alert-row";
    row.innerHTML =
      '<span class="' + dotCls + '"></span>' +
      '<span class="grafana-alert-info">' +
        '<span class="grafana-alert-name">' + Hub.escapeHtml(alertName) + '</span>' +
        (summary ? '<span class="grafana-alert-summary">' + Hub.escapeHtml(summary) + '</span>' : '') +
        (extraLabels ? '<span class="grafana-alert-labels">' + extraLabels + '</span>' : '') +
      '</span>' +
      '<span class="grafana-alert-right">' +
        '<span class="' + badgeCls + '">' + (severity ? Hub.escapeHtml(severity) : badgeText) + '</span>' +
        (age ? '<span class="grafana-alert-age">' + Hub.escapeHtml(age) + '</span>' : '') +
      '</span>';
    listEl.appendChild(row);
  });

  frag.appendChild(listEl);
  bodyEl.replaceChildren(frag);
}

/* ════════════════════════════════════════════
   METRICS
════════════════════════════════════════════ */

async function grafanaLoadMetrics(bodyEl, instanceUrl, headers, config, store, token, state, cacheScope) {
  var metrics = (config.metrics || []).filter(function (m) { return m.datasourceUid && m.expr; });
  if (!metrics.length) {
    bodyEl.innerHTML = '<div class="empty-state">Add metrics in the widget editor.</div>';
    return;
  }

  var results = await Promise.allSettled(metrics.map(function (m) {
    return grafanaQueryMetric(instanceUrl, headers, m, store, cacheScope);
  }));

  if (token !== state.renderToken) return;

  var gridEl = document.createElement("div");
  gridEl.className = "grafana-metrics-grid";

  results.forEach(function (r, i) {
    var m = metrics[i];
    var card = document.createElement("div");
    card.className = "grafana-metric-card";

    var valueStr = "--";
    var isError = false;
    if (r.status === "fulfilled" && r.value !== null && r.value !== undefined) {
      var raw = r.value;
      valueStr = grafanaFormatMetricValue(raw, m.unit || "");
    } else {
      isError = true;
      valueStr = "Error";
    }

    if (isError) card.className += " is-error";

    card.innerHTML =
      '<span class="grafana-metric-value">' + Hub.escapeHtml(valueStr) + '</span>' +
      '<span class="grafana-metric-label">' + Hub.escapeHtml(m.label || m.expr) + '</span>';
    gridEl.appendChild(card);
  });

  bodyEl.replaceChildren(gridEl);
}

async function grafanaQueryMetric(instanceUrl, headers, metric, store, cacheScope) {
  var url = instanceUrl + "/api/ds/query?ds_type=prometheus";
  var body = JSON.stringify({
    queries: [{
      refId: "A",
      datasourceUid: metric.datasourceUid,
      expr: metric.expr,
      instant: true,
      range: false,
      legendFormat: ""
    }],
    from: "now-5m",
    to: "now"
  });

  var cacheKey = Hub.cache.scopeKey(cacheScope, "grafana-metric::" + instanceUrl + "::" + metric.datasourceUid + "::" + metric.expr);
  var cached = Hub.cache.get(cacheKey);
  if (cached !== null) return cached;

  var res = await Hub.fetchWithTimeout(url, { method: "POST", headers: headers, body: body }, 10000);
  if (!res.ok) throw new Error(String(res.status));
  var data = await res.json();

  /* Extract the latest value from the first frame */
  var frames = data && data.results && data.results.A && data.results.A.frames;
  if (!frames || !frames.length) return null;
  var values = frames[0].data && frames[0].data.values;
  if (!values || values.length < 2) return null;
  var series = values[1]; /* index 0 = timestamps, index 1 = values */
  var latest = series && series.length ? series[series.length - 1] : null;

  Hub.cache.set(cacheKey, latest, "default", store);
  return latest;
}

function grafanaFormatMetricValue(raw, unit) {
  var n = parseFloat(raw);
  if (isNaN(n)) return String(raw);
  var formatted = n >= 1000 ? (n / 1000).toFixed(1) + "k" : n % 1 === 0 ? String(n) : n.toFixed(2);
  return formatted + (unit ? "\u00A0" + unit : "");
}

/* ════════════════════════════════════════════
   PANELS
════════════════════════════════════════════ */

function grafanaRenderPanels(bodyEl, instanceUrl, config) {
  var panels = (config.panels || []).filter(function (p) { return p.dashboardUid && p.panelId; });
  if (!panels.length) {
    bodyEl.innerHTML = '<div class="empty-state">Add panels in the widget editor.</div>';
    return;
  }

  var wrap = document.createElement("div");
  wrap.className = "grafana-panels";

  panels.forEach(function (panel) {
    var theme = config.theme || "dark";
    var src = instanceUrl +
      "/d-solo/" + encodeURIComponent(panel.dashboardUid) +
      "?orgId=" + (config.orgId || 1) +
      "&panelId=" + encodeURIComponent(panel.panelId) +
      "&theme=" + theme +
      "&kiosk";

    var container = document.createElement("div");
    if (panel.title) {
      var titleEl = document.createElement("div");
      titleEl.className = "grafana-panel-title";
      titleEl.textContent = panel.title;
      container.appendChild(titleEl);
    }

    var iframe = document.createElement("iframe");
    iframe.src = src;
    iframe.className = "grafana-panel-frame";
    iframe.style.height = (panel.height || 200) + "px";
    iframe.loading = "lazy";
    iframe.setAttribute("referrerpolicy", "no-referrer");
    container.appendChild(iframe);
    wrap.appendChild(container);
  });

  bodyEl.replaceChildren(wrap);
}

/* ════════════════════════════════════════════
   EDITOR — mode-specific sections
════════════════════════════════════════════ */

function buildModeSection(section, config, onChange, navOptions) {
  section.replaceChildren();
  var mode = config.mode || "alerts";

  if (mode === "alerts") {
    var limitLabel = document.createElement("label");
    limitLabel.className = "editor-field";
    limitLabel.innerHTML = '<span>Max alerts</span><input type="number" min="1" max="50" value="' + (config.alertLimit || 10) + '" />';
    limitLabel.querySelector("input").addEventListener("input", function (e) {
      var n = parseInt(e.target.value, 10);
      if (n > 0 && n <= 50) { config.alertLimit = n; onChange(config); }
    });
    section.appendChild(limitLabel);

    var suppLabel = document.createElement("label");
    suppLabel.className = "editor-field";
    suppLabel.innerHTML =
      '<span>Show silenced alerts</span>' +
      '<input type="checkbox"' + (config.showSuppressed ? " checked" : "") + ' style="width:auto" />';
    suppLabel.querySelector("input").addEventListener("change", function (e) {
      config.showSuppressed = e.target.checked;
      onChange(config);
    });
    section.appendChild(suppLabel);

  } else if (mode === "metrics") {
    var hint = document.createElement("p");
    hint.className = "editor-hint";
    hint.textContent = "Each metric needs a datasource UID (find it in Connections \u2192 Data sources) and a Prometheus instant query expression.";
    section.appendChild(hint);

    var itemsWrap = document.createElement("div");
    section.appendChild(itemsWrap);
    if (!config.metrics) config.metrics = [];
    buildListEditor(itemsWrap, config, "metrics", onChange, [
      { key: "label", label: "Label" },
      { key: "datasourceUid", label: "Datasource UID" },
      { key: "expr", label: "Expression (Prometheus)" },
      { key: "unit", label: "Unit (optional)", placeholder: "%, MB, req/s\u2026" }
    ], function () { return { label: "", datasourceUid: "", expr: "", unit: "" }; }, navOptions);

  } else if (mode === "panels") {
    var panelHint = document.createElement("p");
    panelHint.className = "editor-hint";
    panelHint.textContent = "Find the Dashboard UID in the URL (e.g. /d/AbCdEfGh/...) and the Panel ID via panel menu \u2192 Edit \u2192 URL ?editPanel=N or panel \u2192 Share \u2192 Embed.";
    section.appendChild(panelHint);

    var themeLabel = document.createElement("label");
    themeLabel.className = "editor-field";
    var themeVal = config.theme || "dark";
    themeLabel.innerHTML =
      '<span>Theme</span>' +
      '<select>' +
        '<option value="dark"' + (themeVal === "dark" ? " selected" : "") + '>Dark</option>' +
        '<option value="light"' + (themeVal === "light" ? " selected" : "") + '>Light</option>' +
      '</select>';
    themeLabel.querySelector("select").addEventListener("change", function (e) { config.theme = e.target.value; onChange(config); });
    section.appendChild(themeLabel);

    var orgLabel = document.createElement("label");
    orgLabel.className = "editor-field";
    orgLabel.innerHTML = '<span>Org ID</span><input type="number" min="1" value="' + (config.orgId || 1) + '" style="width:70px" />';
    orgLabel.querySelector("input").addEventListener("input", function (e) {
      var n = parseInt(e.target.value, 10);
      if (n > 0) { config.orgId = n; onChange(config); }
    });
    section.appendChild(orgLabel);

    var panelsWrap = document.createElement("div");
    section.appendChild(panelsWrap);
    if (!config.panels) config.panels = [];
    buildListEditor(panelsWrap, config, "panels", onChange, [
      { key: "title", label: "Label (optional)" },
      { key: "dashboardUid", label: "Dashboard UID" },
      { key: "panelId", label: "Panel ID" },
      { key: "height", label: "Height px", placeholder: "200" }
    ], function () { return { title: "", dashboardUid: "", panelId: "", height: 200 }; }, navOptions);
  }
}

/* ════════════════════════════════════════════
   HELPERS
════════════════════════════════════════════ */

function grafanaAge(dateStr) {
  if (!dateStr) return "";
  var diff = Date.now() - new Date(dateStr).getTime();
  var mins = Math.floor(diff / 60000);
  if (mins < 60) return mins + "m";
  var hours = Math.floor(mins / 60);
  if (hours < 24) return hours + "h";
  return Math.floor(hours / 24) + "d";
}
