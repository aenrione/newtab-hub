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
  .group-content { min-height: 40px; }
  .group-content .widget-header { display: none; }
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

    /* Hide the header if no title */
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
        if (err) console.error("Group child widget failure", type, err);
      }

      /* Update tab buttons */
      Array.from(tabsEl.children).forEach(function (btn, i) {
        btn.classList.toggle("is-active", i === index);
      });

      /* Render child widget */
      contentEl.replaceChildren();
      var type = tab.type;
      var plugin = type ? Hub.registry.get(type) : null;
      if (!plugin) {
        contentEl.innerHTML = '<div class="empty-state">Unknown widget type: ' + Hub.escapeHtml(type || "(none)") + '</div>';
        return;
      }

      var childConfig = Object.assign({}, tab.config || {});
      /* Give the child a stable ID for credential storage */
      if (!childConfig._id) childConfig._id = (config._id || "group") + "-tab" + index;

      var childState = state || {};
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
      btn.textContent = tab.label || ("Tab " + (i + 1));
      btn.addEventListener("click", function () { activateTab(i); });
      tabsEl.appendChild(btn);
    });

    activateTab(0);
  },

  load: function () {
    /* Child widgets manage their own loading inside render() */
    return Promise.resolve();
  },

  renderEditor: function (container, config, onChange) {
    container.replaceChildren();

    var titleLabel = document.createElement("label");
    titleLabel.className = "editor-field";
    titleLabel.innerHTML = '<span>Card title (optional)</span><input type="text" value="' + Hub.escapeHtml(config.title || "") + '" placeholder="Leave blank to hide" />';
    var titleInput = titleLabel.querySelector("input");
    titleInput.dataset.navHeaderField = "";
    titleInput.addEventListener("input", function (e) { config.title = e.target.value; onChange(config); });
    container.appendChild(titleLabel);

    var hint = document.createElement("p");
    hint.className = "editor-hint";
    hint.textContent = "Each tab specifies a widget type and its label. Configure the child widget\u2019s full settings by editing its type and config JSON below.";
    container.appendChild(hint);

    var tabs = config.tabs || [];
    var tabsWrap = document.createElement("div");
    tabsWrap.className = "editor-items";
    container.appendChild(tabsWrap);

    function rebuildTabs() {
      tabsWrap.replaceChildren();
      tabs.forEach(function (tab, i) {
        var card = document.createElement("div");
        card.className = "editor-card";

        var allTypes = Hub.registry.list().map(function (p) { return p.type; }).filter(function (t) { return t !== "group"; });
        var typeOptions = allTypes.map(function (t) {
          return '<option value="' + Hub.escapeHtml(t) + '"' + (tab.type === t ? " selected" : "") + '>' + Hub.escapeHtml(t) + '</option>';
        }).join("");

        card.innerHTML =
          '<div class="editor-card-head">' +
            '<span class="editor-drag" title="Tab ' + (i + 1) + '">' + Hub.icons.gripVertical + '</span>' +
            '<span style="font-size:0.78rem;font-weight:600;color:var(--muted-strong);flex:1">Tab ' + (i + 1) + '</span>' +
            '<button class="editor-remove" type="button" title="Remove tab">' + Hub.icons.trash2 + '</button>' +
          '</div>';

        var labelRow = document.createElement("label");
        labelRow.className = "editor-field";
        labelRow.style.cssText = "margin:4px 8px;";
        labelRow.innerHTML = '<span>Label</span><input type="text" value="' + Hub.escapeHtml(tab.label || "") + '" placeholder="Tab label" />';
        labelRow.querySelector("input").addEventListener("input", function (e) { tab.label = e.target.value; config.tabs = tabs; onChange(config); });
        card.appendChild(labelRow);

        var typeRow = document.createElement("label");
        typeRow.className = "editor-field";
        typeRow.style.cssText = "margin:4px 8px 8px;";
        typeRow.innerHTML = '<span>Widget type</span><select>' + typeOptions + '</select>';
        typeRow.querySelector("select").addEventListener("change", function (e) {
          tab.type = e.target.value;
          var plugin = Hub.registry.get(tab.type);
          if (plugin && plugin.defaultConfig) tab.config = plugin.defaultConfig();
          config.tabs = tabs;
          onChange(config);
        });
        card.appendChild(typeRow);

        card.querySelector(".editor-remove").addEventListener("click", function () {
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
      addBtn.addEventListener("click", function () {
        var firstType = Hub.registry.list().find(function (p) { return p.type !== "group"; });
        var newTab = {
          label: "Tab " + (tabs.length + 1),
          type: firstType ? firstType.type : "",
          config: firstType && firstType.defaultConfig ? firstType.defaultConfig() : {}
        };
        tabs.push(newTab);
        config.tabs = tabs;
        onChange(config);
        rebuildTabs();
      });
      tabsWrap.appendChild(addBtn);
    }

    rebuildTabs();
  },

  defaultConfig: function () {
    return { title: "", tabs: [] };
  }
});
