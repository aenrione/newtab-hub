/* ── Twitch Channels widget plugin ── */

Hub.injectStyles("widget-twitch-channels", `
  .twitch-list { display: grid; gap: 1px; }
  .twitch-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 8px;
    border-radius: var(--radius-sm);
    color: var(--text);
    text-decoration: none;
    font-size: 0.86rem;
    transition: background 80ms;
    overflow: hidden;
    min-width: 0;
  }
  .twitch-row:hover { background: var(--surface-hover); }
  .twitch-avatar {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    object-fit: cover;
    flex-shrink: 0;
    background: var(--surface-hover);
  }
  .twitch-info { display: flex; flex-direction: column; gap: 1px; flex: 1; min-width: 0; }
  .twitch-name { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.84rem; }
  .twitch-game { font-size: 0.72rem; color: var(--muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .twitch-right { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; flex-shrink: 0; }
  .twitch-live {
    font-size: 0.6rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    padding: 2px 5px;
    border-radius: 3px;
    background: #e91916;
    color: #fff;
  }
  .twitch-offline {
    font-size: 0.6rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    padding: 2px 5px;
    border-radius: 3px;
    background: var(--surface-hover);
    color: var(--muted);
  }
  .twitch-viewers { font-size: 0.68rem; color: var(--muted); font-family: var(--font-display); }
`);

