/* ── Netdata widget plugin ── */

Hub.injectStyles("widget-netdata", `
  .netdata-stats {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 6px;
    padding: 8px 12px 12px;
  }
  .netdata-stat {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 8px 10px;
    border-radius: var(--radius-sm);
    background: var(--surface);
  }
  .netdata-stat-value {
    font-size: 1.15rem;
    font-weight: 700;
    font-family: var(--font-display);
    color: var(--text);
    line-height: 1;
  }
  .netdata-stat-label {
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--muted);
  }
`);

Hub.registry.register("netdata", {
  label: "Netdata",
  icon: "assets/widget-icons/netdata.svg",
  manualRefresh: true,

  defaultConfig: function () {
    return { title: "Netdata", url: "http://localhost:19999" };
  },

  render: function (container, config) {
    container.innerHTML =
      '<div class="widget-header"><h2>' + Hub.escapeHtml(config.title || "Netdata") + "</h2></div>" +
      '<div class="netdata-stats"><div class="empty-state">Loading\u2026</div></div>';
  },

  load: async function (container, config, state, token) {
    var statsEl = container.querySelector(".netdata-stats");

    var base = (config.url || "http://localhost:19999").replace(/\/$/, "");

    var cpuData, ramData;
    try {
      var results = await Promise.all([
        Hub.cachedFetchJSON(
          base + "/api/v1/data?chart=system.cpu&after=-1&format=json",
          "netdata",
          state.store,
          {},
          Hub.cache.scopeKey(config._id, "netdata::" + base + "::cpu")
        ),
        Hub.cachedFetchJSON(
          base + "/api/v1/data?chart=system.ram&after=-1&format=json",
          "netdata",
          state.store,
          {},
          Hub.cache.scopeKey(config._id, "netdata::" + base + "::ram")
        )
      ]);
      cpuData = results[0];
      ramData = results[1];
    } catch (_) {
      if (token !== state.renderToken) return;
      statsEl.innerHTML = '<div class="empty-state">Could not reach Netdata.</div>';
      return;
    }

    if (token !== state.renderToken) return;

    var cpuPct = netdataParseCpu(cpuData);
    var ram = netdataParseRam(ramData);

    var stats = [
      { label: "CPU", value: cpuPct !== null ? cpuPct.toFixed(1) + "%" : "N/A" },
      { label: "RAM Used", value: ram.used !== null ? netdataFormatBytes(ram.used) : "N/A" },
      { label: "RAM Total", value: ram.total !== null ? netdataFormatBytes(ram.total) : "N/A" },
      { label: "RAM %", value: ram.used !== null && ram.total !== null && ram.total > 0
          ? ((ram.used / ram.total) * 100).toFixed(1) + "%" : "N/A" }
    ];

    var html = "";
    stats.forEach(function (s) {
      html +=
        '<div class="netdata-stat">' +
          '<span class="netdata-stat-value">' + Hub.escapeHtml(String(s.value)) + "</span>" +
          '<span class="netdata-stat-label">' + Hub.escapeHtml(s.label) + "</span>" +
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
      '<input type="text" value="' + Hub.escapeHtml(config.title || "Netdata") + '" />';
    var titleInput = titleLabel.querySelector("input");
    titleInput.addEventListener("input", function (e) {
      config.title = e.target.value;
      onChange(config);
    });
    container.appendChild(titleLabel);

    var urlLabel = document.createElement("label");
    urlLabel.className = "editor-field";
    urlLabel.innerHTML =
      "<span>Netdata URL</span>" +
      '<input type="text" value="' + Hub.escapeHtml(config.url || "http://localhost:19999") + '" />';
    urlLabel.querySelector("input").addEventListener("input", function (e) {
      config.url = e.target.value;
      onChange(config);
    });
    container.appendChild(urlLabel);
  }
});

/* ── Helpers ── */
function netdataParseCpu(data) {
  if (!data || !Array.isArray(data.data) || data.data.length === 0) return null;
  var row = data.data[0];
  if (!Array.isArray(row) || row.length < 2) return null;
  var sum = 0;
  for (var i = 1; i < row.length; i++) {
    sum += (typeof row[i] === "number" ? row[i] : 0);
  }
  return sum;
}

function netdataParseRam(data) {
  var result = { used: null, total: null };
  if (!data || !Array.isArray(data.data) || data.data.length === 0) return result;
  var row = data.data[0];
  if (!Array.isArray(row)) return result;
  var labels = data.labels || [];
  var usedIdx = labels.indexOf("used");
  var freeIdx = labels.indexOf("free");
  var cachedIdx = labels.indexOf("cached");
  var buffersIdx = labels.indexOf("buffers");
  var used = usedIdx >= 0 && usedIdx < row.length - 1 ? row[usedIdx + 1] : null;
  var free = freeIdx >= 0 && freeIdx < row.length - 1 ? row[freeIdx + 1] : null;
  var cached = cachedIdx >= 0 && cachedIdx < row.length - 1 ? row[cachedIdx + 1] : null;
  var buffers = buffersIdx >= 0 && buffersIdx < row.length - 1 ? row[buffersIdx + 1] : null;
  if (typeof used === "number") {
    result.used = used;
    var total = used + (typeof free === "number" ? free : 0) +
                (typeof cached === "number" ? cached : 0) +
                (typeof buffers === "number" ? buffers : 0);
    result.total = total > 0 ? total : null;
  }
  return result;
}

function netdataFormatBytes(mb) {
  if (mb >= 1024) return (mb / 1024).toFixed(1) + " GB";
  return mb.toFixed(0) + " MB";
}
