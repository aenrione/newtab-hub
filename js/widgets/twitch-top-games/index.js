/* ── Twitch Top Games widget plugin ── */

Hub.injectStyles("widget-twitch-top-games", `
  .ttg-list { display: grid; gap: 1px; }
  .ttg-row {
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
  .ttg-row:hover { background: var(--surface-hover); }
  .ttg-rank {
    font-family: var(--font-display);
    font-size: 0.72rem;
    font-weight: 700;
    color: var(--muted);
    width: 18px;
    text-align: right;
    flex-shrink: 0;
  }
  .ttg-thumb {
    width: 22px;
    height: 30px;
    object-fit: cover;
    border-radius: 2px;
    flex-shrink: 0;
    background: var(--surface-hover);
  }
  .ttg-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 500; }
`);

Hub.registry.register("twitch-top-games", {
  label: "Twitch Top Games",
  icon: "twitch",
  manualRefresh: true,

  credentialFields: [
    { key: "clientId", label: "Twitch Client ID", type: "password" },
    { key: "accessToken", label: "Twitch Access Token", type: "password" }
  ],

  render: function (container, config) {
    container.innerHTML =
      '<div class="widget-header"><h2>' + Hub.escapeHtml(config.title || "Top Games") + '</h2></div>' +
      '<div class="ttg-list"><div class="empty-state">Loading\u2026</div></div>';
  },

  load: async function (container, config, state, token) {
    var listEl = container.querySelector(".ttg-list");

    var creds = await Hub.credentials.load(config._id);
    if (!creds.clientId || !creds.accessToken) {
      listEl.innerHTML = '<div class="empty-state">Add your Twitch Client ID and Access Token in the widget editor.</div>';
      return;
    }

    var limit = Math.min(config.limit || 10, 20);
    var exclude = (config.exclude || []).map(function (e) { return e.toLowerCase(); });
    var headers = {
      "Client-ID": creds.clientId,
      "Authorization": "Bearer " + creds.accessToken
    };

    try {
      var cacheKey = Hub.cache.scopeKey(config._id, "twitch-top-games::" + limit);
      var data = Hub.cache.get(cacheKey);
      if (!data) {
        var res = await Hub.fetchWithTimeout(
          "https://api.twitch.tv/helix/games/top?first=" + (limit + exclude.length),
          { headers: headers },
          10000
        );
        if (!res.ok) throw new Error(String(res.status));
        data = await res.json();
        Hub.cache.set(cacheKey, data, "default", state.store);
      }

      if (token !== state.renderToken) return;

      var games = ((data && data.data) || [])
        .filter(function (g) { return !exclude.includes(g.name.toLowerCase()); })
        .slice(0, limit);

      if (!games.length) {
        listEl.innerHTML = '<div class="empty-state">No games found.</div>';
        return;
      }

      var frag = document.createDocumentFragment();
      games.forEach(function (game, i) {
        var href = "https://www.twitch.tv/directory/game/" + encodeURIComponent(game.name);
        var thumb = game.box_art_url
          ? game.box_art_url.replace("{width}", "44").replace("{height}", "60")
          : "";

        state.links.push({ title: game.name, href: href, type: "twitch-game" });

        var a = Hub.createLink("ttg-row", href, game.name);
        a.dataset.searchText = game.name;
        a.innerHTML =
          '<span class="ttg-rank">' + (i + 1) + '</span>' +
          (thumb ? '<img class="ttg-thumb" src="' + Hub.escapeHtml(thumb) + '" alt="" loading="lazy" />' : '') +
          '<span class="ttg-name">' + Hub.escapeHtml(game.name) + '</span>';
        frag.appendChild(a);
      });

      listEl.replaceChildren(frag);
    } catch (err) {
      if (token !== state.renderToken) return;
      var msg = String(err && err.message || "").includes("401")
        ? "Invalid credentials \u2014 check your Client ID and token."
        : "Failed to load top games.";
      listEl.innerHTML = '<div class="empty-state">' + Hub.escapeHtml(msg) + '</div>';
    }
  },

  renderEditor: function (container, config, onChange, navOptions) {
    container.replaceChildren();

    var titleLabel = document.createElement("label");
    titleLabel.className = "editor-field";
    titleLabel.innerHTML = '<span>Widget title</span><input type="text" value="' + Hub.escapeHtml(config.title || "Top Games") + '" />';
    titleLabel.querySelector("input").addEventListener("input", function (e) { config.title = e.target.value; onChange(config); });
    container.appendChild(titleLabel);

    var limitLabel = document.createElement("label");
    limitLabel.className = "editor-field";
    limitLabel.innerHTML = '<span>Games to show</span><input type="number" min="1" max="20" value="' + (config.limit || 10) + '" />';
    limitLabel.querySelector("input").addEventListener("input", function (e) {
      var n = parseInt(e.target.value, 10);
      if (n > 0 && n <= 20) { config.limit = n; onChange(config); }
    });
    container.appendChild(limitLabel);

    var hint = document.createElement("p");
    hint.className = "editor-hint";
    hint.textContent = "Optionally exclude specific games (one per line, case-insensitive).";
    container.appendChild(hint);

    var itemsWrap = document.createElement("div");
    container.appendChild(itemsWrap);
    buildListEditor(itemsWrap, config, "exclude", onChange, [
      { key: "value", label: "Game name to exclude" }
    ], function () { return { value: "" }; }, navOptions);

    /* exclude is a flat string array */
    if (!config.exclude || !config.exclude.length || typeof config.exclude[0] === "string") {
      var games = config.exclude || [];
      itemsWrap.replaceChildren();
      var exList = document.createElement("div");
      exList.className = "editor-items";
      itemsWrap.appendChild(exList);

      function rebuildExclude() {
        exList.replaceChildren();
        games.forEach(function (g, i) {
          var row = document.createElement("div");
          row.className = "editor-card";
          row.innerHTML =
            '<div class="editor-card-head">' +
              '<input type="text" style="flex:1;padding:4px 6px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--bg);color:var(--text);font-size:0.82rem" value="' + Hub.escapeHtml(g) + '" placeholder="Game name" />' +
              '<button class="editor-remove" type="button">' + Hub.icons.trash2 + '</button>' +
            '</div>';
          row.querySelector("input").addEventListener("input", function (e) { games[i] = e.target.value; config.exclude = games; onChange(config); });
          row.querySelector(".editor-remove").addEventListener("click", function () { games.splice(i, 1); config.exclude = games; onChange(config); rebuildExclude(); });
          exList.appendChild(row);
        });
        if (!games.length) exList.innerHTML = '<div class="empty-state">No exclusions.</div>';
      }

      rebuildExclude();

      var addBtn = document.createElement("button");
      addBtn.type = "button";
      addBtn.className = "toolbar-button toolbar-button-ghost";
      addBtn.textContent = "+ Add exclusion";
      addBtn.addEventListener("click", function () { games.push(""); config.exclude = games; onChange(config); rebuildExclude(); });
      itemsWrap.appendChild(addBtn);
    }
  },

  defaultConfig: function () {
    return { title: "Top Games", limit: 10, exclude: [] };
  }
});
