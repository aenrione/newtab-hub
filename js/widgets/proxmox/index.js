/* ── Proxmox widget plugin ── */

Hub.injectStyles("widget-proxmox", `
  .proxmox-stats {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 6px;
    padding: 8px 12px 12px;
  }
  .proxmox-stat {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 8px 10px;
    border-radius: var(--radius-sm);
    background: var(--surface);
  }
  .proxmox-stat-value {
    font-size: 1.15rem;
    font-weight: 700;
    font-family: var(--font-display);
    color: var(--text);
    line-height: 1;
  }
  .proxmox-stat-label {
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--muted);
  }
`);

Hub.registry.register("proxmox", {
  label: "Proxmox",
  icon: "assets/widget-icons/proxmox.svg",
  manualRefresh: true,

  credentialFields: [
    { key: "apiToken", label: "API Token (user@realm!tokenid=uuid)", type: "password" }
  ],

  defaultConfig: function () {
    return { title: "Proxmox", url: "https://localhost:8006" };
  },

  render: function (container, config) {
    container.innerHTML =
      '<div class="widget-header"><h2>' + Hub.escapeHtml(config.title || "Proxmox") + "</h2></div>" +
      '<div class="proxmox-stats"><div class="empty-state">Loading\u2026</div></div>';
  },

  load: async function (container, config, state, token) {
    var statsEl = container.querySelector(".proxmox-stats");

    var creds = await Hub.credentials.load(config._id);
    if (token !== state.renderToken) return;
    if (!creds.apiToken) {
      statsEl.innerHTML = '<div class="empty-state">Add your Proxmox API token<br>in the widget editor.</div>';
      return;
    }

    var base = (config.url || "https://localhost:8006").replace(/\/$/, "");
    var opts = { headers: { "Authorization": "PVEAPIToken=" + creds.apiToken } };

    var clusterData;
    try {
      clusterData = await Hub.cachedFetchJSON(
        base + "/api2/json/cluster/resources",
        "proxmox",
        state.store,
        opts,
        Hub.cache.scopeKey(config._id, "proxmox::" + base)
      );
      if (token !== state.renderToken) return;
    } catch (_) {
      if (token !== state.renderToken) return;
      statsEl.innerHTML = '<div class="empty-state">Could not reach Proxmox.</div>';
      return;
    }

    var items = (clusterData && Array.isArray(clusterData.data)) ? clusterData.data : [];

    var vms = items.filter(function (item) { return item.type === "qemu" && item.template === 0; });
    var lxc = items.filter(function (item) { return item.type === "lxc" && item.template === 0; });
    var nodes = items.filter(function (item) { return item.type === "node" && item.status === "online"; });

    var runningVMs = vms.filter(function (item) { return item.status === "running"; }).length;
    var runningLXC = lxc.filter(function (item) { return item.status === "running"; }).length;

    var cpuPct = proxmoxCalcCpuPercent(nodes);
    var memPct = proxmoxCalcMemPercent(nodes);

    var stats = [
      { label: "VMs", value: runningVMs + " / " + vms.length },
      { label: "LXC", value: runningLXC + " / " + lxc.length },
      { label: "CPU", value: cpuPct },
      { label: "RAM", value: memPct }
    ];

    var html = "";
    stats.forEach(function (s) {
      html +=
        '<div class="proxmox-stat">' +
          '<span class="proxmox-stat-value">' + Hub.escapeHtml(String(s.value)) + "</span>" +
          '<span class="proxmox-stat-label">' + Hub.escapeHtml(s.label) + "</span>" +
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
      '<input type="text" value="' + Hub.escapeHtml(config.title || "Proxmox") + '" />';
    var titleInput = titleLabel.querySelector("input");
    titleInput.addEventListener("input", function (e) {
      config.title = e.target.value;
      onChange(config);
    });
    container.appendChild(titleLabel);

    var urlLabel = document.createElement("label");
    urlLabel.className = "editor-field";
    urlLabel.innerHTML =
      "<span>Proxmox URL</span>" +
      '<input type="text" value="' + Hub.escapeHtml(config.url || "https://localhost:8006") + '" />';
    urlLabel.querySelector("input").addEventListener("input", function (e) {
      config.url = e.target.value;
      onChange(config);
    });
    container.appendChild(urlLabel);
  }
});

/* ── Helpers ── */
function proxmoxCalcCpuPercent(nodes) {
  if (!nodes.length) return "N/A";
  var maxCpu = nodes.reduce(function (sum, n) { return sum + (n.maxcpu || 0); }, 0);
  var usedCpu = nodes.reduce(function (sum, n) { return sum + ((n.cpu || 0) * (n.maxcpu || 0)); }, 0);
  if (maxCpu === 0) return "N/A";
  return Math.round((usedCpu / maxCpu) * 100) + "%";
}

function proxmoxCalcMemPercent(nodes) {
  if (!nodes.length) return "N/A";
  var maxMem = nodes.reduce(function (sum, n) { return sum + (n.maxmem || 0); }, 0);
  var usedMem = nodes.reduce(function (sum, n) { return sum + (n.mem || 0); }, 0);
  if (maxMem === 0) return "N/A";
  return Math.round((usedMem / maxMem) * 100) + "%";
}
