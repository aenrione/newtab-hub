/* ── Reddit widget plugin ── */

Hub.injectStyles("widget-reddit", `
  .reddit-list { display: grid; gap: 1px; }
  .reddit-row {
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
  .reddit-row:hover { background: var(--surface-hover); }
  .reddit-title {
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .reddit-meta {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  .reddit-score { color: var(--accent-2); font-size: 0.7rem; font-weight: 700; flex-shrink: 0; }
  .reddit-comments { color: var(--muted); font-size: 0.7rem; text-decoration: none; flex-shrink: 0; }
  .reddit-comments:hover { color: var(--text); }
  .reddit-flair {
    font-size: 0.62rem;
    background: var(--surface-hover);
    color: var(--muted);
    padding: 1px 5px;
    border-radius: 3px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 90px;
  }
  .reddit-age { color: var(--muted); font-size: 0.68rem; margin-left: auto; flex-shrink: 0; }
`);

Hub.registry.register("reddit", {
  label: "Reddit",
  icon: "\uD83D\uDC31",

  render: function (container, config) {
    var sub = (config.subreddit || "").replace(/^r\//, "") || "…";
    container.innerHTML =
      '<div class="widget-header"><h2>' + Hub.escapeHtml(config.title || ("r/" + sub)) + '</h2></div>' +
      '<div class="reddit-list"><div class="empty-state">Loading\u2026</div></div>';
  },

  load: async function (container, config, state, token) {
    var listEl = container.querySelector(".reddit-list");
    var sub = (config.subreddit || "").replace(/^r\//, "").trim();
    if (!sub) {
      listEl.innerHTML = '<div class="empty-state">Set a subreddit in the widget editor.</div>';
      return;
    }

    var sort = config.sort || "hot";
    var limit = Math.min(config.limit || 10, 25);
    var url = "https://www.reddit.com/r/" + encodeURIComponent(sub) + "/" + sort + ".json?limit=" + limit + "&raw_json=1";

    try {
      var data = await Hub.cachedFetchJSON(url, "default", state.store);
      if (token !== state.renderToken) return;

      var posts = (data && data.data && data.data.children) || [];
      if (!posts.length) {
        listEl.innerHTML = '<div class="empty-state">No posts found.</div>';
        return;
      }

      var frag = document.createDocumentFragment();
      posts.forEach(function (child) {
        var p = child.data;
        var postUrl = p.is_self ? ("https://reddit.com" + p.permalink) : (p.url || "https://reddit.com" + p.permalink);
        var commentsUrl = "https://reddit.com" + p.permalink;

        state.links.push({ title: p.title, href: postUrl, type: "reddit" });

        var a = Hub.createLink("reddit-row", postUrl, p.title);
        a.dataset.searchText = p.title + " r/" + sub;
        a.innerHTML =
          '<span class="reddit-title">' + Hub.escapeHtml(p.title) + '</span>' +
          '<span class="reddit-meta">' +
            '<span class="reddit-score">\u25B2 ' + redditScore(p.score) + '</span>' +
            '<a href="' + Hub.escapeHtml(commentsUrl) + '" class="reddit-comments" target="_self" rel="noreferrer" ' +
              'onclick="event.stopPropagation()">' +
              '\uD83D\uDCAC ' + redditScore(p.num_comments) +
            '</a>' +
            (p.link_flair_text ? '<span class="reddit-flair">' + Hub.escapeHtml(p.link_flair_text) + '</span>' : '') +
            '<span class="reddit-age">' + Hub.escapeHtml(redditAge(p.created_utc)) + '</span>' +
          '</span>';
        frag.appendChild(a);
      });

      listEl.replaceChildren(frag);
    } catch (_) {
      if (token !== state.renderToken) return;
      listEl.innerHTML = '<div class="empty-state">Failed to load r/' + Hub.escapeHtml(sub) + '.</div>';
    }
  },

  renderEditor: function (container, config, onChange) {
    container.replaceChildren();

    var titleLabel = document.createElement("label");
    titleLabel.className = "editor-field";
    titleLabel.innerHTML = '<span>Widget title</span><input type="text" value="' + Hub.escapeHtml(config.title || "") + '" placeholder="Leave blank to use subreddit name" />';
    titleLabel.querySelector("input").addEventListener("input", function (e) { config.title = e.target.value; onChange(config); });
    container.appendChild(titleLabel);

    var subLabel = document.createElement("label");
    subLabel.className = "editor-field";
    subLabel.innerHTML = '<span>Subreddit</span><input type="text" placeholder="programming, worldnews\u2026" value="' + Hub.escapeHtml(config.subreddit || "") + '" />';
    subLabel.querySelector("input").addEventListener("input", function (e) {
      config.subreddit = e.target.value.replace(/^r\//, "").trim();
      onChange(config);
    });
    container.appendChild(subLabel);

    var sortLabel = document.createElement("label");
    sortLabel.className = "editor-field";
    var sortVal = config.sort || "hot";
    sortLabel.innerHTML =
      '<span>Sort</span>' +
      '<select>' +
        '<option value="hot"' + (sortVal === "hot" ? " selected" : "") + '>Hot</option>' +
        '<option value="new"' + (sortVal === "new" ? " selected" : "") + '>New</option>' +
        '<option value="top"' + (sortVal === "top" ? " selected" : "") + '>Top</option>' +
        '<option value="rising"' + (sortVal === "rising" ? " selected" : "") + '>Rising</option>' +
      '</select>';
    sortLabel.querySelector("select").addEventListener("change", function (e) { config.sort = e.target.value; onChange(config); });
    container.appendChild(sortLabel);

    var limitLabel = document.createElement("label");
    limitLabel.className = "editor-field";
    limitLabel.innerHTML = '<span>Posts to show</span><input type="number" min="1" max="25" value="' + (config.limit || 10) + '" />';
    limitLabel.querySelector("input").addEventListener("input", function (e) {
      var n = parseInt(e.target.value, 10);
      if (n > 0 && n <= 25) { config.limit = n; onChange(config); }
    });
    container.appendChild(limitLabel);
  },

  defaultConfig: function () {
    return { title: "", subreddit: "programming", sort: "hot", limit: 10 };
  }
});

function redditScore(n) {
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return String(n || 0);
}

function redditAge(utc) {
  if (!utc) return "";
  var diff = Date.now() - utc * 1000;
  var mins = Math.floor(diff / 60000);
  if (mins < 60) return mins + "m";
  var hours = Math.floor(mins / 60);
  if (hours < 24) return hours + "h";
  var days = Math.floor(hours / 24);
  if (days < 30) return days + "d";
  return Math.floor(days / 30) + "mo";
}
