/* ── Group (tabbed container) widget plugin ──
   Renders multiple child widgets in a single card with a tab bar.
── */

Hub.injectStyles("widget-group", `
  .group-tabs {
    display: flex;
    gap: 2px;
    margin-bottom: 8px;
    border-bottom: 1px solid var(--border);
    padding-bottom: 0;
  }
  .group-tab {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
    padding: 4px 10px 6px;
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--muted);
    cursor: pointer;
    border-radius: var(--radius-sm) var(--radius-sm) 0 0;
    transition: color 80ms;
    white-space: nowrap;
  }
  .group-tab:hover { color: var(--text); }
  .group-tab.is-active { color: var(--text); border-bottom-color: var(--accent-2); }
  .group-tab.focus-ring { outline: 2px solid var(--accent-2); outline-offset: 2px; }
  .group-content { min-height: 40px; }
  .group-content .widget-header { display: none; }

  /* ── Group editor: type picker ── */
  .group-type-picker { position: relative; }
  .group-type-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 6px 10px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text);
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
    text-align: left;
    transition: border-color 120ms;
  }
  .group-type-btn:hover, .group-type-btn:focus-visible { border-color: var(--accent-2); outline: none; }
  .group-type-btn svg { flex-shrink: 0; color: var(--muted-strong); }
  .group-type-btn > span { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .group-type-btn .group-type-chevron { color: var(--muted); flex-shrink: 0; }
  .group-type-dropdown {
    display: none;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 8px;
    margin-top: 4px;
  }
  .group-type-dropdown.is-open { display: block; }
  .group-type-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 3px;
    max-height: 200px;
    overflow-y: auto;
    margin-top: 6px;
    padding-right: 2px;
  }
  .group-type-grid .add-widget-card { padding: 6px 8px; font-size: 0.82rem; }
  .group-type-grid .add-widget-card.is-selected { border-color: var(--accent-2); }

  /* ── Group editor: collapsible child config ── */
  .group-child-config {
    margin: 8px 0 0;
    border-top: 1px solid var(--border);
  }
  .group-child-config-toggle {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 8px;
    cursor: pointer;
    list-style: none;
    font-size: 0.72rem;
    font-weight: 700;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    user-select: none;
  }
  .group-child-config-toggle::-webkit-details-marker { display: none; }
  .group-child-config-toggle::marker { display: none; content: ""; }
  .group-child-config-toggle svg { flex-shrink: 0; transform: rotate(-90deg); transition: transform 120ms; }
  .group-child-config-toggle:hover { color: var(--text); }
  .group-child-config-toggle:focus-visible { outline: 2px solid var(--accent-2); outline-offset: -2px; border-radius: 2px; }
  .group-child-config[open] > .group-child-config-toggle svg { transform: rotate(0deg); }
  .group-child-config-body { padding: 0 0 4px; }
`);

