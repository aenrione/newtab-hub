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

  /* Keys that are actions in edit mode and must not be used as chord shortcuts */
  var EDIT_ACTION_KEYS = { g: 1, x: 1, e: 1 };

  /* Edit-mode chord: derived from keyboard.js widgetKeyMap, minus edit-mode action keys.
     Widgets excluded from normal-mode chords (e.g. pinned-links) get a fresh key assigned. */
  function buildEditChordMap(gridEl) {
    var keyMap   = Hub.keyboard.getWidgetKeyMap();
    var ergoKeys = Hub.keyboard.ERGO_KEYS;
    var reserved = Hub.keyboard.RESERVED;

    /* Collect already-used keys so we don't double-assign */
    var used = {};
    var widgetFirstKey = new Map();

    Object.keys(keyMap).forEach(function (key) {
      used[key] = true;
      if (EDIT_ACTION_KEYS[key]) return;
      var widgetEl = keyMap[key].widgetEl;
      if (!widgetFirstKey.has(widgetEl)) widgetFirstKey.set(widgetEl, key);
    });

    /* Assign keys to editable widgets not covered by widgetKeyMap (e.g. pinned-links) */
    getEditableWidgets(gridEl).forEach(function (el) {
      if (widgetFirstKey.has(el)) return;
      for (var i = 0; i < ergoKeys.length; i++) {
        var k = ergoKeys[i];
        if (!reserved[k] && !EDIT_ACTION_KEYS[k] && !used[k]) {
          used[k] = true;
          widgetFirstKey.set(el, k);
          break;
        }
      }
    });

    getEditableWidgets(gridEl).forEach(function (el) {
      var key = widgetFirstKey.get(el);
      if (key) el.dataset.editChordKey = key;
      else delete el.dataset.editChordKey;
    });
  }

  function setEditClone(widgets) {
    editClone = widgets.map(function (w) {
      return Object.assign({}, w, { config: JSON.parse(JSON.stringify(w.config || {})) });
    });
  }
  function getEditClone() { return editClone; }

  /* ── Collision detection & resolution ── */

  /* Check if two layout items overlap (AABB test) */
  function collides(a, b) {
    if (a.widget === b.widget) return false;
    return !(
      a.col + a.width <= b.col ||
      b.col + b.width <= a.col ||
      a.row + a.height <= b.row ||
      b.row + b.height <= a.row
    );
  }

  /* Find all items that collide with the given item */
  function getCollisions(layout, item) {
    return layout.filter(function (other) { return collides(item, other); });
  }

  /* Push colliding items downward to make room for movedItem.
     Recursively handles cascading collisions. */
  function resolveCollisions(layout, movedItem) {
    var collisions = getCollisions(layout, movedItem);
    for (var i = 0; i < collisions.length; i++) {
      var other = collisions[i];
      /* Push the colliding item below the moved item */
      other.row = movedItem.row + movedItem.height;
      /* Recursively resolve any new collisions caused by this push */
      resolveCollisions(layout, other);
    }
  }

  /* Compact the layout vertically: move each item as high as possible
     without colliding with any item above it.
     Pass pinnedWidget to skip compacting one specific item (e.g. the one
     the user is actively moving, so explicit downward placement is preserved). */
  function compact(layout, pinnedWidget) {
    var sorted = layout.slice().sort(function (a, b) {
      return a.row !== b.row ? a.row - b.row : a.col - b.col;
    });

    for (var i = 0; i < sorted.length; i++) {
      var item = sorted[i];
      if (pinnedWidget && item.widget === pinnedWidget) continue;
      while (item.row > 1) {
        var candidate = Object.assign({}, item, { row: item.row - 1 });
        var blocked = false;
        for (var j = 0; j < sorted.length; j++) {
          if (sorted[j].widget !== item.widget && collides(candidate, sorted[j])) {
            blocked = true;
            break;
          }
        }
        if (blocked) break;
        item.row = candidate.row;
      }
    }
  }

  /* Build a layout array from current DOM state */
  function buildLayoutFromGrid(gridEl) {
    var items = [];
    gridEl.querySelectorAll(".widget[data-grid-widget]").forEach(function (el) {
      items.push({
        widget: el.dataset.gridWidget,
        col: parseInt(el.dataset.gridCol) || 1,
        row: parseInt(el.dataset.gridRow) || 1,
        width: parseInt(el.dataset.gridWidth) || 4,
        height: parseInt(el.dataset.gridHeight) || 1,
        el: el
      });
    });
    return items;
  }

  /* Apply resolved layout positions back to all DOM elements */
  function syncLayoutToDOM(layout) {
    layout.forEach(function (item) {
      if (!item.el) return;
      item.el.style.gridColumn = item.col + " / span " + item.width;
      item.el.style.gridRow = item.row + " / span " + item.height;
      item.el.dataset.gridCol = item.col;
      item.el.dataset.gridRow = item.row;
      item.el.dataset.gridWidth = item.width;
      item.el.dataset.gridHeight = item.height;
    });
  }

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
      '<span class="grid-edit-label">Editing layout <kbd class="edit-bar-hint">Tab</kbd> cycle <kbd class="edit-bar-hint">\u2190\u2191\u2192\u2193</kbd> move <kbd class="edit-bar-hint">Shift+\u2190\u2191\u2192\u2193</kbd> resize</span>' +
      '<div class="grid-edit-actions">' +
        '<button class="toolbar-button toolbar-button-ghost edit-bar-add-btn grid-edit-add" type="button" title="A">' +
          Hub.icons.plus + ' Add widget <kbd>A</kbd></button>' +
        '<button class="toolbar-button toolbar-button-ghost grid-edit-cancel" type="button" title="Escape">Cancel <kbd>Esc</kbd></button>' +
        '<button class="toolbar-button grid-edit-save" type="button" title="Ctrl/Cmd+S or E">' +
          Hub.icons.save + ' Save <kbd>\u2318S</kbd></button>' +
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
    var editorKeyboard = new EditorKeyboard(panel);
    plugin.renderEditor(body, w.config || {}, function (newConfig) {
      w.config = newConfig;
    }, { onRebuild: function () { editorKeyboard.rescan(); } });

    var actions = document.createElement("div");
    actions.className = "config-modal-actions";
    var doneBtn = document.createElement("button");
    doneBtn.className = "toolbar-button";
    doneBtn.type = "button";
    doneBtn.textContent = "Done";
    doneBtn.dataset.navSave = "";
    actions.appendChild(doneBtn);

    panel.appendChild(header);
    panel.appendChild(body);
    panel.appendChild(actions);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    function close() {
      editorKeyboard.detach();
      overlay.remove();
      if (onSave) onSave(widgetId);
    }
    closeBtn.addEventListener("click", close);
    doneBtn.addEventListener("click", close);
    overlay.addEventListener("click", function (e) { if (e.target === overlay) close(); });

    requestAnimationFrame(function () { editorKeyboard.attach(); });
  }

  function openAddWidgetModal(gridEl, onAdded) {
    var addable = Hub.registry.addable();
    var focusedCardIndex = -1;

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
    var cardGrid = document.createElement("div");
    cardGrid.className = "add-widget-grid";

    function selectCard(card) {
      card.click();
    }

    function focusCard(idx) {
      var cards = cardGrid.querySelectorAll(".add-widget-card");
      cards.forEach(function (c) { c.classList.remove("add-widget-card-focus"); });
      if (idx < 0 || idx >= cards.length) { focusedCardIndex = -1; return; }
      focusedCardIndex = idx;
      cards[idx].classList.add("add-widget-card-focus");
      cards[idx].focus();
    }

    function renderCards(filter) {
      cardGrid.replaceChildren();
      focusedCardIndex = -1;
      var filt = (filter || "").toLowerCase();
      addable.forEach(function (p) {
        if (filt && !p.label.toLowerCase().includes(filt)) return;
        var card = document.createElement("button");
        card.className = "add-widget-card";
        card.type = "button";
        card.tabIndex = 0;
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
        cardGrid.appendChild(card);
      });
    }

    searchInput.addEventListener("input", function () { renderCards(searchInput.value); });
    renderCards("");

    panel.appendChild(header);
    panel.appendChild(searchWrap);
    panel.appendChild(cardGrid);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    searchInput.focus();

    function close() {
      document.removeEventListener("keydown", onModalKey);
      overlay.remove();
    }
    closeBtn.addEventListener("click", close);
    overlay.addEventListener("click", function (e) { if (e.target === overlay) close(); });

    function onModalKey(e) {
      var cards = cardGrid.querySelectorAll(".add-widget-card");
      var numCards = cards.length;
      var cols = 2; /* grid is 2 columns */

      if (e.key === "Escape") { e.preventDefault(); close(); return; }

      /* Arrow down or Tab from search → move to cards */
      if (e.key === "ArrowDown" || (e.key === "Tab" && !e.shiftKey && document.activeElement === searchInput)) {
        if (numCards > 0) {
          e.preventDefault();
          focusCard(focusedCardIndex < 0 ? 0 : Math.min(focusedCardIndex + cols, numCards - 1));
        }
        return;
      }

      /* Arrow up from first row → back to search */
      if (e.key === "ArrowUp") {
        if (focusedCardIndex < 0 || focusedCardIndex < cols) {
          e.preventDefault();
          cards.forEach(function (c) { c.classList.remove("add-widget-card-focus"); });
          focusedCardIndex = -1;
          searchInput.focus();
        } else {
          e.preventDefault();
          focusCard(focusedCardIndex - cols);
        }
        return;
      }

      if (e.key === "ArrowRight") {
        if (focusedCardIndex >= 0 && focusedCardIndex < numCards - 1) {
          e.preventDefault();
          focusCard(focusedCardIndex + 1);
        }
        return;
      }

      if (e.key === "ArrowLeft") {
        if (focusedCardIndex > 0) {
          e.preventDefault();
          focusCard(focusedCardIndex - 1);
        }
        return;
      }

      /* Shift+Tab from cards → back to search */
      if (e.key === "Tab" && e.shiftKey && focusedCardIndex >= 0) {
        e.preventDefault();
        cards.forEach(function (c) { c.classList.remove("add-widget-card-focus"); });
        focusedCardIndex = -1;
        searchInput.focus();
        return;
      }

      /* Enter on card → select it */
      if (e.key === "Enter" && focusedCardIndex >= 0 && focusedCardIndex < numCards) {
        e.preventDefault();
        selectCard(cards[focusedCardIndex]);
        return;
      }
    }

    document.addEventListener("keydown", onModalKey);
  }

  /* ── Edit mode keyboard controls ── */

  var editFocusedWidget = null; /* currently keyboard-focused widget element */
  var editGrabbed = false;      /* whether the focused widget is "grabbed" for move/resize */

  function setEditGrab(grabbed) {
    editGrabbed = grabbed;
    if (editFocusedWidget) {
      editFocusedWidget.classList.toggle("edit-focus", !grabbed);
      editFocusedWidget.classList.toggle("widget-grabbed", grabbed);
    }
  }

  /* Spatial scoring for focus navigation (mirrors keyboard.js score logic) */
  function scoreEditDir(cur, rect, dir) {
    var cx = cur.left + cur.width / 2, cy = cur.top + cur.height / 2;
    var tx = rect.left + rect.width / 2, ty = rect.top + rect.height / 2;
    var ox = Math.max(0, Math.min(cur.right, rect.right) - Math.max(cur.left, rect.left));
    var oy = Math.max(0, Math.min(cur.bottom, rect.bottom) - Math.max(cur.top, rect.top));
    if (dir === "right") { if (tx <= cx + 4) return null; return (oy > 0 ? 0 : 10000) + Math.max(0, rect.left - cur.right) * 12 + Math.abs(ty - cy); }
    if (dir === "left")  { if (tx >= cx - 4) return null; return (oy > 0 ? 0 : 10000) + Math.max(0, cur.left - rect.right) * 12 + Math.abs(ty - cy); }
    if (dir === "down")  { if (ty <= cy + 4) return null; return (ox > 0 ? 0 : 10000) + Math.max(0, rect.top - cur.bottom) * 12 + Math.abs(tx - cx); }
    if (dir === "up")    { if (ty >= cy - 4) return null; return (ox > 0 ? 0 : 10000) + Math.max(0, cur.top - rect.bottom) * 12 + Math.abs(tx - cx); }
    return null;
  }

  function getEditableWidgets(gridEl) {
    return Array.from(gridEl.querySelectorAll(".widget.widget-editable"));
  }

  function setEditFocus(el) {
    if (editFocusedWidget) {
      editFocusedWidget.classList.remove("edit-focus");
      editFocusedWidget.classList.remove("widget-grabbed");
    }
    editGrabbed = false;
    editFocusedWidget = el;
    if (el) {
      el.classList.add("edit-focus");
      el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }

  function handleEditKey(e) {
    var gridEl = document.getElementById("dashboard-grid");
    if (!gridEl || !editing) return false;

    /* When grabbed: hjkl/HJKL all map to arrows (move + resize).
       When not grabbed: only HJKL map (shift+resize); lowercase hjkl = focus nav below. */
    var VIM_MAP = editGrabbed
      ? { h: "ArrowLeft", j: "ArrowDown", k: "ArrowUp", l: "ArrowRight",
          H: "ArrowLeft", J: "ArrowDown", K: "ArrowUp", L: "ArrowRight" }
      : { H: "ArrowLeft", J: "ArrowDown", K: "ArrowUp", L: "ArrowRight" };
    var key = VIM_MAP[e.key] ? VIM_MAP[e.key] : e.key;
    var shiftKey = e.shiftKey || (e.key in VIM_MAP && e.key === e.key.toUpperCase() && e.key !== e.key.toLowerCase());

    var widgets = getEditableWidgets(gridEl);
    if (!widgets.length) return false;

    /* Esc while grabbed → release grab (stay in edit mode) */
    if (e.key === "Escape" && editGrabbed) {
      e.preventDefault();
      e.stopImmediatePropagation();
      setEditGrab(false);
      return true;
    }

    /* Tab / Shift+Tab: cycle through widgets */
    if (key === "Tab") {
      e.preventDefault();
      var idx = editFocusedWidget ? widgets.indexOf(editFocusedWidget) : -1;
      if (e.shiftKey) {
        idx = idx <= 0 ? widgets.length - 1 : idx - 1;
      } else {
        idx = idx >= widgets.length - 1 ? 0 : idx + 1;
      }
      setEditFocus(widgets[idx]);
      return true;
    }

    /* Letter chord: jump-focus a widget using the same keys as normal mode.
       Also covers widgets excluded from normal chords (e.g. pinned-links) via editChordKey. */
    if (/^[a-z]$/.test(key) && !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey && !EDIT_ACTION_KEYS[key]) {
      /* Try widgetKeyMap first (covers most widgets) */
      var km = Hub.keyboard.getWidgetKeyMap();
      var entry = km[key];
      if (entry && entry.widgetEl && entry.widgetEl.classList.contains("widget-editable")) {
        e.preventDefault();
        setEditFocus(entry.widgetEl);
        return true;
      }
      /* Fallback: widgets assigned a key only in edit mode (e.g. pinned-links) */
      var el = gridEl.querySelector(".widget-editable[data-edit-chord-key='" + key + "']");
      if (el) {
        e.preventDefault();
        setEditFocus(el);
        return true;
      }
    }

    /* hjkl (not grabbed): spatially navigate focus between widgets */
    var HJKL_DIR = { h: "left", j: "down", k: "up", l: "right" };
    if (!editGrabbed && HJKL_DIR[e.key] && !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey) {
      e.preventDefault();
      if (!editFocusedWidget) { setEditFocus(widgets[0]); return true; }
      var dir = HJKL_DIR[e.key];
      var cur = editFocusedWidget.getBoundingClientRect();
      var best = null;
      widgets.forEach(function (ww) {
        if (ww === editFocusedWidget) return;
        var s = scoreEditDir(cur, ww.getBoundingClientRect(), dir);
        if (s !== null && (!best || s < best.score)) best = { el: ww, score: s };
      });
      if (best) setEditFocus(best.el);
      return true;
    }

    if (!editFocusedWidget) return false;

    /* Enter / Space: toggle grab on focused widget */
    if ((key === "Enter" || key === " ") && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      setEditGrab(!editGrabbed);
      return true;
    }

    var w = editFocusedWidget;
    var col = parseInt(w.dataset.gridCol);
    var row = parseInt(w.dataset.gridRow);
    var width = parseInt(w.dataset.gridWidth);
    var height = parseInt(w.dataset.gridHeight);

    /* Arrow keys: move widget (or resize with Shift) */
    if (key === "ArrowRight" || key === "ArrowLeft" || key === "ArrowDown" || key === "ArrowUp") {
      e.preventDefault();

      if (shiftKey) {
        /* Resize */
        if (key === "ArrowRight") width = Math.min(COLS - col + 1, width + 1);
        else if (key === "ArrowLeft") width = Math.max(1, width - 1);
        else if (key === "ArrowDown") height = height + 1;
        else if (key === "ArrowUp") height = Math.max(1, height - 1);

        w.dataset.gridWidth = width;
        w.dataset.gridHeight = height;
      } else {
        /* Move */
        if (key === "ArrowRight") col = Math.min(COLS - width + 1, col + 1);
        else if (key === "ArrowLeft") col = Math.max(1, col - 1);
        else if (key === "ArrowDown") row = row + 1;
        else if (key === "ArrowUp") row = Math.max(1, row - 1);

        w.dataset.gridCol = col;
        w.dataset.gridRow = row;
      }

      /* Resolve collisions and compact (pin the moved widget so downward placement is preserved) */
      var layout = buildLayoutFromGrid(gridEl);
      var movedItem = layout.find(function (it) { return it.widget === w.dataset.gridWidget; });
      if (movedItem) {
        movedItem.col = col;
        movedItem.row = row;
        movedItem.width = width;
        movedItem.height = height;
        resolveCollisions(layout, movedItem);
        compact(layout, movedItem.widget);
        syncLayoutToDOM(layout);
      } else {
        w.style.gridColumn = col + " / span " + width;
        w.style.gridRow = row + " / span " + height;
      }
      return true;
    }

    /* G or Enter: open config */
    if ((key === "g" || key === "Enter") && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      var gearBtn = w.querySelector(".widget-edit-btn.is-gear");
      if (gearBtn) gearBtn.click();
      return true;
    }

    /* X or Delete: remove widget */
    if ((key === "x" || key === "Delete" || key === "Backspace") && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      var widgetId = w.dataset.widgetId;
      var nextWidgets = getEditableWidgets(gridEl);
      var idx = nextWidgets.indexOf(w);
      removeWidget(widgetId, gridEl);
      /* Focus next widget */
      nextWidgets = getEditableWidgets(gridEl);
      if (nextWidgets.length) {
        setEditFocus(nextWidgets[Math.min(idx, nextWidgets.length - 1)]);
      } else {
        setEditFocus(null);
      }
      return true;
    }

    return false;
  }

  function enterEditMode(gridEl, layout, onSave, onCancel, onAdded, onConfigSave) {
    editing = true;
    editFocusedWidget = null;
    gridEl.classList.add("grid-editing");

    showEditBar(onSave, onCancel, gridEl, onAdded);

    gridEl.querySelectorAll(".widget").forEach(function (w) {
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

    /* Build chord map and stamp key badges onto each widget's drag handle */
    buildEditChordMap(gridEl);
    getEditableWidgets(gridEl).forEach(function (el) {
      var key = el.dataset.editChordKey;
      if (!key) return;
      var dragBtn = el.querySelector(".widget-edit-btn.is-drag");
      if (!dragBtn) return;
      var badge = document.createElement("span");
      badge.className = "edit-chord-badge";
      badge.textContent = key.toUpperCase();
      dragBtn.after(badge);
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
        var h = parseInt(dragWidget.el.dataset.gridHeight);
        var newCol = Math.max(1, Math.min(COLS - w + 1, dragWidget.origCol + colDelta));
        var newRow = Math.max(1, dragWidget.origRow + rowDelta);

        /* Update the dragged widget position */
        dragWidget.el.dataset.gridCol = newCol;
        dragWidget.el.dataset.gridRow = newRow;

        /* Build layout, resolve collisions, compact (pin dragged widget so downward drag sticks) */
        var layout = buildLayoutFromGrid(gridEl);
        var movedItem = layout.find(function (it) { return it.widget === dragWidget.el.dataset.gridWidget; });
        if (movedItem) {
          movedItem.col = newCol;
          movedItem.row = newRow;
          resolveCollisions(layout, movedItem);
          compact(layout, movedItem.widget);
          syncLayoutToDOM(layout);
        }
      }

      if (resizeWidget) {
        var rdx = e.clientX - resizeWidget.startX;
        var rdy = e.clientY - resizeWidget.startY;
        var col = parseInt(resizeWidget.el.dataset.gridCol);
        var row = parseInt(resizeWidget.el.dataset.gridRow);
        var newW = Math.max(1, Math.min(COLS - col + 1, resizeWidget.origWidth + Math.round(rdx / cellW)));
        var newH = Math.max(1, resizeWidget.origHeight + Math.round(rdy / rowH));

        /* Update the resized widget */
        resizeWidget.el.dataset.gridWidth = newW;
        resizeWidget.el.dataset.gridHeight = newH;

        /* Build layout, resolve collisions, compact (pin resized widget) */
        var layout = buildLayoutFromGrid(gridEl);
        var resizedItem = layout.find(function (it) { return it.widget === resizeWidget.el.dataset.gridWidget; });
        if (resizedItem) {
          resizedItem.width = newW;
          resizedItem.height = newH;
          resolveCollisions(layout, resizedItem);
          compact(layout, resizedItem.widget);
          syncLayoutToDOM(layout);
        }
      }
    }

    function onMouseUp() {
      if (dragWidget || resizeWidget) {
        /* Final compaction pass on drop — keep the dropped widget pinned so placement is respected */
        var pinnedId = (dragWidget || resizeWidget).el.dataset.gridWidget;
        var layout = buildLayoutFromGrid(gridEl);
        compact(layout, pinnedId);
        syncLayoutToDOM(layout);
      }
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
      editGrabbed = false;
      setEditFocus(null);
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
    openAddWidgetModal: openAddWidgetModal,
    handleEditKey: handleEditKey
  };
})();
