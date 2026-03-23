/* ── Pinned links widget plugin ── */

Hub.registry.register("pinned-links", {
  label: "Pinned Links",
  icon: "\u2606",

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

  renderEditor: function (container, config, onChange) {
    buildListEditor(container, config, "items", onChange, [
      { key: "title", label: "Title" },
      { key: "href", label: "URL" },
      { key: "badge", label: "Badge" },
      { key: "healthCheck", label: "Health", placeholder: "auto or URL" }
    ], function () { return { title: "", href: "https://", badge: "", healthCheck: "" }; });
  },

  defaultConfig: function () {
    return { items: [] };
  }
});

/* ── Shared editor helper (used by pinned, links, markets, feeds) ── */

function emptyNode(text) {
  var d = document.createElement("div");
  d.className = "empty-state";
  d.textContent = text;
  return d;
}

function buildListEditor(container, config, listKey, onChange, fields, emptyItem, navOptions) {
  container.replaceChildren();
  if (navOptions && navOptions.onRebuild) navOptions.onRebuild();  // notify on every rebuild
  var items = config[listKey] || [];
  var dragSrcIndex = null;

  var addBtn = document.createElement("button");
  addBtn.className = "toolbar-button toolbar-button-ghost";
  addBtn.type = "button";
  addBtn.textContent = "Add";
  addBtn.dataset.navAdd = "";                              // ← NEW
  addBtn.addEventListener("click", function () {
    config[listKey].push(emptyItem());
    onChange(config);
    buildListEditor(container, config, listKey, onChange, fields, emptyItem, navOptions);
  });
  container.appendChild(addBtn);

  if (!items.length) {
    container.appendChild(emptyNode("None yet."));
    return;
  }

  var listWrap = document.createElement("div");
  listWrap.className = "editor-items";
  listWrap.dataset.navList = "";                           // ← NEW
  container.appendChild(listWrap);

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
    card.dataset.navItem = "";                                 // ← NEW
    card.draggable = true;
    card.dataset.index = index;

    // Split fields into two rows: first two fields (title+url) and rest (badge+health)
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

    // Drag-and-drop reordering
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
      inp.dataset.navField = "";                               // ← NEW
      inp.addEventListener("input", function (e) {
        item[e.target.dataset.field] = e.target.value;
        onChange(config);
      });
    });

    listWrap.appendChild(card);
  });
}
