/* ── Feeds widget plugin ── */

Hub.injectStyles("widget-feeds", `
  .feed-sections { display: grid; gap: 10px; }
  .feed-source {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 4px;
    font-size: 0.76rem;
  }
  .feed-source strong { color: var(--muted-strong); font-size: 0.76rem; }
  .feed-site-link { color: var(--accent-2); text-decoration: none; font-size: 0.7rem; }
  .feed-rows { display: grid; gap: 1px; }
  .feed-row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 10px;
    padding: 4px 6px;
    border-radius: var(--radius-sm);
    color: var(--text);
    text-decoration: none;
    font-size: 0.86rem;
    transition: background 80ms;
  }
  .feed-row:hover { background: var(--surface-hover); }
  .feed-headline {
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .feed-date { color: var(--muted); font-size: 0.68rem; flex-shrink: 0; }
`);

Hub.registry.register("feeds", {
  label: "Feeds",
  icon: "rss",

  render: function (container, config) {
    container.innerHTML =
      '<div class="widget-header"><h2>' + Hub.escapeHtml(config.title || "Feeds") + '</h2></div>' +
      '<div class="feed-sections"><div class="empty-state">Loading...</div></div>';
  },

  load: async function (container, config, state, token) {
    var feeds = config.items || [];
    var listEl = container.querySelector(".feed-sections");
    if (!feeds.length) { listEl.innerHTML = '<div class="empty-state">No feeds configured.</div>'; return; }

    var store = state.store;
    var results = await Promise.allSettled(feeds.map(async function (feed) {
      var xml = await Hub.cachedFetch(feed.url, "feeds", store);
      var doc = new DOMParser().parseFromString(xml, "text/xml");
      var entries = Array.from(doc.querySelectorAll("item, entry")).map(readEntry).filter(Boolean).slice(0, 4);
      return Object.assign({}, feed, { entries: entries });
    }));

    if (token !== state.renderToken) return;

    var frag = document.createDocumentFragment();
    results.forEach(function (r, i) {
      var fallback = feeds[i];
      if (!fallback) return;

      var section = document.createElement("div");
      section.className = "feed-section";

      if (r.status === "fulfilled") {
        var feed = r.value;
        feed.entries.forEach(function (e) {
          state.feedEntries.push({ title: e.title, href: e.link, type: feed.title });
        });

        var rows = feed.entries.map(function (e) {
          return '<a class="feed-row" href="' + Hub.escapeHtml(e.link) + '" target="_self" rel="noreferrer" ' +
            'data-focusable="true" data-title="' + Hub.escapeHtml(e.title) + '">' +
            '<span class="feed-headline">' + Hub.escapeHtml(e.title) + '</span>' +
            '<span class="feed-date">' + Hub.formatDate(e.date) + '</span></a>';
        }).join("");

        section.innerHTML =
          '<div class="feed-source"><strong>' + Hub.escapeHtml(feed.title) + '</strong>' +
          '<a href="' + Hub.escapeHtml(feed.site) + '" target="_self" rel="noreferrer" class="feed-site-link">Open</a></div>' +
          '<div class="feed-rows">' + (rows || '<div class="empty-state">No entries.</div>') + '</div>';
      } else {
        section.innerHTML =
          '<div class="feed-source"><strong>' + Hub.escapeHtml(fallback.title) + '</strong>' +
          '<a href="' + Hub.escapeHtml(fallback.site) + '" target="_self" rel="noreferrer" class="feed-site-link">Open</a></div>' +
          '<div class="empty-state">Feed unavailable.</div>';
      }
      frag.appendChild(section);
    });

    listEl.replaceChildren(frag.childNodes.length ? frag : emptyNode("No feeds."));
  },

  renderEditor: function (container, config, onChange, navOptions) {
    container.replaceChildren();
    var titleLabel = document.createElement("label");
    titleLabel.className = "editor-field";
    titleLabel.innerHTML = '<span>Widget title</span><input type="text" value="' + Hub.escapeHtml(config.title || "Feeds") + '" />';
    var titleInput = titleLabel.querySelector("input");
    titleInput.addEventListener("input", function (e) { config.title = e.target.value; onChange(config); });
    container.appendChild(titleLabel);

    var itemsWrap = document.createElement("div");
    container.appendChild(itemsWrap);
    buildListEditor(itemsWrap, config, "items", onChange, [
      { key: "title", label: "Title" },
      { key: "url", label: "Feed URL" },
      { key: "site", label: "Site URL" }
    ], function () { return { title: "", url: "https://", site: "https://" }; }, navOptions);
  },

  defaultConfig: function () {
    return { title: "Feeds", items: [] };
  }
});

function readEntry(item) {
  var title = item.querySelector("title")?.textContent?.trim();
  var atomLink = item.querySelector("link[href]")?.getAttribute("href")?.trim();
  var rssLink = item.querySelector("link")?.textContent?.trim();
  var link = atomLink || rssLink;
  var date = item.querySelector("pubDate, published, updated")?.textContent?.trim();
  if (!title || !link) return null;
  return { title: title, link: link, date: date };
}
