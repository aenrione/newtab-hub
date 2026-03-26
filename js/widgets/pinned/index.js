/* ── Pinned links widget plugin ── */

Hub.injectStyles("widget-pinned", `
  .widget-pinned { border: none; padding: 4px 0; }
  .pinned-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
  .pinned-item {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 6px 12px 6px 8px;
    border-radius: var(--radius-md);
    color: var(--text);
    text-decoration: none;
    font-size: 0.9rem;
    transition: background 100ms;
    white-space: nowrap;
  }
  .pinned-item:hover { background: var(--surface-hover); }
  .pinned-title { font-weight: 500; }
  .pinned-index {
    font-family: var(--font-display);
    font-size: 0.62rem;
    color: var(--muted);
    opacity: 0.6;
    margin-left: 2px;
  }
  .pinned-badge {
    font-size: 0.62rem;
    font-weight: 600;
    color: var(--accent-2);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin-left: 2px;
  }
`);

Hub.registry.register("pinned-links", {
  label: "Pinned Links",
  icon: "star",

  render: function (container, config, state) {
    var items = config.items || [];
    var frag = document.createDocumentFragment();
    state.pinned = state.pinned || [];

    items.forEach(function (item, i) {
      var healthKey = Hub.healthKey("pinned", item);
      var a = Hub.createLink("pinned-item", item.href, item.title);
      a.dataset.searchText = item.title + " " + Hub.formatHost(item.href);
      a.title = Hub.formatHost(item.href);
      var dot = Hub.healthDot(item, healthKey, state);
      var badge = item.badge ? '<span class="pinned-badge">' + Hub.escapeHtml(item.badge) + '</span>' : '';
      a.innerHTML =
        Hub.iconMarkup(item.href, item.title, true) +
        '<span class="pinned-title">' + Hub.escapeHtml(item.title) + '</span>' +
        dot + badge +
        '<span class="pinned-index">' + (i + 1) + '</span>';
      frag.appendChild(a);
      state.pinned.push(item);
      state.links.push({ title: item.title, href: item.href, type: "Pinned" });
    });

    container.innerHTML = "";
    var grid = document.createElement("div");
    grid.className = "pinned-grid";
    grid.appendChild(frag.childNodes.length ? frag : emptyNode("No pinned links."));
    container.appendChild(grid);
  },

  renderEditor: function (container, config, onChange, navOptions) {
    buildListEditor(container, config, "items", onChange, [
      { key: "title", label: "Title" },
      { key: "href", label: "URL" },
      { key: "badge", label: "Badge" },
      { key: "healthCheck", label: "Health", placeholder: "auto or URL" }
    ], function () { return { title: "", href: "https://", badge: "", healthCheck: "" }; }, navOptions);
  },

  defaultConfig: function () {
    return { items: [] };
  }
});

/* ── Shared editor helpers (used by pinned, links, markets, feeds) ── */

function emptyNode(text) {
  var d = document.createElement("div");
  d.className = "empty-state";
  d.textContent = text;
  return d;
}

