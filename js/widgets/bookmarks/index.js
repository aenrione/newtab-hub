/* ── Bookmarks widget plugin ── */

Hub.injectStyles("widget-bookmarks", `
  .bookmarks-groups { display: grid; gap: 10px; }
  .bookmark-group-title {
    font-size: 0.68rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--muted);
    margin-bottom: 4px;
    padding: 0 8px;
  }
  .bookmark-items { display: grid; gap: 1px; }
  .bookmark-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 5px 8px;
    border-radius: var(--radius-sm);
    color: var(--text);
    text-decoration: none;
    font-size: 0.86rem;
    transition: background 80ms;
    overflow: hidden;
  }
  .bookmark-item:hover { background: var(--surface-hover); }
  .bookmark-item-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
  .bookmarks-editor-group {
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 8px;
    margin-bottom: 8px;
  }
  .bookmarks-editor-group-head {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }
  .bookmarks-group-title-input {
    flex: 1;
    padding: 4px 6px;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--bg);
    color: var(--text);
    font-size: 0.82rem;
  }
  .bookmarks-group-title-input:focus { outline: none; border-color: var(--accent-2); }
`);

Hub.registry.register("bookmarks", {
  label: "Bookmarks",
  icon: "bookmark",

  render: function (container, config) {
    container.innerHTML =
      '<div class="widget-header"><h2>' + Hub.escapeHtml(config.title || "Bookmarks") + '</h2></div>' +
      '<div class="bookmarks-groups"></div>';

    var groupsEl = container.querySelector(".bookmarks-groups");
    var groups = config.groups || [];

    if (!groups.length) {
      groupsEl.innerHTML = '<div class="empty-state">Add groups in the widget editor.</div>';
      return;
    }

    var frag = document.createDocumentFragment();
    groups.forEach(function (group) {
      var items = group.items || [];
      var wrap = document.createElement("div");

      if (group.title) {
        var titleEl = document.createElement("div");
        titleEl.className = "bookmark-group-title";
        titleEl.textContent = group.title;
        wrap.appendChild(titleEl);
      }

      var listEl = document.createElement("div");
      listEl.className = "bookmark-items";

      if (!items.length) {
        listEl.innerHTML = '<div class="empty-state">No items.</div>';
      } else {
        items.forEach(function (item) {
          var a = document.createElement("a");
          a.className = "bookmark-item";
          a.href = item.href || "#";
          a.target = "_self";
          a.rel = "noreferrer";
          a.dataset.focusable = "true";
          a.dataset.title = item.title || "";
          a.innerHTML =
            Hub.iconMarkup(item.href || "", item.title || "", true) +
            '<span class="bookmark-item-label">' + Hub.escapeHtml(item.title || "") + '</span>';
          listEl.appendChild(a);
        });
      }

      wrap.appendChild(listEl);
      frag.appendChild(wrap);
    });

    groupsEl.appendChild(frag);
  },

  load: async function (container, config, state, token) {
    container.querySelectorAll(".bookmark-item").forEach(function (a) {
      state.links.push({ title: a.dataset.title, href: a.href, type: "bookmark" });
    });
    Hub.cacheFavicons(state.store);
  },

  renderEditor: function (container, config, onChange, navOptions) {
    container.replaceChildren();

    var titleLabel = document.createElement("label");
    titleLabel.className = "editor-field";
    titleLabel.innerHTML = '<span>Widget title</span><input type="text" value="' + Hub.escapeHtml(config.title || "Bookmarks") + '" />';
    var titleInput = titleLabel.querySelector("input");
    titleInput.dataset.navHeaderField = "";
    titleInput.addEventListener("input", function (e) { config.title = e.target.value; onChange(config); });
    container.appendChild(titleLabel);

    var groups = config.groups || [];
    var groupsWrap = document.createElement("div");
    container.appendChild(groupsWrap);

    function rebuildGroups() {
      groupsWrap.replaceChildren();

      groups.forEach(function (group, gi) {
        var groupDiv = document.createElement("div");
        groupDiv.className = "bookmarks-editor-group";

        var head = document.createElement("div");
        head.className = "bookmarks-editor-group-head";

        var gtInput = document.createElement("input");
        gtInput.type = "text";
        gtInput.className = "bookmarks-group-title-input";
        gtInput.placeholder = "Group title (optional)";
        gtInput.value = group.title || "";
        gtInput.addEventListener("input", function (e) {
          group.title = e.target.value;
          config.groups = groups;
          onChange(config);
        });

        var removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.className = "editor-remove";
        removeBtn.title = "Remove group";
        removeBtn.innerHTML = Hub.icons.trash2;
        removeBtn.addEventListener("click", function () {
          groups.splice(gi, 1);
          config.groups = groups;
          onChange(config);
          rebuildGroups();
        });

        head.appendChild(gtInput);
        head.appendChild(removeBtn);
        groupDiv.appendChild(head);

        var itemsWrap = document.createElement("div");
        groupDiv.appendChild(itemsWrap);
        buildListEditor(itemsWrap, group, "items", function () {
          config.groups = groups;
          onChange(config);
        }, [
          { key: "title", label: "Title" },
          { key: "href", label: "URL" }
        ], function () { return { title: "", href: "https://" }; }, navOptions);

        groupsWrap.appendChild(groupDiv);
      });

      var addGroupBtn = document.createElement("button");
      addGroupBtn.type = "button";
      addGroupBtn.className = "toolbar-button toolbar-button-ghost";
      addGroupBtn.textContent = "+ Add group";
      addGroupBtn.addEventListener("click", function () {
        groups.push({ title: "", items: [] });
        config.groups = groups;
        onChange(config);
        rebuildGroups();
      });
      groupsWrap.appendChild(addGroupBtn);
    }

    rebuildGroups();
  },

  defaultConfig: function () {
    return {
      title: "Bookmarks",
      groups: [
        {
          title: "Dev",
          items: [
            { title: "GitHub", href: "https://github.com" },
            { title: "MDN", href: "https://developer.mozilla.org" }
          ]
        }
      ]
    };
  }
});
