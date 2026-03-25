/* ── SABnzbd widget plugin ── */

Hub.injectStyles("widget-sabnzbd", `
  .sabnzbd-stats {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 6px;
    padding: 8px 12px 12px;
  }
  .sabnzbd-stat {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 8px 10px;
    border-radius: var(--radius-sm);
    background: var(--surface);
  }
  .sabnzbd-stat-value {
    font-size: 1.15rem;
    font-weight: 700;
    font-family: var(--font-display);
    color: var(--text);
    line-height: 1;
  }
  .sabnzbd-stat-label {
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--muted);
  }
`);

Hub.registry.register("sabnzbd", {
  label: "SABnzbd",
  icon: "arrowDownRight",
  manualRefresh: true,

  credentialFields: [
    { key: "apiKey", label: "API Key", type: "password" }
  ],

  defaultConfig: function () {
    return { title: "SABnzbd", url: "http://localhost:8080" };
  },

  render: function (container, config) {
    container.innerHTML =
      '<div class="widget-header"><h2>' + Hub.escapeHtml(config.title || "SABnzbd") + "</h2></div>" +
      '<div class="sabnzbd-stats"><div class="empty-state">Loading\u2026</div></div>';
  },

  load: async function (container, config, state, token) {
    var statsEl = container.querySelector(".sabnzbd-stats");

    var creds = await Hub.credentials.load(config._id);
    if (token !== state.renderToken) return;
    if (!creds.apiKey) {
      statsEl.innerHTML = '<div class="empty-state">Add your SABnzbd API key<br>in the widget editor.</div>';
      return;
    }

    var base = (config.url || "http://localhost:8080").replace(/\/$/, "");
    var url = base + "/api?mode=queue&output=json&apikey=" + encodeURIComponent(creds.apiKey);

    var data;
    try {
      data = await Hub.cachedFetchJSON(
        url,
        "sabnzbd",
        state.store,
        {},
        Hub.cache.scopeKey(config._id, "sabnzbd::" + base)
      );
    } catch (_) {
      if (token !== state.renderToken) return;
      statsEl.innerHTML = '<div class="empty-state">Could not reach SABnzbd.</div>';
      return;
    }

    if (token !== state.renderToken) return;

    var queue = (data && data.queue) || {};
    var queueSize = typeof queue.noofslots === "number" ? queue.noofslots : 0;
    var speed = sabnzbdFormatSpeed(queue.kbpersec);
    var remaining = sabnzbdFormatMB(queue.mbleft);
    var eta = queue.timeleft || "0:00:00";

    var stats = [
      { label: "Queue", value: String(queueSize) },
      { label: "Speed", value: speed },
      { label: "Remaining", value: remaining },
      { label: "ETA", value: Hub.escapeHtml(String(eta)) }
    ];

    var html = "";
    stats.forEach(function (s) {
      html +=
        '<div class="sabnzbd-stat">' +
          '<span class="sabnzbd-stat-value">' + Hub.escapeHtml(s.value) + "</span>" +
          '<span class="sabnzbd-stat-label">' + Hub.escapeHtml(s.label) + "</span>" +
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
      '<input type="text" value="' + Hub.escapeHtml(config.title || "SABnzbd") + '" />';
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
      "<span>SABnzbd URL</span>" +
      '<input type="text" value="' + Hub.escapeHtml(config.url || "http://localhost:8080") + '" />';
    urlLabel.querySelector("input").addEventListener("input", function (e) {
      config.url = e.target.value;
      onChange(config);
    });
    container.appendChild(urlLabel);
  }
});

/* ── Helpers ── */
function sabnzbdFormatSpeed(kbpersec) {
  var kb = parseFloat(kbpersec) || 0;
  if (kb >= 1024) {
    return (kb / 1024).toFixed(1) + " MB/s";
  }
  return kb.toFixed(0) + " KB/s";
}

function sabnzbdFormatMB(mbleft) {
  var mb = parseFloat(mbleft) || 0;
  if (mb >= 1024) {
    return (mb / 1024).toFixed(2) + " GB";
  }
  return mb.toFixed(0) + " MB";
}
