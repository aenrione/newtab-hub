/* ── YouTube widget plugin ── */

Hub.injectStyles("widget-youtube", `
  .yt-list { display: grid; gap: 2px; }
  .yt-row {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    padding: 6px 8px;
    border-radius: var(--radius-sm);
    color: var(--text);
    text-decoration: none;
    font-size: 0.86rem;
    transition: background 80ms;
    overflow: hidden;
    min-width: 0;
  }
  .yt-row:hover { background: var(--surface-hover); }
  .yt-thumb {
    width: 68px;
    height: 38px;
    object-fit: cover;
    border-radius: 3px;
    flex-shrink: 0;
    background: var(--surface-hover);
  }
  .yt-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
  .yt-title {
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    line-height: 1.3;
  }
  .yt-meta { display: flex; gap: 8px; align-items: center; }
  .yt-channel { color: var(--muted); font-size: 0.72rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
  .yt-age { color: var(--muted); font-size: 0.68rem; flex-shrink: 0; }
  .widget-youtube .editor-field--col { flex-direction: column; align-items: flex-start; gap: 4px; }
  .widget-youtube .editor-field--col textarea {
    width: 100%;
    min-height: 60px;
    padding: 6px 8px;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--bg);
    color: var(--text);
    font-size: 0.82rem;
    font-family: var(--font-body);
    resize: vertical;
  }
  .widget-youtube .editor-field--col textarea:focus { outline: none; border-color: var(--accent-2); }
`);

Hub.registry.register("youtube", {
  label: "YouTube",
  icon: "https://www.youtube.com/favicon.ico",
  manualRefresh: true,

  credentialFields: [
    { key: "apiKey", label: "YouTube API Key", type: "password" }
  ],

  render: function (container, config) {
    container.className += " widget-youtube";
    container.innerHTML =
      '<div class="widget-header"><h2>' + Hub.escapeHtml(config.title || "YouTube") + '</h2></div>' +
      '<div class="yt-list"><div class="empty-state">Loading\u2026</div></div>';
  },

  load: async function (container, config, state, token) {
    var listEl = container.querySelector(".yt-list");
    var channels = (config.channels || []).filter(Boolean);
    if (!channels.length) {
      listEl.innerHTML = '<div class="empty-state">Add channel IDs in the widget editor.</div>';
      return;
    }

    var creds = await Hub.credentials.load(config._id);
    if (!creds.apiKey) {
      listEl.innerHTML = '<div class="empty-state">Add your YouTube API key in the widget editor.</div>';
      return;
    }

    var limit = Math.min(config.limit || 5, 20);
    var perChannel = Math.max(1, Math.ceil(limit / channels.length));
    var store = state.store;

    try {
      var allVideos = [];
      var results = await Promise.allSettled(channels.map(function (channelId) {
        var url = "https://www.googleapis.com/youtube/v3/search" +
          "?channelId=" + encodeURIComponent(channelId) +
          "&type=video&order=date&maxResults=" + perChannel +
          "&part=snippet&key=" + encodeURIComponent(creds.apiKey);
        return Hub.cachedFetchJSON(url, "default", store, null, Hub.cache.scopeKey(config._id, "youtube::" + url));
      }));

      results.forEach(function (r) {
        if (r.status === "fulfilled" && r.value && r.value.items) {
          r.value.items.forEach(function (item) { allVideos.push(item); });
        }
      });

      allVideos.sort(function (a, b) {
        return new Date(b.snippet.publishedAt) - new Date(a.snippet.publishedAt);
      });

      if (token !== state.renderToken) return;

      if (!allVideos.length) {
        listEl.innerHTML = '<div class="empty-state">No videos found.</div>';
        return;
      }

      var frag = document.createDocumentFragment();
      allVideos.slice(0, limit).forEach(function (item) {
        var s = item.snippet;
        var videoId = item.id && item.id.videoId;
        if (!videoId) return;
        var url = "https://www.youtube.com/watch?v=" + videoId;
        var thumb = s.thumbnails && (s.thumbnails.default || s.thumbnails.medium);

        state.links.push({ title: s.title, href: url, type: "youtube" });

        var a = Hub.createLink("yt-row", url, s.title);
        a.dataset.searchText = s.title + " " + (s.channelTitle || "");
        a.innerHTML =
          (thumb ? '<img class="yt-thumb" src="' + Hub.escapeHtml(thumb.url) + '" alt="" loading="lazy" />' : '') +
          '<span class="yt-info">' +
            '<span class="yt-title">' + Hub.escapeHtml(s.title) + '</span>' +
            '<span class="yt-meta">' +
              '<span class="yt-channel">' + Hub.escapeHtml(s.channelTitle || "") + '</span>' +
              '<span class="yt-age">' + Hub.escapeHtml(ytAge(s.publishedAt)) + '</span>' +
            '</span>' +
          '</span>';
        frag.appendChild(a);
      });

      listEl.replaceChildren(frag);
    } catch (err) {
      if (token !== state.renderToken) return;
      var msg = String(err && err.message || "").includes("403")
        ? "Invalid or quota-exceeded API key."
        : "Failed to load videos.";
      listEl.innerHTML = '<div class="empty-state">' + Hub.escapeHtml(msg) + '</div>';
    }
  },

  renderEditor: function (container, config, onChange) {
    container.replaceChildren();

    var titleLabel = document.createElement("label");
    titleLabel.className = "editor-field";
    titleLabel.innerHTML = '<span>Widget title</span><input type="text" value="' + Hub.escapeHtml(config.title || "YouTube") + '" />';
    var titleInput = titleLabel.querySelector("input");
    titleInput.dataset.navHeaderField = "";
    titleInput.addEventListener("input", function (e) { config.title = e.target.value; onChange(config); });
    container.appendChild(titleLabel);

    var limitLabel = document.createElement("label");
    limitLabel.className = "editor-field";
    limitLabel.innerHTML = '<span>Videos to show</span><input type="number" min="1" max="20" value="' + (config.limit || 5) + '" />';
    limitLabel.querySelector("input").addEventListener("input", function (e) {
      var n = parseInt(e.target.value, 10);
      if (n > 0 && n <= 20) { config.limit = n; onChange(config); }
    });
    container.appendChild(limitLabel);

    var hint = document.createElement("p");
    hint.className = "editor-hint";
    hint.textContent = "One channel ID per line (e.g. UCBcRF18a7Qf58cCRy5xuWwQ). Find it in the channel\u2019s About page URL.";
    container.appendChild(hint);

    var channelsLabel = document.createElement("label");
    channelsLabel.className = "editor-field editor-field--col";
    channelsLabel.innerHTML =
      '<span>Channel IDs</span>' +
      '<textarea rows="3" placeholder="UCxxxxxx&#10;UCxxxxxx">' +
      Hub.escapeHtml((config.channels || []).join("\n")) +
      '</textarea>';
    channelsLabel.querySelector("textarea").addEventListener("input", function (e) {
      config.channels = e.target.value.split("\n").map(function (r) { return r.trim(); }).filter(Boolean);
      onChange(config);
    });
    container.appendChild(channelsLabel);
  },

  defaultConfig: function () {
    return { title: "YouTube", channels: [], limit: 5 };
  }
});

function ytAge(dateStr) {
  if (!dateStr) return "";
  var diff = Date.now() - new Date(dateStr).getTime();
  var mins = Math.floor(diff / 60000);
  if (mins < 60) return mins + "m";
  var hours = Math.floor(mins / 60);
  if (hours < 24) return hours + "h";
  var days = Math.floor(hours / 24);
  if (days < 30) return days + "d";
  return Math.floor(days / 30) + "mo";
}
