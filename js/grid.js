/* ── Grid layout engine ── */

window.Hub = window.Hub || {};

Hub.grid = (function () {
  var COLS = 12;
  var editing = false;
  var dragWidget = null;
  var resizeWidget = null;
  var onSaveCallback = null;
  var editBar = null;
  var editClone = null; /* deep clone of widgets during edit mode */

  function setEditClone(widgets) {
    editClone = widgets.map(function (w) {
      return Object.assign({}, w, { config: JSON.parse(JSON.stringify(w.config || {})) });
    });
  }
  function getEditClone() { return editClone; }

  function applyLayout(gridEl, layout, widgetEls) {
    var sorted = layout.slice().sort(function (a, b) {
      return a.row !== b.row ? a.row - b.row : a.col - b.col;
    });

    gridEl.style.display = "grid";
    gridEl.style.gridTemplateColumns = "repeat(" + COLS + ", 1fr)";
    gridEl.style.gap = "10px";
    gridEl.style.gridAutoFlow = "dense";
    gridEl.style.gridAutoRows = "minmax(60px, auto)";

    var frag = document.createDocumentFragment();
    sorted.forEach(function (item) {
      var el = widgetEls[item.widget];
      if (!el) return;

      el.style.gridColumn = item.col + " / span " + item.width;
      el.style.gridRow = item.row + " / span " + item.height;
      el.dataset.gridWidget = item.widget;
      el.dataset.gridCol = item.col;
      el.dataset.gridRow = item.row;
      el.dataset.gridWidth = item.width;
      el.dataset.gridHeight = item.height;

      frag.appendChild(el);
    });

    gridEl.replaceChildren(frag);
  }

  function showEditBar(onSave, onCancel, gridEl, onAdded) {
    if (editBar) editBar.remove();

    editBar = document.createElement("div");
    editBar.className = "grid-edit-bar";
    editBar.innerHTML =
      '<span class="grid-edit-label">Editing layout</span>' +
      '<div class="grid-edit-actions">' +
        '<button class="toolbar-button toolbar-button-ghost edit-bar-add-btn grid-edit-add" type="button">' +
          Hub.icons.plus + ' Add widget</button>' +
        '<button class="toolbar-button toolbar-button-ghost grid-edit-cancel" type="button">Cancel</button>' +
        '<button class="toolbar-button grid-edit-save" type="button">' +
          Hub.icons.save + ' Save layout</button>' +
      '</div>';

    editBar.querySelector(".grid-edit-save").addEventListener("click", function () {
      if (onSave) onSave();
    });
    editBar.querySelector(".grid-edit-cancel").addEventListener("click", function () {
      if (onCancel) onCancel();
    });
    editBar.querySelector(".grid-edit-add").addEventListener("click", function () {
      openAddWidgetModal(gridEl, onAdded);
    });

    /* Insert at top of shell, before grid */
    var shell = document.querySelector(".shell");
    var grid = document.getElementById("dashboard-grid");
    shell.insertBefore(editBar, grid);
  }

  function hideEditBar() {
    if (editBar) { editBar.remove(); editBar = null; }
  }

  function removeWidget(widgetId, gridEl) {
    if (!editClone) return;
    editClone = editClone.filter(function (w) { return w.id !== widgetId; });
    var el = gridEl.querySelector('[data-widget-id="' + widgetId + '"]');
    if (el) el.remove();
  }

  function openConfigModal(widgetId, onSave) {
    var w = editClone.find(function (ww) { return ww.id === widgetId; });
    if (!w) return;
    var plugin = Hub.registry.get(w.type);
    if (!plugin || !plugin.renderEditor) return;

    var overlay = document.createElement("div");
    overlay.className = "modal-overlay";

    var panel = document.createElement("div");
    panel.className = "modal-panel";

    var header = document.createElement("div");
    header.className = "modal-header";
    header.innerHTML = '<h2>Configure: ' + Hub.escapeHtml(plugin.label) + '</h2>';
    var closeBtn = document.createElement("button");
    closeBtn.className = "modal-close";
    closeBtn.innerHTML = Hub.icons.x;
    closeBtn.type = "button";
    header.appendChild(closeBtn);

    var body = document.createElement("div");
    body.className = "config-modal-body";
    plugin.renderEditor(body, w.config || {}, function (newConfig) {
      w.config = newConfig;
    });

    var actions = document.createElement("div");
    actions.className = "config-modal-actions";
    var doneBtn = document.createElement("button");
    doneBtn.className = "toolbar-button";
    doneBtn.type = "button";
    doneBtn.textContent = "Done";
    actions.appendChild(doneBtn);

    panel.appendChild(header);
    panel.appendChild(body);
    panel.appendChild(actions);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    function close() {
      overlay.remove();
      if (onSave) onSave();
    }
    closeBtn.addEventListener("click", close);
    doneBtn.addEventListener("click", close);
    overlay.addEventListener("click", function (e) { if (e.target === overlay) close(); });
    document.addEventListener("keydown", function onEsc(e) {
      if (e.key === "Escape") { close(); document.removeEventListener("keydown", onEsc); }
    });
  }

  function openAddWidgetModal(gridEl, onAdded) {
    var addable = Hub.registry.addable();

    var overlay = document.createElement("div");
    overlay.className = "modal-overlay";

    var panel = document.createElement("div");
    panel.className = "modal-panel";

    var header = document.createElement("div");
    header.className = "modal-header";
    header.innerHTML = "<h2>Add widget</h2>";
    var closeBtn = document.createElement("button");
    closeBtn.className = "modal-close";
    closeBtn.innerHTML = Hub.icons.x;
    closeBtn.type = "button";
    header.appendChild(closeBtn);

    /* Search */
    var searchWrap = document.createElement("div");
    searchWrap.className = "add-widget-search-wrap";
    searchWrap.innerHTML = Hub.icons.search;
    var searchInput = document.createElement("input");
    searchInput.className = "add-widget-search";
    searchInput.type = "text";
    searchInput.placeholder = "Search widgets...";
    searchWrap.appendChild(searchInput);

    /* Card grid */
    var grid = document.createElement("div");
    grid.className = "add-widget-grid";

    function renderCards(filter) {
      grid.replaceChildren();
      var filt = (filter || "").toLowerCase();
      addable.forEach(function (p) {
        if (filt && !p.label.toLowerCase().includes(filt)) return;
        var card = document.createElement("button");
        card.className = "add-widget-card";
        card.type = "button";
        var iconKey = Hub.iconForType[p.type] || "plus";
        card.innerHTML = (Hub.icons[iconKey] || "") + "<span>" + Hub.escapeHtml(p.label) + "</span>";
        card.addEventListener("click", function () {
          var maxRow = editClone.reduce(function (m, w) { return Math.max(m, (w.row || 1) + (w.height || 1)); }, 1);
          var newWidget = {
            id: Hub.uid(),
            type: p.type,
            col: 1,
            row: maxRow,
            width: 4,
            height: 1,
            config: p.defaultConfig()
          };
          editClone.push(newWidget);
          close();
          if (onAdded) onAdded(newWidget);
        });
        grid.appendChild(card);
      });
    }

    searchInput.addEventListener("input", function () { renderCards(searchInput.value); });
    renderCards("");

    panel.appendChild(header);
    panel.appendChild(searchWrap);
    panel.appendChild(grid);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    searchInput.focus();

    function close() { overlay.remove(); }
    closeBtn.addEventListener("click", close);
    overlay.addEventListener("click", function (e) { if (e.target === overlay) close(); });
    document.addEventListener("keydown", function onEsc(e) {
      if (e.key === "Escape") { close(); document.removeEventListener("keydown", onEsc); }
    });
  }

  function enterEditMode(gridEl, layout, onSave, onCancel, onAdded, onConfigSave) {
    editing = true;
    gridEl.classList.add("grid-editing");

    showEditBar(onSave, onCancel, gridEl, onAdded);

    gridEl.querySelectorAll(".widget").forEach(function (w) {
      if (w.dataset.widgetType === "search") return;

      w.classList.add("widget-editable");

      /* Edit controls bar */
      var controls = document.createElement("div");
      controls.className = "widget-edit-controls";

      var dragBtn = document.createElement("button");
      dragBtn.className = "widget-edit-btn is-drag";
      dragBtn.innerHTML = Hub.icons.gripVertical;
      dragBtn.title = "Drag to move";

      var rightGroup = document.createElement("div");
      rightGroup.className = "widget-edit-right";

      var gearBtn = document.createElement("button");
      gearBtn.className = "widget-edit-btn is-gear";
      gearBtn.innerHTML = Hub.icons.settings;
      gearBtn.title = "Configure";

      var trashBtn = document.createElement("button");
      trashBtn.className = "widget-edit-btn is-trash";
      trashBtn.innerHTML = Hub.icons.trash2;
      trashBtn.title = "Remove";

      rightGroup.appendChild(gearBtn);
      rightGroup.appendChild(trashBtn);
      controls.appendChild(dragBtn);
      controls.appendChild(rightGroup);
      w.prepend(controls);

      var resizeHandle = document.createElement("div");
      resizeHandle.className = "widget-resize-handle";
      resizeHandle.innerHTML = Hub.icons.arrowDownRight;
      resizeHandle.title = "Drag to resize";
      w.appendChild(resizeHandle);

      dragBtn.addEventListener("mousedown", function (e) {
        e.preventDefault();
        dragWidget = {
          el: w,
          startX: e.clientX,
          startY: e.clientY,
          origCol: parseInt(w.dataset.gridCol),
          origRow: parseInt(w.dataset.gridRow)
        };
      });

      resizeHandle.addEventListener("mousedown", function (e) {
        e.preventDefault();
        e.stopPropagation();
        resizeWidget = {
          el: w,
          startX: e.clientX,
          startY: e.clientY,
          origWidth: parseInt(w.dataset.gridWidth),
          origHeight: parseInt(w.dataset.gridHeight)
        };
      });

      gearBtn.addEventListener("click", function () { openConfigModal(w.dataset.widgetId, onConfigSave); });

      trashBtn.addEventListener("click", function () { removeWidget(w.dataset.widgetId, gridEl); });
    });

    function onMouseMove(e) {
      var gridRect = gridEl.getBoundingClientRect();
      var cellW = gridRect.width / COLS;
      var rowH = 100;

      if (dragWidget) {
        var dx = e.clientX - dragWidget.startX;
        var dy = e.clientY - dragWidget.startY;
        var colDelta = Math.round(dx / cellW);
        var rowDelta = Math.round(dy / rowH);
        var w = parseInt(dragWidget.el.dataset.gridWidth);
        var newCol = Math.max(1, Math.min(COLS - w + 1, dragWidget.origCol + colDelta));
        var newRow = Math.max(1, dragWidget.origRow + rowDelta);

        dragWidget.el.style.gridColumn = newCol + " / span " + w;
        dragWidget.el.style.gridRow = newRow + " / span " + dragWidget.el.dataset.gridHeight;
        dragWidget.el.dataset.gridCol = newCol;
        dragWidget.el.dataset.gridRow = newRow;
      }

      if (resizeWidget) {
        var rdx = e.clientX - resizeWidget.startX;
        var rdy = e.clientY - resizeWidget.startY;
        var col = parseInt(resizeWidget.el.dataset.gridCol);
        var newW = Math.max(1, Math.min(COLS - col + 1, resizeWidget.origWidth + Math.round(rdx / cellW)));
        var newH = Math.max(1, resizeWidget.origHeight + Math.round(rdy / rowH));

        resizeWidget.el.style.gridColumn = col + " / span " + newW;
        resizeWidget.el.style.gridRow = resizeWidget.el.dataset.gridRow + " / span " + newH;
        resizeWidget.el.dataset.gridWidth = newW;
        resizeWidget.el.dataset.gridHeight = newH;
      }
    }

    function onMouseUp() {
      dragWidget = null;
      resizeWidget = null;
    }

    function onEditEscape(e) {
      if (e.key === "Escape" && !document.querySelector(".modal-overlay")) {
        if (onCancel) onCancel();
      }
    }
    document.addEventListener("keydown", onEditEscape);

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);

    return function exitEditMode() {
      document.removeEventListener("keydown", onEditEscape);
      editing = false;
      gridEl.classList.remove("grid-editing");
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      hideEditBar();
      gridEl.querySelectorAll(".widget-edit-controls, .widget-resize-handle").forEach(function (h) { h.remove(); });
      gridEl.querySelectorAll(".widget-editable").forEach(function (w) { w.classList.remove("widget-editable"); });
      editClone = null;
    };
  }

  function readLayoutFromDOM(gridEl) {
    var layout = [];
    gridEl.querySelectorAll(".widget[data-grid-widget]").forEach(function (w) {
      layout.push({
        widget: w.dataset.gridWidget,
        col: parseInt(w.dataset.gridCol) || 1,
        row: parseInt(w.dataset.gridRow) || 1,
        width: parseInt(w.dataset.gridWidth) || 4,
        height: parseInt(w.dataset.gridHeight) || 1
      });
    });
    return layout;
  }

  return {
    COLS: COLS,
    applyLayout: applyLayout,
    enterEditMode: enterEditMode,
    readLayoutFromDOM: readLayoutFromDOM,
    hideEditBar: hideEditBar,
    isEditing: function () { return editing; },
    setEditClone: setEditClone,
    getEditClone: getEditClone,
    openConfigModal: openConfigModal,
    openAddWidgetModal: openAddWidgetModal
  };
})();