Hub.registry.register("twitch-channels", {
  label: "Twitch Channels",
  icon: "\uD83C\uDFAE",

  credentialFields: [
    { key: "clientId", label: "Twitch Client ID", type: "password" },
    { key: "accessToken", label: "Twitch Access Token", type: "password" }
  ],

  render: function (container, config) {
    container.innerHTML =
      '<div class="widget-header"><h2>' + Hub.escapeHtml(config.title || "Twitch") + '</h2></div>' +
      '<div class="twitch-list"><div class="empty-state">Loading\u2026</div></div>';
  },

  load: async function (container, config, state, token) {
    var listEl = container.querySelector(".twitch-list");
    var channels = (config.channels || []).filter(Boolean);
    if (!channels.length) {
      listEl.innerHTML = '<div class="empty-state">Add channel names in the widget editor.</div>';
      return;
    }

    var creds = await Hub.credentials.load(config._id);
    if (!creds.clientId || !creds.accessToken) {
      listEl.innerHTML = '<div class="empty-state">Add your Twitch Client ID and Access Token in the widget editor.</div>';
      return;
    }

    var headers = {
      "Client-ID": creds.clientId,
      "Authorization": "Bearer " + creds.accessToken
    };

    var store = state.store;
    var loginParams = channels.map(function (c) { return "user_login=" + encodeURIComponent(c.toLowerCase()); }).join("&");

    try {
      var [streamsData, usersData] = await Promise.all([
        twitchCachedFetch("https://api.twitch.tv/helix/streams?" + loginParams, headers, store),
        twitchCachedFetch("https://api.twitch.tv/helix/users?" + loginParams, headers, store)
      ]);

      if (token !== state.renderToken) return;

      var streams = (streamsData && streamsData.data) || [];
      var users = (usersData && usersData.data) || [];

      /* Index streams and users by login name */
      var streamsByLogin = {};
      streams.forEach(function (s) { streamsByLogin[s.user_login.toLowerCase()] = s; });
      var usersByLogin = {};
      users.forEach(function (u) { usersByLogin[u.login.toLowerCase()] = u; });

      /* Sort: live channels first, then offline */
      var sorted = channels.slice().sort(function (a, b) {
        var aLive = !!streamsByLogin[a.toLowerCase()];
        var bLive = !!streamsByLogin[b.toLowerCase()];
        if (aLive && !bLive) return -1;
        if (!aLive && bLive) return 1;
        return 0;
      });

      if (!config.showOffline) {
        sorted = sorted.filter(function (c) { return !!streamsByLogin[c.toLowerCase()]; });
      }

      if (!sorted.length) {
        listEl.innerHTML = '<div class="empty-state">No channels live right now.</div>';
        return;
      }

      var frag = document.createDocumentFragment();
      sorted.forEach(function (channelName) {
        var login = channelName.toLowerCase();
        var stream = streamsByLogin[login];
        var user = usersByLogin[login];
        var href = "https://twitch.tv/" + encodeURIComponent(login);
        var displayName = (user && user.display_name) || channelName;

        state.links.push({ title: displayName, href: href, type: "twitch" });

        var a = Hub.createLink("twitch-row", href, displayName);
        a.dataset.searchText = displayName + " " + (stream ? stream.game_name : "");
        a.innerHTML =
          (user && user.profile_image_url
            ? '<img class="twitch-avatar" src="' + Hub.escapeHtml(user.profile_image_url) + '" alt="" loading="lazy" />'
            : '') +
          '<span class="twitch-info">' +
            '<span class="twitch-name">' + Hub.escapeHtml(displayName) + '</span>' +
            (stream ? '<span class="twitch-game">' + Hub.escapeHtml(stream.game_name || "") + '</span>' : '') +
          '</span>' +
          '<span class="twitch-right">' +
            (stream
              ? '<span class="twitch-live">Live</span>' +
                '<span class="twitch-viewers">' + twitchViewers(stream.viewer_count) + '</span>'
              : '<span class="twitch-offline">Offline</span>') +
          '</span>';
        frag.appendChild(a);
      });

      listEl.replaceChildren(frag);
    } catch (err) {
      if (token !== state.renderToken) return;
      var msg = String(err && err.message || "").includes("401")
        ? "Invalid credentials \u2014 check your Client ID and token."
        : "Failed to load channels.";
      listEl.innerHTML = '<div class="empty-state">' + Hub.escapeHtml(msg) + '</div>';
    }
  },

  renderEditor: function (container, config, onChange, navOptions) {
    container.replaceChildren();

    var titleLabel = document.createElement("label");
    titleLabel.className = "editor-field";
    titleLabel.innerHTML = '<span>Widget title</span><input type="text" value="' + Hub.escapeHtml(config.title || "Twitch") + '" />';
    var titleInput = titleLabel.querySelector("input");
    titleInput.dataset.navHeaderField = "";
    titleInput.addEventListener("input", function (e) { config.title = e.target.value; onChange(config); });
    container.appendChild(titleLabel);

    var offlineLabel = document.createElement("label");
    offlineLabel.className = "editor-field";
    offlineLabel.innerHTML =
      '<span>Show offline channels</span>' +
      '<input type="checkbox"' + (config.showOffline ? " checked" : "") + ' style="width:auto" />';
    offlineLabel.querySelector("input").addEventListener("change", function (e) { config.showOffline = e.target.checked; onChange(config); });
    container.appendChild(offlineLabel);

    var hint = document.createElement("p");
    hint.className = "editor-hint";
    hint.textContent = "One channel name per line. Get credentials at dev.twitch.tv \u2014 you need a Client ID and an App Access Token.";
    container.appendChild(hint);

    var itemsWrap = document.createElement("div");
    container.appendChild(itemsWrap);
    buildListEditor(itemsWrap, config, "channels", onChange, [
      { key: "value", label: "Channel name" }
    ], function () { return { value: "" }; }, navOptions);

    /* channels is a flat string array, not object array — handle that */
    if (!config.channels || !config.channels.length || typeof config.channels[0] === "string") {
      var channels = config.channels || [];
      itemsWrap.replaceChildren();
      var addBtn = document.createElement("button");
      addBtn.type = "button";
      addBtn.className = "toolbar-button toolbar-button-ghost";
      addBtn.textContent = "+ Add";
      addBtn.addEventListener("click", function () {
        channels.push("");
        config.channels = channels;
        onChange(config);
        rebuildChannels();
      });

      var listWrap = document.createElement("div");
      listWrap.className = "editor-items";
      itemsWrap.appendChild(listWrap);

      function rebuildChannels() {
        listWrap.replaceChildren();
        channels.forEach(function (ch, i) {
          var row = document.createElement("div");
          row.className = "editor-card";
          row.innerHTML =
            '<div class="editor-card-head">' +
              '<input type="text" style="flex:1;padding:4px 6px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--bg);color:var(--text);font-size:0.82rem" value="' + Hub.escapeHtml(ch) + '" placeholder="channelname" />' +
              '<button class="editor-remove" type="button" title="Remove">' + Hub.icons.trash2 + '</button>' +
            '</div>';
          row.querySelector("input").addEventListener("input", function (e) {
            channels[i] = e.target.value.trim();
            config.channels = channels;
            onChange(config);
          });
          row.querySelector(".editor-remove").addEventListener("click", function () {
            channels.splice(i, 1);
            config.channels = channels;
            onChange(config);
            rebuildChannels();
          });
          listWrap.appendChild(row);
        });
        if (!channels.length) {
          listWrap.innerHTML = '<div class="empty-state">None yet.</div>';
        }
      }

      rebuildChannels();
      itemsWrap.appendChild(addBtn);
    }
  },

  defaultConfig: function () {
    return { title: "Twitch", channels: [], showOffline: true };
  }
});

function twitchViewers(n) {
  if (!n) return "";
  if (n >= 1000) return (n / 1000).toFixed(1) + "k viewers";
  return n + " viewers";
}

function twitchCachedFetch(url, headers, store) {
  var cacheKey = "twitch::" + url;
  var cached = Hub.cache.get(cacheKey);
  if (cached !== null) return Promise.resolve(cached);
  return Hub.fetchWithTimeout(url, { headers: headers }, 10000)
    .then(function (res) {
      if (!res.ok) throw new Error(String(res.status));
      return res.json();
    })
    .then(function (data) {
      Hub.cache.set(cacheKey, data, "default", store);
      return data;
    });
}
