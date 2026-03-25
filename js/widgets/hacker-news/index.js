/* ── Hacker News widget plugin ── */

Hub.injectStyles("widget-hacker-news", `
  .hn-list { display: grid; gap: 1px; }
  .hn-row {
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
  .hn-row:hover { background: var(--surface-hover); }
  .hn-title {
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .hn-meta {
    display: flex;
    gap: 10px;
    align-items: center;
  }
  .hn-score { color: var(--accent-2); font-size: 0.7rem; font-weight: 700; }
  .hn-comments { color: var(--muted); font-size: 0.7rem; text-decoration: none; }
  .hn-comments:hover { color: var(--text); }
  .hn-age { color: var(--muted); font-size: 0.68rem; margin-left: auto; }
`);

Hub.registry.register("hacker-news", {
  label: "Hacker News",
  icon: "\u25B2",

  render: function (container, config) {
    container.innerHTML =
      '<div class="widget-header"><h2>' + Hub.escapeHtml(config.title || "Hacker News") + '</h2></div>' +
      '<div class="hn-list"><div class="empty-state">Loading\u2026</div></div>';
  },

  load: async function (container, config, state, token) {
    var listEl = container.querySelector(".hn-list");
    var limit = Math.min(config.limit || 10, 30);
    var sort = config.sort || "top";
    var tag = sort === "new" ? "story" : "front_page";

    try {
      var data = await Hub.cachedFetchJSON(
        "https://hn.algolia.com/api/v1/search?tags=" + tag + "&hitsPerPage=" + limit,
        "default",
        state.store
      );

      if (token !== state.renderToken) return;

      var hits = (data && data.hits) || [];
      if (!hits.length) {
        listEl.innerHTML = '<div class="empty-state">No stories found.</div>';
        return;
      }

      var frag = document.createDocumentFragment();
      hits.slice(0, limit).forEach(function (hit) {
        var url = hit.url || "https://news.ycombinator.com/item?id=" + hit.objectID;
        var commentsUrl = "https://news.ycombinator.com/item?id=" + hit.objectID;

        state.links.push({ title: hit.title, href: url, type: "hacker-news" });

        var a = Hub.createLink("hn-row", url, hit.title);
        a.dataset.searchText = hit.title;
        a.innerHTML =
          '<span class="hn-title">' + Hub.escapeHtml(hit.title) + '</span>' +
          '<span class="hn-meta">' +
            '<span class="hn-score">\u25B2 ' + (hit.points || 0) + '</span>' +
            '<a href="' + Hub.escapeHtml(commentsUrl) + '" class="hn-comments" target="_self" rel="noreferrer" ' +
              'onclick="event.stopPropagation()">' +
              '\uD83D\uDCAC ' + (hit.num_comments || 0) +
            '</a>' +
            '<span class="hn-age">' + Hub.escapeHtml(hnAge(hit.created_at)) + '</span>' +
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
    titleLabel.innerHTML = '<span>Widget title</span><input type="text" value="' + Hub.escapeHtml(config.title || "Hacker News") + '" />';
    titleLabel.querySelector("input").addEventListener("input", function (e) { config.title = e.target.value; onChange(config); });
    container.appendChild(titleLabel);

    var limitLabel = document.createElement("label");
    limitLabel.className = "editor-field";
    limitLabel.innerHTML = '<span>Stories to show</span><input type="number" min="1" max="30" value="' + (config.limit || 10) + '" />';
    limitLabel.querySelector("input").addEventListener("input", function (e) {
      var n = parseInt(e.target.value, 10);
      if (n > 0 && n <= 30) { config.limit = n; onChange(config); }
    });
    container.appendChild(limitLabel);

    var sortLabel = document.createElement("label");
    sortLabel.className = "editor-field";
    var sortVal = config.sort || "top";
    sortLabel.innerHTML =
      '<span>Sort</span>' +
      '<select>' +
        '<option value="top"' + (sortVal === "top" ? " selected" : "") + '>Front page</option>' +
        '<option value="new"' + (sortVal === "new" ? " selected" : "") + '>New</option>' +
      '</select>';
    sortLabel.querySelector("select").addEventListener("change", function (e) { config.sort = e.target.value; onChange(config); });
    container.appendChild(sortLabel);
  },

  defaultConfig: function () {
    return { title: "Hacker News", limit: 10, sort: "top" };
  }
});

function hnAge(dateStr) {
  if (!dateStr) return "";
  var diff = Date.now() - new Date(dateStr).getTime();
  var mins = Math.floor(diff / 60000);
  if (mins < 60) return mins + "m";
  var hours = Math.floor(mins / 60);
  if (hours < 24) return hours + "h";
  return Math.floor(hours / 24) + "d";
}
