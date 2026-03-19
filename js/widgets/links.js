/* ── Link group widget plugin ── */

Hub.registry.register("link-group", {
  label: "Link Group",
  icon: "\u2630",

  render: function (container, config, state) {
    var title = config.title || "Links";
    var items = config.items || [];
    var collapsed = state._collapsedGroups || new Set();

    var wrapper = document.createElement("details");
    wrapper.className = "group";
    wrapper.open = !collapsed.has(title);
    wrapper.dataset.groupTitle = title;

    var rows = items.map(function (item) {
      var healthKey = Hub.healthKey(title, item);
      state.links.push({ title: item.title, href: item.href, type: title });
      var dot = Hub.healthDot(item, healthKey, state);
      var badge = item.badge ? '<span class="link-badge">' + Hub.escapeHtml(item.badge) + '</span>' : '';
      return '<a class="link-item" href="' + Hub.escapeHtml(item.href) + '" target="_self" rel="noreferrer" ' +
        'data-focusable="true" data-title="' + Hub.escapeHtml(item.title) + '" ' +
        'data-search-text="' + Hub.escapeHtml(item.title + " " + title + " " + Hub.formatHost(item.href)) + '" ' +
        'title="' + Hub.escapeHtml(Hub.formatHost(item.href)) + '">' +
        Hub.iconMarkup(item.href, item.title, true) +
        '<span class="link-item-title">' + Hub.escapeHtml(item.title) + '</span>' +
        dot + badge + '</a>';
    }).join("");

    wrapper.innerHTML =
      '<summary class="group-toggle">' +
        '<h3>' + Hub.escapeHtml(title) + '</h3>' +
        '<span class="group-meta">' +
          '<span class="group-count">' + items.length + '</span>' +
          '<span class="group-chevron">&#8250;</span>' +
        '</span>' +
      '</summary>' +
      '<div class="group-content"><div class="links-grid">' + rows + '</div></div>';

    wrapper.addEventListener("toggle", function () {
      if (state._onToggleGroup) state._onToggleGroup(title, wrapper.open);
    });

    container.replaceChildren(wrapper);
  },

  renderEditor: function (container, config, onChange) {
    container.replaceChildren();

    /* Title field */
    var titleLabel = document.createElement("label");
    titleLabel.className = "editor-field";
    titleLabel.innerHTML = '<span>Group title</span><input type="text" value="' + Hub.escapeHtml(config.title || "") + '" />';
    titleLabel.querySelector("input").addEventListener("input", function (e) {
      config.title = e.target.value;
      onChange(config);
    });
    container.appendChild(titleLabel);

    /* Items */
    var itemsWrap = document.createElement("div");
    container.appendChild(itemsWrap);
    buildListEditor(itemsWrap, config, "items", onChange, [
      { key: "title", label: "Title" },
      { key: "href", label: "URL" },
      { key: "badge", label: "Badge" },
      { key: "healthCheck", label: "Health", placeholder: "auto or URL" }
    ], function () { return { title: "", href: "https://", badge: "", healthCheck: "" }; });
  },

  defaultConfig: function () {
    return { title: "New Group", items: [] };
  }
});
