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

function buildListEditor(container, config, listKey, onChange, fields, emptyItem) {
  container.replaceChildren();
  var items = config[listKey] || [];

  var addBtn = document.createElement("button");
  addBtn.className = "toolbar-button toolbar-button-ghost";
  addBtn.type = "button";
  addBtn.textContent = "Add";
  addBtn.addEventListener("click", function () {
    config[listKey].push(emptyItem());
    onChange(config);
    buildListEditor(container, config, listKey, onChange, fields, emptyItem);
  });
  container.appendChild(addBtn);

  if (!items.length) {
    container.appendChild(emptyNode("None yet."));
    return;
  }

  items.forEach(function (item, index) {
    var card = document.createElement("div");
    card.className = "editor-card";
    card.draggable = true;

    var inputs = fields.map(function (f) {
      var val = f.key === "healthCheck" && item[f.key] === true ? "auto" : (item[f.key] || "");
      return '<label><span>' + Hub.escapeHtml(f.label) + '</span>' +
        '<input data-field="' + f.key + '" type="text" value="' + Hub.escapeHtml(val) + '" ' +
        (f.placeholder ? 'placeholder="' + Hub.escapeHtml(f.placeholder) + '"' : '') + ' /></label>';
    }).join("");

    card.innerHTML =
      '<div class="editor-card-head"><span class="editor-drag">Drag</span>' +
      '<button class="editor-remove" type="button">Remove</button></div>' +
      '<div class="editor-grid">' + inputs + '</div>';

    card.querySelector(".editor-remove").addEventListener("click", function () {
      config[listKey].splice(index, 1);
      onChange(config);
      buildListEditor(container, config, listKey, onChange, fields, emptyItem);
    });

    card.querySelectorAll("[data-field]").forEach(function (inp) {
      inp.addEventListener("input", function (e) {
        item[e.target.dataset.field] = e.target.value;
        onChange(config);
      });
    });

    container.appendChild(card);
  });
}
