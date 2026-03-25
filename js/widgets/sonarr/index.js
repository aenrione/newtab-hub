/* ── Sonarr widget plugin ── */

Hub.injectStyles("widget-sonarr", `
  .sonarr-list { overflow-y: auto; padding: 4px 0; }
  .sonarr-day {
    padding: 6px 12px 2px;
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--muted);
  }
  .sonarr-episode {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 8px;
    padding: 5px 12px;
    border-radius: var(--radius-sm);
    color: var(--text);
    text-decoration: none;
    transition: background 80ms;
  }
  a.sonarr-episode:hover { background: var(--surface-hover); }
  .sonarr-show { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .sonarr-meta { color: var(--muted); font-size: 0.76rem; white-space: nowrap; flex-shrink: 0; }
`);

Hub.registry.register("sonarr", {
  label: "Sonarr",
  icon: "clock",

  defaultConfig: function () {
    return { title: "On Deck", url: "http://localhost:8989", days: 7 };
  },

  credentialFields: [{ key: "apiKey", label: "API Key", type: "password" }],

  render: function (container, config) {
    container.innerHTML =
      '<div class="widget-header"><h2>' + Hub.escapeHtml(config.title || "On Deck") + "</h2></div>" +
      '<div class="sonarr-list"><div class="empty-state">Loading\u2026</div></div>';
  },

  load: async function (container, config, state, token) {
    var listEl = container.querySelector(".sonarr-list");

    var creds = await Hub.credentials.load(config._id);
    if (token !== state.renderToken) return;
    if (!creds.apiKey) {
      listEl.innerHTML = '<div class="empty-state">Add your Sonarr API key<br>in the widget editor.</div>';
      return;
    }

    var days = Math.max(1, Math.min(30, parseInt(config.days, 10) || 7));
    var today = new Date();
    var start = sonarrFormatDate(today);
    var endDate = new Date(today);
    endDate.setDate(endDate.getDate() + days);
    var end = sonarrFormatDate(endDate);
    var base = (config.url || "http://localhost:8989").replace(/\/$/, "");

    var episodes, seriesMap;
    try {
      var store = state.store;
      var opts = { headers: { "X-Api-Key": creds.apiKey } };
      var calUrl = base + "/api/v3/calendar?start=" + start + "&end=" + end;
      var parsed = await Promise.all([
        Hub.cachedFetchJSON(calUrl, "sonarr", store, opts),
        Hub.cachedFetchJSON(base + "/api/v3/series", "sonarr", store, opts)
      ]);
      episodes = parsed[0];
      seriesMap = {};
      parsed[1].forEach(function (s) { seriesMap[s.id] = s; });
    } catch (_) {
      if (token !== state.renderToken) return;
      listEl.innerHTML = '<div class="empty-state">Could not reach Sonarr.</div>';
      return;
    }

    if (token !== state.renderToken) return;

    if (!Array.isArray(episodes) || !episodes.length) {
      listEl.innerHTML = '<div class="empty-state">No episodes in the next ' + days + " days.</div>";
      return;
    }

    var groups = {};
    var order = [];
    episodes.forEach(function (ep) {
      var d = new Date(ep.airDateUtc);
      var key = d.toDateString();
      if (!groups[key]) {
        groups[key] = { date: d, episodes: [] };
        order.push(key);
      }
      groups[key].episodes.push(ep);
    });

    var todayStr = today.toDateString();
    var tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    var tomorrowStr = tomorrow.toDateString();

    var html = "";
    order.forEach(function (key) {
      var g = groups[key];
      var dayLabel;
      if (key === todayStr) dayLabel = "Today";
      else if (key === tomorrowStr) dayLabel = "Tomorrow";
      else dayLabel = g.date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });

      html += '<div class="sonarr-day">' + Hub.escapeHtml(dayLabel) + "</div>";

      g.episodes.forEach(function (ep) {
        var series = seriesMap[ep.seriesId] || {};
        var show = series.title || "Unknown";
        var slug = series.titleSlug;
        var epNum = "S" + sonarrPad(ep.seasonNumber) + "E" + sonarrPad(ep.episodeNumber);
        var time = new Date(ep.airDateUtc).toLocaleTimeString("en-US", {
          hour: "2-digit", minute: "2-digit", hour12: false
        });
        var meta = Hub.escapeHtml(epNum + "\u00B7" + time);
        var showHtml = '<span class="sonarr-show">' + Hub.escapeHtml(show) + "</span>";
        var metaHtml = '<span class="sonarr-meta">' + meta + "</span>";

        if (slug) {
          html += '<a class="sonarr-episode" href="' +
            Hub.escapeHtml(base + "/series/" + slug) +
            '" target="_blank" rel="noreferrer"' +
            ' data-focusable="true" data-title="' + Hub.escapeHtml(show) + '">' +
            showHtml + metaHtml + "</a>";
        } else {
          html += '<div class="sonarr-episode">' + showHtml + metaHtml + "</div>";
        }
      });
    });

    listEl.innerHTML = html;
  },

  renderEditor: function (container, config, onChange) {
    container.replaceChildren();

    var titleLabel = document.createElement("label");
    titleLabel.className = "editor-field";
    titleLabel.innerHTML =
      "<span>Widget title</span>" +
      '<input type="text" value="' + Hub.escapeHtml(config.title || "On Deck") + '" />';
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
      "<span>Sonarr URL</span>" +
      '<input type="text" value="' + Hub.escapeHtml(config.url || "http://localhost:8989") + '" />';
    urlLabel.querySelector("input").addEventListener("input", function (e) {
      config.url = e.target.value;
      onChange(config);
    });
    container.appendChild(urlLabel);

    var daysLabel = document.createElement("label");
    daysLabel.className = "editor-field";
    daysLabel.innerHTML =
      "<span>Days to show</span>" +
      '<input type="number" min="1" max="30" value="' + (config.days || 7) + '" />';
    daysLabel.querySelector("input").addEventListener("input", function (e) {
      config.days = parseInt(e.target.value, 10) || 7;
      onChange(config);
    });
    container.appendChild(daysLabel);
  }
});

/* ── Helpers ── */

function sonarrFormatDate(d) {
  return d.getFullYear() + "-" + sonarrPad(d.getMonth() + 1) + "-" + sonarrPad(d.getDate());
}

function sonarrPad(n) {
  return n < 10 ? "0" + n : String(n);
}