Hub.registry.register("group", {
  label: "Group (Tabs)",
  icon: "list",

  render: function (container, config, state) {
    var tabs = config.tabs || [];

    if (!tabs.length) {
      container.innerHTML =
        '<div class="widget-header"><h2>' + Hub.escapeHtml(config.title || "Group") + '</h2></div>' +
        '<div class="empty-state">Add tabs in the widget editor.</div>';
      return;
    }

    container.innerHTML =
      '<div class="widget-header"><h2>' + Hub.escapeHtml(config.title || "") + '</h2></div>' +
      '<div class="group-tabs"></div>' +
      '<div class="group-content"></div>';

    if (!config.title) container.querySelector(".widget-header").style.display = "none";

    var tabsEl = container.querySelector(".group-tabs");
    var contentEl = container.querySelector(".group-content");
    var activeToken = 0;

    function activateTab(index) {
      activeToken++;
      var localToken = activeToken;
      var tab = tabs[index];
      if (!tab) return;

      function showChildError(message, err) {
        contentEl.innerHTML = '<div class="empty-state">' + Hub.escapeHtml(message) + '</div>';
        if (err) console.error("Group child widget failure", tab.type, err);
      }

      Array.from(tabsEl.children).forEach(function (btn, i) {
        btn.classList.toggle("is-active", i === index);
      });

      contentEl.replaceChildren();
      var type = tab.type;
      var plugin = type ? Hub.registry.get(type) : null;
      if (!plugin) {
        contentEl.innerHTML = '<div class="empty-state">Unknown widget type: ' + Hub.escapeHtml(type || "(none)") + '</div>';
        return;
      }

      var childConfig = Object.assign({}, tab.config || {});
      if (!childConfig._id) childConfig._id = (config._id || "group") + "-tab" + index;

      var childState = state || {};
      childState.renderToken = localToken;
      try {
        plugin.render(contentEl, childConfig, childState);
      } catch (err) {
        showChildError("Failed to render tab widget.", err);
        return;
      }

      if (plugin.load) {
        plugin.load(contentEl, childConfig, childState, localToken).catch(function (err) {
          showChildError("Failed to load tab widget data.", err);
        });
      }
    }

    tabs.forEach(function (tab, i) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "group-tab" + (i === 0 ? " is-active" : "");
      btn.setAttribute("data-focusable", "true");
      /* Use a child span so chord-index appended by chording system sits cleanly alongside label */
      btn.innerHTML = '<span class="group-tab-label">' + Hub.escapeHtml(tab.label || ("Tab " + (i + 1))) + '</span>';
      btn.addEventListener("click", function () { activateTab(i); });
      tabsEl.appendChild(btn);
    });

    activateTab(0);
  },

  load: function () {
    return Promise.resolve();
  },

  renderEditor: function (container, config, onChange, options) {
    container.replaceChildren();

    var titleLabel = document.createElement("label");
    titleLabel.className = "editor-field";
    titleLabel.innerHTML = '<span>Card title (optional)</span><input type="text" value="' + Hub.escapeHtml(config.title || "") + '" placeholder="Leave blank to hide" />';
    var titleInput = titleLabel.querySelector("input");
    titleInput.addEventListener("input", function (e) { config.title = e.target.value; onChange(config); });
    container.appendChild(titleLabel);

    var tabs = config.tabs || [];

    var tabsWrap = document.createElement("div");
    tabsWrap.className = "editor-items";
    container.appendChild(tabsWrap);

    var allTypes = Hub.registry.list()
      .filter(function (p) { return p.type !== "group"; });

    /* ── Inline searchable type picker ── */
    function createTypePicker(currentType, onSelect) {
      var pickerEl = document.createElement("div");
      pickerEl.className = "group-type-picker";

      function iconHtml(icon) {
        return Hub.pickerIconMarkup(icon);
      }

      function updateBtn(type) {
        var p = type ? Hub.registry.get(type) : null;
        var icon = (p && p.icon) ? p.icon : "plus";
        var label = (p && p.label) ? p.label : (type || "Select type\u2026");
        btn.innerHTML =
          iconHtml(icon) +
          '<span>' + Hub.escapeHtml(label) + '</span>' +
          '<span class="group-type-chevron">' + Hub.icons.chevronDown + '</span>';
      }

      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "group-type-btn";
      btn.dataset.customPicker = "";
      updateBtn(currentType);
      pickerEl.appendChild(btn);

      var dropdown = document.createElement("div");
      dropdown.className = "group-type-dropdown";

      var searchWrap = document.createElement("div");
      searchWrap.className = "add-widget-search-wrap";
      searchWrap.innerHTML = Hub.icons.search || "";
      var searchInput = document.createElement("input");
      searchInput.type = "text";
      searchInput.className = "add-widget-search";
      searchInput.placeholder = "Search widget types\u2026";
      searchWrap.appendChild(searchInput);
      dropdown.appendChild(searchWrap);

      var grid = document.createElement("div");
      grid.className = "add-widget-grid group-type-grid";
      dropdown.appendChild(grid);
      pickerEl.appendChild(dropdown);

      var focusedIdx = -1;
      var isOpen = false;

      function getCards() {
        return Array.from(grid.querySelectorAll(".add-widget-card"));
      }

      function focusCard(idx) {
        var cards = getCards();
        cards.forEach(function (c) { c.classList.remove("add-widget-card-focus"); });
        if (idx < 0 || idx >= cards.length) { focusedIdx = -1; return; }
        focusedIdx = idx;
        cards[idx].classList.add("add-widget-card-focus");
        cards[idx].scrollIntoView({ block: "nearest" });
      }

      function renderCards(filter) {
        grid.replaceChildren();
        focusedIdx = -1;
        var filt = (filter || "").toLowerCase();
        var filtered = allTypes.filter(function (p) {
          if (!filt) return true;
          return p.label.toLowerCase().includes(filt) || p.type.toLowerCase().includes(filt);
        });
        filtered.forEach(function (p, idx) {
          var card = document.createElement("button");
          card.type = "button";
          card.className = "add-widget-card" + (p.type === currentType ? " is-selected" : "");
          var icon = p.icon || "plus";
          card.innerHTML = iconHtml(icon) + '<span>' + Hub.escapeHtml(p.label) + '</span>';
          card.addEventListener("click", function () {
            currentType = p.type;
            updateBtn(p.type);
            onSelect(p.type);
            close();
            btn.dispatchEvent(new CustomEvent("custom-select-picked", { bubbles: true }));
          });
          if (p.type === currentType) focusedIdx = idx;
          grid.appendChild(card);
        });
        /* Highlight the current selection */
        if (focusedIdx >= 0) {
          var cards = getCards();
          if (cards[focusedIdx]) cards[focusedIdx].classList.add("add-widget-card-focus");
        }
      }

      function open() {
        isOpen = true;
        dropdown.classList.add("is-open");
        searchInput.value = "";
        renderCards("");
        searchInput.focus();
        if (focusedIdx >= 0) {
          var cards = getCards();
          if (cards[focusedIdx]) cards[focusedIdx].scrollIntoView({ block: "nearest" });
        }
      }

      function close() {
        isOpen = false;
        dropdown.classList.remove("is-open");
        btn.focus();
      }

      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        if (isOpen) close(); else open();
      });

      searchInput.addEventListener("input", function () {
        renderCards(searchInput.value);
      });

      searchInput.addEventListener("keydown", function (e) {
        var cards = getCards();
        if (e.key === "ArrowDown") {
          e.preventDefault();
          focusCard(focusedIdx < 0 ? 0 : Math.min(focusedIdx + 1, cards.length - 1));
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          if (focusedIdx <= 0) {
            cards.forEach(function (c) { c.classList.remove("add-widget-card-focus"); });
            focusedIdx = -1;
          } else {
            focusCard(focusedIdx - 1);
          }
          return;
        }
        if (e.key === "Enter") {
          e.preventDefault();
          if (focusedIdx >= 0 && cards[focusedIdx]) cards[focusedIdx].click();
          return;
        }
        if (e.key === "Escape") {
          e.preventDefault();
          close();
          return;
        }
      });

      /* Close when clicking outside the picker */
      var onDocClick = function (e) {
        if (!pickerEl.contains(e.target) && isOpen) close();
        if (!document.body.contains(pickerEl)) document.removeEventListener("click", onDocClick);
      };
      document.addEventListener("click", onDocClick);

      return pickerEl;
    }

    /* ── Build tab cards ── */
    function rebuildTabs() {
      tabsWrap.replaceChildren();

      tabs.forEach(function (tab, i) {
        var card = document.createElement("div");
        card.className = "editor-card";

        /* Card header */
        var head = document.createElement("div");
        head.className = "editor-card-head";
        head.innerHTML =
          '<span class="editor-drag" title="Tab ' + (i + 1) + '">' + Hub.icons.gripVertical + '</span>' +
          '<span style="font-size:0.78rem;font-weight:600;color:var(--muted-strong);flex:1">Tab ' + (i + 1) + '</span>' +
          '<button class="editor-remove" type="button" title="Remove tab">' + Hub.icons.trash2 + '</button>';
        card.appendChild(head);

        /* Label field */
        var labelRow = document.createElement("label");
        labelRow.className = "editor-field";
        labelRow.style.cssText = "margin:4px 8px;";
        var labelSpan = document.createElement("span");
        labelSpan.textContent = "Label";
        var labelInput = document.createElement("input");
        labelInput.type = "text";
        labelInput.value = tab.label || "";
        labelInput.placeholder = "Tab label";
        labelInput.addEventListener("input", function (e) {
          tab.label = e.target.value;
          config.tabs = tabs;
          onChange(config);
        });
        labelRow.appendChild(labelSpan);
        labelRow.appendChild(labelInput);
        card.appendChild(labelRow);

        /* Widget type picker */
        var typeRow = document.createElement("div");
        typeRow.className = "editor-field";
        typeRow.style.cssText = "margin:4px 8px 6px;";
        var typeSpan = document.createElement("span");
        typeSpan.textContent = "Widget type";
        typeRow.appendChild(typeSpan);

        var picker = createTypePicker(tab.type, function (newType) {
          if (newType === tab.type) return;
          tab.type = newType;
          var newPlugin = Hub.registry.get(newType);
          tab.config = newPlugin && newPlugin.defaultConfig ? newPlugin.defaultConfig() : {};
          config.tabs = tabs;
          onChange(config);
          rebuildTabs();
        });
        typeRow.appendChild(picker);
        card.appendChild(typeRow);

        /* Collapsible inline child widget config */
        var plugin = tab.type ? Hub.registry.get(tab.type) : null;
        if (plugin && plugin.renderEditor) {
          if (!tab.config) tab.config = plugin.defaultConfig ? plugin.defaultConfig() : {};

          var details = document.createElement("details");
          details.className = "group-child-config";

          var summary = document.createElement("summary");
          summary.className = "group-child-config-toggle";
          summary.dataset.navToggle = "";
          summary.innerHTML = Hub.icons.chevronDown + '<span>' + Hub.escapeHtml(plugin.label) + ' settings</span>';
          details.appendChild(summary);

          details.addEventListener("toggle", function () {
            if (options && options.onRebuild) options.onRebuild();
          });

          var configBody = document.createElement("div");
          configBody.className = "group-child-config-body";

          plugin.renderEditor(configBody, tab.config, function (newChildConfig) {
            tab.config = newChildConfig;
            config.tabs = tabs;
            onChange(config);
          });

          /* Render credentials section using the same ID that render() assigns */
          var childId = (config._id || "group") + "-tab" + i;
          if (Hub.grid && Hub.grid.renderCredentialSection) {
            Hub.grid.renderCredentialSection(configBody, plugin, childId, null, function () {
              if (options && options.onRebuild) options.onRebuild();
            });
          }

          details.appendChild(configBody);
          card.appendChild(details);
        } else if (tab.type) {
          var noConfig = document.createElement("p");
          noConfig.className = "editor-hint";
          noConfig.style.cssText = "margin:4px 8px 6px;";
          noConfig.textContent = "This widget type has no configurable settings.";
          card.appendChild(noConfig);
        }

        /* Remove button */
        head.querySelector(".editor-remove").addEventListener("click", function () {
          tabs.splice(i, 1);
          config.tabs = tabs;
          onChange(config);
          rebuildTabs();
        });

        tabsWrap.appendChild(card);
      });

      if (!tabs.length) {
        var empty = document.createElement("div");
        empty.className = "empty-state";
        empty.textContent = "No tabs yet.";
        tabsWrap.appendChild(empty);
      }

      var addBtn = document.createElement("button");
      addBtn.type = "button";
      addBtn.className = "toolbar-button toolbar-button-ghost";
      addBtn.textContent = "+ Add tab";
      addBtn.dataset.navAdd = "";
      addBtn.addEventListener("click", function () {
        var firstPlugin = allTypes[0];
        var newTab = {
          label: "Tab " + (tabs.length + 1),
          type: firstPlugin ? firstPlugin.type : "",
          config: firstPlugin && firstPlugin.defaultConfig ? firstPlugin.defaultConfig() : {}
        };
        tabs.push(newTab);
        config.tabs = tabs;
        onChange(config);
        rebuildTabs();
      });
      tabsWrap.appendChild(addBtn);

      if (options && options.onRebuild) options.onRebuild();
    }

    rebuildTabs();
  },

  defaultConfig: function () {
    return { title: "", tabs: [] };
  }
});
