/* ── Link group widget plugin ── */

Hub.injectStyles("widget-links", `
  .widget-links { overflow: visible; padding: 0; }
  .link-groups { display: grid; gap: 0; }
  .group {
    border: none;
    border-radius: 0;
    overflow: hidden;
  }
  .widget-links .group { border-radius: var(--radius-lg); }
  .group-toggle {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 10px;
    border: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
    transition: background 100ms;
  }
  .group-toggle:hover { background: var(--surface-hover); }
  .group-toggle::-webkit-details-marker, .group-toggle::marker { display: none; content: ""; }
  .group-toggle h3 {
    margin: 0;
    font-family: var(--font-display);
    font-size: 0.92rem;
    font-weight: 600;
    letter-spacing: -0.01em;
  }
  .group-meta { display: inline-flex; align-items: center; gap: 6px; }
  .group-count { font-size: 0.68rem; color: var(--muted); font-weight: 600; }
  .group-chevron { color: var(--muted); font-size: 0.8rem; transition: transform 120ms; }
  .group[open] .group-chevron { transform: rotate(90deg); }
  .group-content { padding: 2px 10px 10px; }
  .links-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 2px;
  }
  .link-item {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 5px 8px;
    border-radius: var(--radius-sm);
    color: var(--text);
    text-decoration: none;
    font-size: 0.88rem;
    transition: background 80ms;
    overflow: hidden;
  }
  .link-item:hover { background: var(--surface-hover); }
  .link-item-title {
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .link-badge {
    font-size: 0.58rem;
    font-weight: 600;
    color: var(--accent-2);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    flex-shrink: 0;
  }
`);

Hub.registry.register("link-group", {
  label: "Link Group",
  icon: "list",

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

  renderEditor: function (container, config, onChange, navOptions) {
    container.replaceChildren();

    var titleLabel = document.createElement("label");
    titleLabel.className = "editor-field";
    titleLabel.innerHTML = '<span>Group title</span><input type="text" value="' + Hub.escapeHtml(config.title || "") + '" />';
    var titleInput = titleLabel.querySelector("input");
    titleInput.dataset.navHeaderField = "";
    titleInput.addEventListener("input", function (e) {
      config.title = e.target.value;
      onChange(config);
    });
    container.appendChild(titleLabel);

    var itemsWrap = document.createElement("div");
    container.appendChild(itemsWrap);
    buildListEditor(itemsWrap, config, "items", onChange, [
      { key: "title", label: "Title" },
      { key: "href", label: "URL" },
      { key: "badge", label: "Badge" },
      { key: "healthCheck", label: "Health", placeholder: "auto or URL" }
    ], function () { return { title: "", href: "https://", badge: "", healthCheck: "" }; }, navOptions);
  },

  defaultConfig: function () {
    return { title: "New Group", items: [] };
  }
});