function buildListEditor(container, config, listKey, onChange, fields, emptyItem, navOptions) {
  container.replaceChildren();
  var items = config[listKey] || [];
  var dragSrcIndex = null;

  var addBtn = document.createElement("button");
  addBtn.className = "toolbar-button toolbar-button-ghost";
  addBtn.type = "button";
  addBtn.textContent = "+ Add";
  addBtn.dataset.navAdd = "";
  addBtn.addEventListener("click", function () {
    config[listKey].push(emptyItem());
    onChange(config);
    buildListEditor(container, config, listKey, onChange, fields, emptyItem, navOptions);
  });

  var listWrap = document.createElement("div");
  listWrap.className = "editor-items";
  container.appendChild(listWrap);

  if (!items.length) {
    listWrap.appendChild(emptyNode("None yet."));
    container.appendChild(addBtn);
    if (navOptions && navOptions.onRebuild) navOptions.onRebuild();
    return;
  }

  listWrap.addEventListener("navreorder", function (e) {
    var from = e.detail.fromIndex;
    var to = e.detail.toIndex;
    var moved = config[listKey].splice(from, 1)[0];
    config[listKey].splice(to, 0, moved);
    onChange(config);
    buildListEditor(container, config, listKey, onChange, fields, emptyItem, navOptions);
  });

  items.forEach(function (item, index) {
    var card = document.createElement("div");
    card.className = "editor-card";
    card.draggable = true;
    card.dataset.index = index;

    var row1Fields = fields.slice(0, 2);
    var row2Fields = fields.slice(2);

    var row1Html = row1Fields.map(function (f) {
      var val = f.key === "healthCheck" && item[f.key] === true ? "auto" : (item[f.key] || "");
      return '<label class="' + (f.key === "href" ? "editor-field-url" : "") + '">' +
        '<span>' + Hub.escapeHtml(f.label) + '</span>' +
        '<input data-field="' + f.key + '" type="text" value="' + Hub.escapeHtml(val) + '" ' +
        (f.placeholder ? 'placeholder="' + Hub.escapeHtml(f.placeholder) + '"' : '') + ' /></label>';
    }).join("");

    var row2Html = row2Fields.length ? row2Fields.map(function (f) {
      var val = f.key === "healthCheck" && item[f.key] === true ? "auto" : (item[f.key] || "");
      return '<label><span>' + Hub.escapeHtml(f.label) + '</span>' +
        '<input data-field="' + f.key + '" type="text" value="' + Hub.escapeHtml(val) + '" ' +
        (f.placeholder ? 'placeholder="' + Hub.escapeHtml(f.placeholder) + '"' : '') + ' /></label>';
    }).join("") : "";

    card.innerHTML =
      '<div class="editor-card-head">' +
        '<span class="editor-drag" title="Drag to reorder">' + Hub.icons.gripVertical + '</span>' +
        '<div class="editor-card-spacer"></div>' +
        '<button class="editor-remove" type="button" title="Remove">' + Hub.icons.trash2 + '</button>' +
      '</div>' +
      '<div class="editor-grid editor-grid-2col">' + row1Html + '</div>' +
      (row2Html ? '<div class="editor-grid editor-grid-meta">' + row2Html + '</div>' : '');

    card.addEventListener("dragstart", function (e) {
      dragSrcIndex = index;
      card.classList.add("editor-card-dragging");
      e.dataTransfer.effectAllowed = "move";
    });
    card.addEventListener("dragend", function () {
      card.classList.remove("editor-card-dragging");
      listWrap.querySelectorAll(".editor-card").forEach(function (c) {
        c.classList.remove("editor-card-over");
      });
    });
    card.addEventListener("dragover", function (e) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      listWrap.querySelectorAll(".editor-card").forEach(function (c) {
        c.classList.remove("editor-card-over");
      });
      if (dragSrcIndex !== index) card.classList.add("editor-card-over");
    });
    card.addEventListener("drop", function (e) {
      e.preventDefault();
      if (dragSrcIndex === null || dragSrcIndex === index) return;
      var moved = config[listKey].splice(dragSrcIndex, 1)[0];
      config[listKey].splice(index, 0, moved);
      onChange(config);
      buildListEditor(container, config, listKey, onChange, fields, emptyItem, navOptions);
    });

    card.querySelector(".editor-remove").addEventListener("click", function () {
      config[listKey].splice(index, 1);
      onChange(config);
      buildListEditor(container, config, listKey, onChange, fields, emptyItem, navOptions);
    });

    card.querySelectorAll("[data-field]").forEach(function (inp) {
      inp.addEventListener("input", function (e) {
        item[e.target.dataset.field] = e.target.value;
        onChange(config);
      });
    });

    listWrap.appendChild(card);
  });
  container.appendChild(addBtn);
  if (navOptions && navOptions.onRebuild) navOptions.onRebuild();
}
