/* ── Lobsters widget plugin ── */

Hub.injectStyles("widget-lobsters", `
  .lobsters-list { display: grid; gap: 1px; }
  .lobsters-row {
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding: 6px 8px;
    border-radius: var(--radius-sm);
    color: var(--text);
    text-decoration: none;
    font-size: 0.86rem;
    transition: background 80ms;
  }
  .lobsters-row:hover { background: var(--surface-hover); }
  .lobsters-title {
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .lobsters-meta { display: flex; gap: 8px; align-items: center; }
  .lobsters-score { color: var(--accent-2); font-size: 0.7rem; font-weight: 700; flex-shrink: 0; }
  .lobsters-comments { color: var(--muted); font-size: 0.7rem; text-decoration: none; flex-shrink: 0; }
  .lobsters-comments:hover { color: var(--text); }
  .lobsters-tag {
    font-size: 0.6rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    padding: 1px 5px;
    border-radius: 3px;
    background: var(--surface-hover);
    color: var(--muted);
    flex-shrink: 0;
  }
  .lobsters-age { color: var(--muted); font-size: 0.68rem; margin-left: auto; flex-shrink: 0; }
`);

Hub.registry.register("lobsters", {
  label: "Lobsters",
  icon: "https://lobste.rs/favicon.ico",

  render: function (container, config) {
    container.innerHTML =
      '<div class="widget-header"><h2>' + Hub.escapeHtml(config.title || "Lobsters") + '</h2></div>' +
      '<div class="lobsters-list"><div class="empty-state">Loading\u2026</div></div>';
  },

  load: async function (container, config, state, token) {
    var listEl = container.querySelector(".lobsters-list");
    var sort = config.sort || "hottest";
    var limit = Math.min(config.limit || 10, 25);
    var tags = (config.tags || []).filter(Boolean);

    var url = tags.length
      ? "https://lobste.rs/t/" + encodeURIComponent(tags[0]) + ".json"
      : "https://lobste.rs/" + sort + ".json";

    try {
      var data = await Hub.cachedFetchJSON(url, "default", state.store);
      if (token !== state.renderToken) return;

      var stories = Array.isArray(data) ? data : [];
      if (!stories.length) {
        listEl.innerHTML = '<div class="empty-state">No stories found.</div>';
        return;
      }

      var frag = document.createDocumentFragment();
      stories.slice(0, limit).forEach(function (s) {
        var href = s.url || s.comments_url;
        var age = lobstersAge(s.created_at);
        var firstTag = (s.tags && s.tags[0]) || "";

        state.links.push({ title: s.title, href: href, type: "lobsters" });

        var a = Hub.createLink("lobsters-row", href, s.title);
        a.dataset.searchText = s.title + " " + (s.tags || []).join(" ");
        a.innerHTML =
          '<span class="lobsters-title">' + Hub.escapeHtml(s.title) + '</span>' +
          '<span class="lobsters-meta">' +
            '<span class="lobsters-score">\u25B2 ' + (s.score || 0) + '</span>' +
            '<a href="' + Hub.escapeHtml(s.comments_url) + '" class="lobsters-comments" target="_self" rel="noreferrer" ' +
              'onclick="event.stopPropagation()">' +
              '\uD83D\uDCAC ' + (s.comment_count || 0) +
            '</a>' +
            (firstTag ? '<span class="lobsters-tag">' + Hub.escapeHtml(firstTag) + '</span>' : '') +
            '<span class="lobsters-age">' + Hub.escapeHtml(age) + '</span>' +
          '</span>';
        frag.appendChild(a);
      });

      listEl.replaceChildren(frag);
    } catch (_) {
      if (token !== state.renderToken) return;
      listEl.innerHTML = '<div class="empty-state">Failed to load stories.</div>';
    }
  },

  renderEditor: function (container, config, onChange) {
    container.replaceChildren();

    var titleLabel = document.createElement("label");
    titleLabel.className = "editor-field";
    titleLabel.innerHTML = '<span>Widget title</span><input type="text" value="' + Hub.escapeHtml(config.title || "Lobsters") + '" />';
    titleLabel.querySelector("input").addEventListener("input", function (e) { config.title = e.target.value; onChange(config); });
    container.appendChild(titleLabel);

    var sortLabel = document.createElement("label");
    sortLabel.className = "editor-field";
    var sortVal = config.sort || "hottest";
    sortLabel.innerHTML =
      '<span>Sort</span>' +
      '<select>' +
        '<option value="hottest"' + (sortVal === "hottest" ? " selected" : "") + '>Hottest</option>' +
        '<option value="newest"' + (sortVal === "newest" ? " selected" : "") + '>Newest</option>' +
        '<option value="active"' + (sortVal === "active" ? " selected" : "") + '>Active</option>' +
      '</select>';
    sortLabel.querySelector("select").addEventListener("change", function (e) { config.sort = e.target.value; onChange(config); });
    container.appendChild(sortLabel);

    var limitLabel = document.createElement("label");
    limitLabel.className = "editor-field";
    limitLabel.innerHTML = '<span>Stories to show</span><input type="number" min="1" max="25" value="' + (config.limit || 10) + '" />';
    limitLabel.querySelector("input").addEventListener("input", function (e) {
      var n = parseInt(e.target.value, 10);
      if (n > 0 && n <= 25) { config.limit = n; onChange(config); }
    });
    container.appendChild(limitLabel);

    var hint = document.createElement("p");
    hint.className = "editor-hint";
    hint.textContent = "Optionally filter by a single tag (e.g. programming, ask, show). Overrides sort when set.";
    container.appendChild(hint);

    var tagsLabel = document.createElement("label");
    tagsLabel.className = "editor-field";
    tagsLabel.innerHTML = '<span>Tag filter (optional)</span><input type="text" value="' + Hub.escapeHtml((config.tags || []).join(", ")) + '" placeholder="programming, ask\u2026" />';
    tagsLabel.querySelector("input").addEventListener("input", function (e) {
      config.tags = e.target.value.split(",").map(function (t) { return t.trim(); }).filter(Boolean);
      onChange(config);
    });
    container.appendChild(tagsLabel);
  },

  defaultConfig: function () {
    return { title: "Lobsters", sort: "hottest", limit: 10, tags: [] };
  }
});

function lobstersAge(dateStr) {
  if (!dateStr) return "";
  var diff = Date.now() - new Date(dateStr).getTime();
  var mins = Math.floor(diff / 60000);
  if (mins < 60) return mins + "m";
  var hours = Math.floor(mins / 60);
  if (hours < 24) return hours + "h";
  return Math.floor(hours / 24) + "d";
}
