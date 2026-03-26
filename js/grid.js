/* ── Grid layout engine ── */

window.Hub = window.Hub || {};

Hub.grid = (function () {
  var COLS = 12;
  var ROW_HEIGHT = 88;
  var editing = false;
  var dragWidget = null;
  var resizeWidget = null;
  var onSaveCallback = null;
  var editBar = null;
  var editClone = null; /* deep clone of widgets during edit mode */
  var editClipboard = null; /* copied widget data for Cmd+C / Cmd+V */
  var onAddedFn = null; /* stored onAdded callback for paste/duplicate */
  var configSidebar = null;        /* singleton left sidebar for widget config */
  var configSidebarWidgetId = null; /* widgetId currently rendered in sidebar */
  var editOnConfigSave = null;      /* onConfigSave callback stored during edit mode */

  /* Keys reserved by edit mode or other global actions while editing. */
  var EDIT_ACTION_KEYS = { c: 1, x: 1, e: 1, r: 1 };
  var EDIT_RESERVED_KEYS = { a: 1, c: 1, e: 1, h: 1, j: 1, k: 1, l: 1, p: 1, r: 1, t: 1, x: 1, z: 1 };
  var EDIT_CHORD_KEYS = "fgswvbnmioqudy1234567890".split("");

  function getEditWidgetTitle(el) {
    var h = el.querySelector(".widget-header h1, .widget-header h2, .widget-header h3, h2, h3, summary h3");
    if (h && h.textContent) return h.textContent.trim();
    return String(el.dataset.widgetType || "").replace(/-/g, " ");
  }

  function collectEditTitleKeys(title) {
    var seen = {};
    return String(title || "").toLowerCase().replace(/[^a-z0-9]/g, "").split("").filter(function (key) {
      if (!key || seen[key] || EDIT_RESERVED_KEYS[key] || EDIT_CHORD_KEYS.indexOf(key) === -1) return false;
      seen[key] = true;
      return true;
    });
  }

  /* Edit-mode chord: keep a widget's normal key when safe, otherwise assign from a
     dedicated edit-mode pool so every editable widget can still be focused. */
  function buildEditChordMap(gridEl) {
    var keyMap = Hub.keyboard.getWidgetKeyMap();
    var widgets = getEditableWidgets(gridEl);
    var used = {};
    var assignedByWidget = new Map();

    Object.keys(keyMap).forEach(function (key) {
      var widgetEl = keyMap[key].widgetEl;
      if (!widgetEl || assignedByWidget.has(widgetEl) || EDIT_RESERVED_KEYS[key] || EDIT_CHORD_KEYS.indexOf(key) === -1) return;
      used[key] = true;
      assignedByWidget.set(widgetEl, key);
    });

    widgets.forEach(function (el) {
      if (assignedByWidget.has(el)) return;

      var preferredKeys = collectEditTitleKeys(getEditWidgetTitle(el));
      for (var i = 0; i < preferredKeys.length; i++) {
        var preferredKey = preferredKeys[i];
        if (!used[preferredKey]) {
          used[preferredKey] = true;
          assignedByWidget.set(el, preferredKey);
          break;
        }
      }

      if (assignedByWidget.has(el)) return;

      for (var j = 0; j < EDIT_CHORD_KEYS.length; j++) {
        var fallbackKey = EDIT_CHORD_KEYS[j];
        if (!used[fallbackKey]) {
          used[fallbackKey] = true;
          assignedByWidget.set(el, fallbackKey);
          break;
        }
      }
    });

    widgets.forEach(function (el) {
      var key = assignedByWidget.get(el);
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

  function fitsWithinGrid(item) {
    return item.col >= 1 &&
      item.row >= 1 &&
      item.width >= 1 &&
      item.height >= 1 &&
      item.col + item.width - 1 <= COLS;
  }

  function itemMinWidth(item) {
    return Math.max(1, parseInt(item && item.minWidth, 10) || 1);
  }

  function itemMinHeight(item) {
    return Math.max(1, parseInt(item && item.minHeight, 10) || 1);
  }

  function canPlace(layout, candidate) {
    if (!fitsWithinGrid(candidate)) return false;
    return !layout.some(function (item) {
      return collides(candidate, item);
    });
  }

  function buildColumnOrder(startCol, maxCol) {
    var cols = [];
    var seen = {};
    var preferred = Math.max(1, Math.min(maxCol, startCol || 1));

    function add(col) {
      if (col < 1 || col > maxCol || seen[col]) return;
      seen[col] = true;
      cols.push(col);
    }

    add(preferred);
    for (var step = 1; cols.length < maxCol; step++) {
      add(preferred + step);
      add(preferred - step);
    }

    return cols;
  }

  function findClosestAvailableSlot(layout, item) {
    var maxCol = Math.max(1, COLS - item.width + 1);
    var preferredCol = Math.max(1, Math.min(maxCol, item.col || 1));
    var preferredRow = Math.max(1, item.row || 1);
    var maxRow = layout.reduce(function (m, other) {
      return Math.max(m, (other.row || 1) + (other.height || 1));
    }, preferredRow) + 1;
    var cols = buildColumnOrder(preferredCol, maxCol);

    for (var row = preferredRow; row <= maxRow; row++) {
      for (var i = 0; i < cols.length; i++) {
        var candidate = Object.assign({}, item, {
          col: cols[i],
          row: row
        });
        if (canPlace(layout, candidate)) return { col: candidate.col, row: candidate.row };
      }
    }

    return findFirstAvailableSlot(layout, item.width, item.height, item.widget);
  }

  /* Re-home colliding items to the nearest open slot before pushing them farther down. */
  function resolveCollisions(layout, movedItem) {
    var collisions = getCollisions(layout, movedItem);
    for (var i = 0; i < collisions.length; i++) {
      var other = collisions[i];
      var slot = findClosestAvailableSlot(layout, other);
      other.col = slot.col;
      other.row = slot.row;
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

  function findFirstAvailableSlot(layout, width, height, widgetId) {
    var maxRow = layout.reduce(function (m, item) {
      return Math.max(m, (item.row || 1) + (item.height || 1));
    }, 1);

    for (var row = 1; row <= maxRow + 1; row++) {
      for (var col = 1; col <= COLS - width + 1; col++) {
        var candidate = {
          widget: widgetId || "__candidate__",
          col: col,
          row: row,
          width: width,
          height: height
        };
        if (canPlace(layout, candidate)) return { col: col, row: row };
      }
    }

    return { col: 1, row: maxRow + 1 };
  }

  function normalizeItemBounds(item) {
    var minWidth = itemMinWidth(item);
    var minHeight = itemMinHeight(item);
    var width = Math.max(minWidth, Math.min(COLS, item.width || minWidth));
    var col = Math.max(1, Math.min(COLS - width + 1, item.col || 1));
    return {
      widget: item.widget,
      col: col,
      row: Math.max(1, item.row || 1),
      width: width,
      height: Math.max(minHeight, item.height || minHeight),
      minWidth: minWidth,
      minHeight: minHeight
    };
  }

  function resolveLayoutChange(layout, changedItem) {
    var nextLayout = layout.map(function (item) {
      return Object.assign({}, item);
    });
    var target = nextLayout.find(function (item) {
      return item.widget === changedItem.widget;
    });
    var normalized = normalizeItemBounds(Object.assign({}, target || {}, changedItem));

    if (target) {
      target.col = normalized.col;
      target.row = normalized.row;
      target.width = normalized.width;
      target.height = normalized.height;
      target.minWidth = normalized.minWidth;
      target.minHeight = normalized.minHeight;
    } else {
      target = normalized;
      nextLayout.push(target);
    }

    resolveCollisions(nextLayout, target);
    compact(nextLayout, target.widget);

    return nextLayout;
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
        minWidth: parseInt(el.dataset.gridMinWidth) || 1,
        minHeight: parseInt(el.dataset.gridMinHeight) || 1,
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
      item.el.dataset.gridMinWidth = itemMinWidth(item);
      item.el.dataset.gridMinHeight = itemMinHeight(item);
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
    gridEl.style.gridAutoRows = ROW_HEIGHT + "px";

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
      el.dataset.gridMinWidth = itemMinWidth(item);
      el.dataset.gridMinHeight = itemMinHeight(item);

      frag.appendChild(el);
    });

    gridEl.replaceChildren(frag);
  }

  function showEditBar(onSave, onCancel, gridEl, onAdded) {
    if (editBar) editBar.remove();

    editBar = document.createElement("div");
    editBar.className = "grid-edit-bar";
    editBar.innerHTML =
      '<span class="grid-edit-label">Editing layout' +
        '<span class="edit-hint-group"><kbd class="edit-bar-hint">Tab</kbd> cycle</span>' +
        '<span class="edit-hint-group"><kbd class="edit-bar-hint">\u2190\u2191\u2192\u2193</kbd> move</span>' +
        '<span class="edit-hint-group"><kbd class="edit-bar-hint">Shift+\u2190\u2191\u2192\u2193</kbd> resize</span>' +
        '<span class="edit-hint-group"><kbd class="edit-bar-hint">Enter/C</kbd> config</span>' +
        '<span class="edit-hint-group"><kbd class="edit-bar-hint">Space</kbd> drag</span>' +
        '<span class="edit-hint-group"><kbd class="edit-bar-hint">Backspace/X</kbd> delete</span>' +
        '<span class="edit-hint-group"><kbd class="edit-bar-hint">R</kbd> raw</span>' +
        '<span class="edit-hint-group"><kbd class="edit-bar-hint">\u2318C</kbd> copy</span>' +
        '<span class="edit-hint-group"><kbd class="edit-bar-hint">\u2318V</kbd> paste</span>' +
      '</span>' +
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
    Hub.credentials.clear(widgetId);
    editClone = editClone.filter(function (w) { return w.id !== widgetId; });
    var el = gridEl.querySelector('[data-widget-id="' + widgetId + '"]');
    if (el) el.remove();
  }

  async function pasteWidget() {
    if (!editClipboard || !onAddedFn) return;
    var slot = findFirstAvailableSlot(editClone, editClipboard.width || 4, editClipboard.height || 1);
    var newWidget = {
      id: Hub.uid(),
      type: editClipboard.type,
      col: slot.col,
      row: slot.row,
      width: editClipboard.width,
      height: editClipboard.height,
      minWidth: editClipboard.minWidth,
      minHeight: editClipboard.minHeight,
      config: JSON.parse(JSON.stringify(editClipboard.config || {}))
    };
    if (editClipboard.cardColor) newWidget.cardColor = Object.assign({}, editClipboard.cardColor);
    editClone.push(newWidget);

    /* Copy per-widget storage from the source widget to the new widget */
    var srcId = editClipboard._srcId;
    if (srcId) {
      var store = Hub.storageApi();

      /* Copy credentials (API keys, tokens) */
      var creds = await Hub.credentials.load(srcId);
      if (creds && Object.keys(creds).length) {
        await Hub.credentials.save(newWidget.id, creds);
      }

      /* Copy todo items */
      var todos = await store.get("new-tab-todos-" + srcId);
      if (todos) {
        await store.set("new-tab-todos-" + newWidget.id, todos);
      }
    }

    onAddedFn(newWidget, { openConfig: false });
  }

  var rawJsonEditor = Hub.rawJsonEditor;
  var formatConfigJSON = rawJsonEditor.formatConfigJSON;
  var parseConfigJSON = rawJsonEditor.parseConfigJSON;
  var rawFindInnerWordRange = rawJsonEditor.rawFindInnerWordRange;
  var rawMoveWordBackward = rawJsonEditor.rawMoveWordBackward;
  var rawMoveWordForward = rawJsonEditor.rawMoveWordForward;
  var rawMoveWordEnd = rawJsonEditor.rawMoveWordEnd;
  var rawFindMatchingBracket = rawJsonEditor.rawFindMatchingBracket;
  var rawDeleteCurrentLine = rawJsonEditor.rawDeleteCurrentLine;
  var rawPasteLine = rawJsonEditor.rawPasteLine;

  function openRawConfigEditor(options) {
    rawJsonEditor.open(options);
  }

  function ensureConfigSidebar() {
    if (!configSidebar) {
      configSidebar = document.createElement("div");
      configSidebar.className = "config-sidebar";
      document.body.appendChild(configSidebar);
    }
    return configSidebar;
  }

  function showConfigSidebarEmpty() {
    var sidebar = ensureConfigSidebar();
    if (configSidebar._cleanup) { configSidebar._cleanup(); configSidebar._cleanup = null; }
    configSidebarWidgetId = null;
    var emptyPanel = document.createElement("div");
    emptyPanel.className = "config-sidebar-main";
    var msg = document.createElement("p");
    msg.className = "config-sidebar-empty-msg";
    msg.innerHTML = "Navigate to a widget, then press <kbd>C</kbd> to configure it.";
    emptyPanel.appendChild(msg);
    sidebar.replaceChildren(emptyPanel);
    sidebar.classList.add("is-open");
    document.body.classList.add("config-sidebar-open");
  }

  function openConfigModal(widgetId, onSave, options) {
    options = options || {};
    if (onSave) editOnConfigSave = onSave;

    var w = editClone ? editClone.find(function (ww) { return ww.id === widgetId; }) : null;
    if (!w) return;
    var plugin = Hub.registry.get(w.type);
    if (!plugin) return;

    var sidebar = ensureConfigSidebar();
    if (!sidebar.classList.contains("is-open")) return; /* sidebar must be open (edit mode) */
    if (configSidebarWidgetId === widgetId) {
      if (options.raw) {
        var existingRawBtn = sidebar.querySelector("[data-nav-raw]");
        if (existingRawBtn) existingRawBtn.click();
      }
      return;
    }
    configSidebarWidgetId = widgetId;

    /* Clean up previous session */
    if (configSidebar._cleanup) { configSidebar._cleanup(); configSidebar._cleanup = null; }

    /* Main content panel */
    var panel = document.createElement("div");
    panel.className = "config-sidebar-main";

    var header = document.createElement("div");
    header.className = "modal-header";

    var title = document.createElement("h2");
    title.textContent = plugin.label;
    header.appendChild(title);

    var headerActions = document.createElement("div");
    headerActions.className = "modal-header-actions";

    var rawBtn = document.createElement("button");
    rawBtn.className = "toolbar-button toolbar-button-ghost modal-header-button";
    rawBtn.type = "button";
    rawBtn.innerHTML = Hub.icons.code + "<span>Raw JSON</span>";
    rawBtn.dataset.navRaw = "";
    headerActions.appendChild(rawBtn);

    var closeBtn = document.createElement("button");
    closeBtn.className = "modal-close";
    closeBtn.innerHTML = Hub.icons.x;
    closeBtn.type = "button";
    headerActions.appendChild(closeBtn);
    header.appendChild(headerActions);

    var body = document.createElement("div");
    body.className = "config-modal-body";
    var editorKeyboard = new EditorKeyboard(panel);
    var keyboardAttached = false;
    var renderSeq = 0;

    function attachEditorKeyboard() {
      if (keyboardAttached) return;
      editorKeyboard.attach();
      keyboardAttached = true;
    }

    function detachEditorKeyboard() {
      if (!keyboardAttached) return;
      editorKeyboard.detach();
      keyboardAttached = false;
    }

    function appendCardColorSection() {
      var DEFAULT_H = 220, DEFAULT_L = 16, SAT = 30;

      function colorStr(h, l) {
        return "hsl(" + h + "," + SAT + "%," + l + "%)";
      }

      var widgetEl = document.getElementById("widget-" + widgetId);
      var existing = w.cardColor || null;
      var hueVal = existing ? existing.h : DEFAULT_H;
      var lightVal = existing ? existing.l : DEFAULT_L;

      var section = document.createElement("div");
      section.className = "card-color-section";

      var sectionLabel = document.createElement("p");
      sectionLabel.className = "customize-label";
      sectionLabel.textContent = "Card color";
      section.appendChild(sectionLabel);

      /* Hue row */
      var hueRow = document.createElement("div");
      hueRow.className = "style-control-row";
      var hueLabel = document.createElement("span");
      hueLabel.textContent = "Hue";
      var hueSlider = document.createElement("input");
      hueSlider.type = "range";
      hueSlider.className = "card-hue-slider";
      hueSlider.min = "0";
      hueSlider.max = "360";
      hueSlider.value = hueVal;
      var swatchCol = document.createElement("span");
      swatchCol.className = "card-color-swatch-col";
      var swatch = document.createElement("span");
      swatch.className = "card-color-swatch";
      if (existing) swatch.style.background = colorStr(hueVal, lightVal);
      swatchCol.appendChild(swatch);
      hueRow.appendChild(hueLabel);
      hueRow.appendChild(hueSlider);
      hueRow.appendChild(swatchCol);
      section.appendChild(hueRow);

      /* Brightness row */
      var lightRow = document.createElement("div");
      lightRow.className = "style-control-row";
      var lightLabel = document.createElement("span");
      lightLabel.textContent = "Brightness";
      var lightSlider = document.createElement("input");
      lightSlider.type = "range";
      lightSlider.className = "card-lightness-slider";
      lightSlider.min = "8";
      lightSlider.max = "28";
      lightSlider.value = lightVal;
      var lightDisplay = document.createElement("span");
      lightDisplay.className = "style-value";
      lightDisplay.textContent = lightVal + "%";
      lightRow.appendChild(lightLabel);
      lightRow.appendChild(lightSlider);
      lightRow.appendChild(lightDisplay);
      section.appendChild(lightRow);

      /* Update brightness slider track to reflect current hue */
      function updateLightnessTrack(h) {
        lightSlider.style.background = "linear-gradient(to right," +
          "hsl(" + h + "," + SAT + "%,8%)," +
          "hsl(" + h + "," + SAT + "%,28%))";
      }
      updateLightnessTrack(hueVal);

      function applyColor() {
        var h = parseInt(hueSlider.value);
        var l = parseInt(lightSlider.value);
        swatch.style.background = colorStr(h, l);
        lightDisplay.textContent = l + "%";
        updateLightnessTrack(h);
        w.cardColor = { h: h, l: l };
        if (widgetEl) widgetEl.style.setProperty("--widget-surface", colorStr(h, l));
      }

      hueSlider.addEventListener("input", applyColor);
      lightSlider.addEventListener("input", applyColor);

      /* Reset row */
      var resetRow = document.createElement("div");
      resetRow.className = "card-color-reset-row";
      var resetBtn = document.createElement("button");
      resetBtn.type = "button";
      resetBtn.className = "toolbar-button toolbar-button-ghost";
      resetBtn.textContent = "Reset to global";
      resetBtn.addEventListener("click", function () {
        delete w.cardColor;
        hueSlider.value = DEFAULT_H;
        lightSlider.value = DEFAULT_L;
        swatch.style.background = "";
        lightDisplay.textContent = DEFAULT_L + "%";
        updateLightnessTrack(DEFAULT_H);
        if (widgetEl) widgetEl.style.removeProperty("--widget-surface");
      });
      resetRow.appendChild(resetBtn);
      section.appendChild(resetRow);

      body.appendChild(section);
    }

    function appendCredentialSection(seq) {
      renderCredentialSection(body, plugin, widgetId,
        function () { return seq !== renderSeq; },
        function () { editorKeyboard.rescan(); }
      );
    }

    function rebuildBody() {
      renderSeq++;
      var seq = renderSeq;
      body.replaceChildren();

      if (plugin.renderEditor) {
        plugin.renderEditor(body, w.config || {}, function (newConfig) {
          w.config = newConfig;
        }, { onRebuild: function () { editorKeyboard.rescan(); } });
      } else {
        var empty = document.createElement("div");
        empty.className = "empty-state";
        empty.textContent = "This widget has no visual editor yet. Use Raw JSON.";
        body.appendChild(empty);
      }

      appendCardColorSection();
      appendCredentialSection(seq);
    }

    function openRawEditor() {
      detachEditorKeyboard();
      openRawConfigEditor({
        title: plugin.label,
        config: w.config || {},
        schema: plugin.rawEditorSchema || null,
        returnFocusEl: rawBtn,
        onApply: function (nextConfig) {
          w.config = nextConfig;
          rebuildBody();
        },
        onClose: function () {
          requestAnimationFrame(function () {
            attachEditorKeyboard();
          });
        }
      });
    }

    rebuildBody();
    rawBtn.addEventListener("click", openRawEditor);

    var editorHints = document.createElement("div");
    editorHints.className = "editor-kb-hints";
    editorHints.innerHTML =
      "<span><kbd>^D</kbd><kbd>^U</kbd> scroll</span>" +
      "<span><kbd>z</kbd> fold all</span>";

    panel.appendChild(header);
    panel.appendChild(body);
    panel.appendChild(editorHints);

    /* X closes back to empty state (deselects widget) */
    closeBtn.addEventListener("click", function () {
      detachEditorKeyboard();
      configSidebar._cleanup = null;
      showConfigSidebarEmpty();
    });

    sidebar.replaceChildren(panel);

    configSidebar._cleanup = function () {
      detachEditorKeyboard();
    };

    /* Attach synchronously so focus lands inside the sidebar before this keydown
       handler returns — prevents 'j' (queued right after 'c') from moving the grid ring */
    attachEditorKeyboard();
    if (options.raw) {
      requestAnimationFrame(function () {
        openRawEditor();
      });
    }
  }

  function openAddWidgetModal(gridEl, onAdded) {
    var addable = Hub.registry.addable();
    var focusedCardIndex = -1;

    var WIDGET_CATEGORIES = [
      { name: "Basics",      types: ["clock","todo","calendar","search","pomodoro","weather","markets"] },
      { name: "Links",       types: ["pinned-links","bookmarks","link-group"] },
      { name: "News",        types: ["feeds","reddit","hacker-news","lobsters","miniflux","youtube","twitch-channels","twitch-top-games"] },
      { name: "Media",       types: ["plex","jellyfin","tautulli","immich","overseerr","sonarr","radarr","bazarr","lidarr","readarr","prowlarr","sabnzbd","nzbget","transmission"] },
      { name: "Self-hosted", types: ["pihole","adguard","proxmox","portainer","nextcloud","netdata","home-assistant","dns-stats","speedtest-tracker","change-detection","grafana","monitor","paperless-ngx","mealie"] },
      { name: "Developer",   types: ["github-prs","github-releases","repository","custom-api"] },
      { name: "Layout",      types: ["group","html","iframe"] }
    ];

    function getCategoryName(type) {
      for (var i = 0; i < WIDGET_CATEGORIES.length; i++) {
        if (WIDGET_CATEGORIES[i].types.indexOf(type) !== -1) return WIDGET_CATEGORIES[i].name;
      }
      return "Other";
    }

    var overlay = document.createElement("div");
    overlay.className = "modal-overlay";

    var panel = document.createElement("div");
    panel.className = "modal-panel add-widget-modal-panel";

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
    cardGrid.className = "add-widget-grid is-grouped";

    function getAllCards() {
      return Array.from(cardGrid.querySelectorAll(".add-widget-card"));
    }

    /* Returns all Tab-reachable elements inside the modal in DOM order */
    function getModalFocusables() {
      return Array.from(panel.querySelectorAll(
        'input:not([disabled]), button:not([disabled]), [tabindex="0"]'
      )).filter(function (el) { return el.offsetParent !== null && el.tabIndex >= 0; });
    }

    function focusCard(idx) {
      var cards = getAllCards();
      cards.forEach(function (c) { c.classList.remove("add-widget-card-focus"); });
      if (idx < 0 || idx >= cards.length) { focusedCardIndex = -1; return; }
      focusedCardIndex = idx;
      cards[idx].classList.add("add-widget-card-focus");
      cards[idx].focus({ preventScroll: true });
      cards[idx].scrollIntoView({ block: "nearest" });
    }

    function makeCard(p) {
      var card = document.createElement("button");
      card.className = "add-widget-card";
      card.type = "button";
      card.tabIndex = 0;
      var icon = p.icon || "plus";
      var iconHtml = /^https?:\/\//.test(icon)
        ? '<img src="' + Hub.escapeHtml(icon) + '" class="add-widget-icon-img" width="14" height="14" alt="">'
        : (Hub.icons[icon] || Hub.icons.plus);
      card.innerHTML = iconHtml + "<span>" + Hub.escapeHtml(p.label) + "</span>";
      card.addEventListener("click", function () {
        var config = p.defaultConfig();
        var minSize = Hub.registry.getMinSize ? Hub.registry.getMinSize(p.type, config) : null;
        var width = Math.max(4, minSize ? minSize.cols : 1);
        var height = Math.max(1, minSize ? minSize.rows : 1);
        var slot = findFirstAvailableSlot(editClone, width, height);
        var newWidget = {
          id: Hub.uid(),
          type: p.type,
          col: slot.col,
          row: slot.row,
          width: width,
          height: height,
          minWidth: minSize ? minSize.cols : 1,
          minHeight: minSize ? minSize.rows : 1,
          config: config
        };
        editClone.push(newWidget);
        close();
        if (onAdded) onAdded(newWidget, { openConfig: !!p.renderEditor });
      });
      return card;
    }

    function renderCards(filter) {
      cardGrid.replaceChildren();
      focusedCardIndex = -1;
      var filt = (filter || "").toLowerCase().trim();

      var visible = addable.filter(function (p) {
        var catName = getCategoryName(p.type);
        return !filt || p.label.toLowerCase().includes(filt) || catName.toLowerCase().includes(filt);
      });

      var grouped = {};
      visible.forEach(function (p) {
        var cat = getCategoryName(p.type);
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(p);
      });
      WIDGET_CATEGORIES.forEach(function (cat) {
        if (!grouped[cat.name]) return;
        var lbl = document.createElement("div");
        lbl.className = "add-widget-cat-label";
        lbl.textContent = cat.name;
        cardGrid.appendChild(lbl);
        var grp = document.createElement("div");
        grp.className = "add-widget-group";
        grouped[cat.name].forEach(function (p) { grp.appendChild(makeCard(p)); });
        cardGrid.appendChild(grp);
      });
      if (grouped["Other"]) {
        var otherLbl = document.createElement("div");
        otherLbl.className = "add-widget-cat-label";
        otherLbl.textContent = "Other";
        cardGrid.appendChild(otherLbl);
        var otherGrp = document.createElement("div");
        otherGrp.className = "add-widget-group";
        grouped["Other"].forEach(function (p) { otherGrp.appendChild(makeCard(p)); });
        cardGrid.appendChild(otherGrp);
      }
    }

    /* Keep focusedCardIndex in sync when Tab moves focus into a card */
    cardGrid.addEventListener("focusin", function (e) {
      var cards = getAllCards();
      var idx = cards.indexOf(e.target);
      if (idx === -1) return;
      cards.forEach(function (c) { c.classList.remove("add-widget-card-focus"); });
      focusedCardIndex = idx;
      cards[idx].classList.add("add-widget-card-focus");
    });

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

    function navigateCards(dir) {
      var cards = getAllCards();
      if (!cards.length) return;
      if (focusedCardIndex < 0) { focusCard(0); return; }
      var cur = cards[focusedCardIndex];
      if (!cur) { focusCard(0); return; }
      var result = Hub.keyboard.spatialMove(cards, cur, dir);
      if (result) focusCard(cards.indexOf(result));
    }

    var MODAL_DIR_MAP = {
      h: "left", l: "right", j: "down", k: "up",
      ArrowLeft: "left", ArrowRight: "right", ArrowDown: "down", ArrowUp: "up"
    };

    function onModalKey(e) {
      var key = e.key;
      var inSearch = document.activeElement === searchInput;

      /* Trap Tab within modal — prevent escaping to browser chrome */
      if (key === "Tab") {
        var focusables = getModalFocusables();
        if (!focusables.length) { e.preventDefault(); return; }
        var first = focusables[0];
        var last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault(); last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault(); first.focus();
        }
        /* Otherwise let the browser handle Tab naturally */
        return;
      }

      if (key === "Escape") {
        e.preventDefault();
        if (inSearch) {
          /* ESC from search → move focus to cards (normal mode) */
          var cards = getAllCards();
          if (cards.length) focusCard(focusedCardIndex >= 0 && focusedCardIndex < cards.length ? focusedCardIndex : 0);
        } else {
          close();
        }
        return;
      }

      /* hjkl / arrows — only when a card (not the search input) is focused */
      if (!inSearch && MODAL_DIR_MAP[key]) {
        e.preventDefault();
        navigateCards(MODAL_DIR_MAP[key]);
        return;
      }

      /* ArrowDown from search → jump to first card */
      if (inSearch && key === "ArrowDown") {
        e.preventDefault();
        var cards = getAllCards();
        if (cards.length) focusCard(focusedCardIndex >= 0 ? focusedCardIndex : 0);
        return;
      }

      /* Enter from search with single result → select it */
      if (inSearch && key === "Enter") {
        var iCards = getAllCards();
        if (iCards.length === 1) { e.preventDefault(); iCards[0].click(); }
        return;
      }

      /* Printable char while a card is focused → redirect to search */
      if (!inSearch && key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
        searchInput.focus();
        return;
      }
    }

    document.addEventListener("keydown", onModalKey);
  }

  /* ── Edit mode keyboard controls ── */

  function scrollToRevealBottom(el) {
    var rect = el.getBoundingClientRect();
    var overflow = rect.bottom + 32 - window.innerHeight;
    if (overflow > 0) window.scrollBy({ top: overflow, behavior: "instant" });
  }

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
      /* Reset sidebar when navigating to a different widget */
      if (configSidebar && configSidebar.classList.contains("is-open") &&
          el.dataset.widgetId !== configSidebarWidgetId) {
        showConfigSidebarEmpty();
      }
    } else if (configSidebar && configSidebar.classList.contains("is-open")) {
      showConfigSidebarEmpty();
    }
  }

  function pulseAddedWidget(el) {
    if (!el) return;
    el.classList.remove("widget-added-highlight");
    if (el._addedHighlightTimer) clearTimeout(el._addedHighlightTimer);
    void el.offsetWidth;
    el.classList.add("widget-added-highlight");
    el._addedHighlightTimer = setTimeout(function () {
      el.classList.remove("widget-added-highlight");
      el._addedHighlightTimer = null;
    }, 1800);
  }

  function openFocusedWidgetConfig(widgetEl, options) {
    if (!widgetEl) return;
    setEditFocus(widgetEl);
    if (widgetEl.dataset.widgetId) openConfigModal(widgetEl.dataset.widgetId, null, options);
  }

  function beginWidgetDrag(widgetEl, e) {
    if (!widgetEl || !e) return;
    e.preventDefault();
    e.stopPropagation();
    setEditFocus(widgetEl);
    setEditGrab(false);
    dragWidget = {
      el: widgetEl,
      startX: e.clientX,
      startY: e.clientY,
      origCol: parseInt(widgetEl.dataset.gridCol),
      origRow: parseInt(widgetEl.dataset.gridRow)
    };
  }

  function handleEditKey(e) {
    var gridEl = document.getElementById("dashboard-grid");
    if (!gridEl || !editing) return false;
    /* Don't steal keys when focus is inside the config sidebar (EditorKeyboard owns them) */
    if (configSidebar && configSidebar.contains(document.activeElement)) return false;

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
    if (/^[a-z0-9]$/.test(key) && !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey && !EDIT_ACTION_KEYS[key]) {
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
      /* Config form is open — block grid navigation even if focus wandered outside sidebar */
      if (configSidebarWidgetId !== null) { e.preventDefault(); return true; }
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

    /* Cmd+C: copy focused widget to clipboard */
    if (e.metaKey && key === 'c' && !e.shiftKey && !e.altKey && editFocusedWidget) {
      e.preventDefault();
      var srcId = editFocusedWidget.dataset.widgetId;
      var src = editClone.find(function (ww) { return ww.id === srcId; });
      if (src) {
        editClipboard = {
          _srcId: src.id,
          type: src.type,
          width: src.width,
          height: src.height,
          minWidth: src.minWidth,
          minHeight: src.minHeight,
          config: JSON.parse(JSON.stringify(src.config || {})),
          cardColor: src.cardColor ? Object.assign({}, src.cardColor) : undefined
        };
      }
      return true;
    }

    /* Cmd+V: paste copied widget */
    if (e.metaKey && key === 'v' && !e.shiftKey && !e.altKey && editClipboard) {
      e.preventDefault();
      pasteWidget();
      return true;
    }

    if (!editFocusedWidget) return false;

    var w = editFocusedWidget;

    /* Enter / C: open config for focused widget and move focus into sidebar form */
    if ((key === "Enter" || key === "c") && !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey) {
      e.preventDefault();
      openFocusedWidgetConfig(w);
      return true;
    }

    /* Space: toggle grab on focused widget */
    if (key === " " && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      setEditGrab(!editGrabbed);
      return true;
    }

    var col = parseInt(w.dataset.gridCol);
    var row = parseInt(w.dataset.gridRow);
    var width = parseInt(w.dataset.gridWidth);
    var height = parseInt(w.dataset.gridHeight);
    var minWidth = parseInt(w.dataset.gridMinWidth) || 1;
    var minHeight = parseInt(w.dataset.gridMinHeight) || 1;

    /* Arrow keys: move widget (or resize with Shift) */
    if (key === "ArrowRight" || key === "ArrowLeft" || key === "ArrowDown" || key === "ArrowUp") {
      e.preventDefault();

      if (shiftKey) {
        /* Resize */
        if (key === "ArrowRight") width = Math.min(COLS - col + 1, width + 1);
        else if (key === "ArrowLeft") width = Math.max(minWidth, width - 1);
        else if (key === "ArrowDown") height = height + 1;
        else if (key === "ArrowUp") height = Math.max(minHeight, height - 1);

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
        if (layout.some(function (it) { return it.widget === w.dataset.gridWidget; })) {
          syncLayoutToDOM(resolveLayoutChange(layout, {
            widget: w.dataset.gridWidget,
            col: col,
            row: row,
            width: width,
            height: height,
            minWidth: minWidth,
            minHeight: minHeight
          }));
        } else {
          w.style.gridColumn = col + " / span " + width;
          w.style.gridRow = row + " / span " + height;
        }
        scrollToRevealBottom(w);
      return true;
    }

    /* R: open raw JSON editor for focused widget */
    if (key === "r" && !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey) {
      e.preventDefault();
      openFocusedWidgetConfig(w, { raw: true });
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

  function enterEditMode(gridEl, layout, onSave, onCancel, onAdded, onConfigSave, focusWidgetId) {
    editing = true;
    editFocusedWidget = null;
    onAddedFn = onAdded;
    editOnConfigSave = onConfigSave || null;
    gridEl.classList.add("grid-editing");

    showEditBar(onSave, onCancel, gridEl, onAdded);

    gridEl.querySelectorAll('[data-search-input="true"]').forEach(function (input) {
      input.disabled = true;
      input.tabIndex = -1;
    });

    gridEl.querySelectorAll(".widget").forEach(function (w) {
      w.classList.add("widget-editable");

      /* Edit controls bar */
      var controls = document.createElement("div");
      controls.className = "widget-edit-controls";

      var leftGroup = document.createElement("div");
      leftGroup.className = "widget-edit-left";

      var rightGroup = document.createElement("div");
      rightGroup.className = "widget-edit-right";

      var gearBtn = document.createElement("button");
      gearBtn.className = "widget-edit-btn is-gear";
      gearBtn.innerHTML = Hub.icons.settings;
      gearBtn.title = "Configure";

      var copyBtn = document.createElement("button");
      copyBtn.className = "widget-edit-btn is-copy";
      copyBtn.innerHTML = Hub.icons.copy;
      copyBtn.title = "Copy (⌘C)";

      var trashBtn = document.createElement("button");
      trashBtn.className = "widget-edit-btn is-trash";
      trashBtn.innerHTML = Hub.icons.trash2;
      trashBtn.title = "Remove";

      rightGroup.appendChild(gearBtn);
      rightGroup.appendChild(copyBtn);
      rightGroup.appendChild(trashBtn);
      controls.appendChild(leftGroup);
      controls.appendChild(rightGroup);
      w.prepend(controls);

      var resizeHandle = document.createElement("div");
      resizeHandle.className = "widget-resize-handle";
      resizeHandle.innerHTML = Hub.icons.arrowDownRight;
      resizeHandle.title = "Drag to resize";
      w.appendChild(resizeHandle);

      resizeHandle.addEventListener("mousedown", function (e) {
        e.preventDefault();
        e.stopPropagation();
        resizeWidget = {
          el: w,
          startX: e.clientX,
          startY: e.clientY,
          origWidth: parseInt(w.dataset.gridWidth),
          origHeight: parseInt(w.dataset.gridHeight),
          minWidth: parseInt(w.dataset.gridMinWidth) || 1,
          minHeight: parseInt(w.dataset.gridMinHeight) || 1
        };
      });

      gearBtn.addEventListener("click", function () {
        openFocusedWidgetConfig(w);
      });

      copyBtn.addEventListener("click", function () {
        var src = editClone.find(function (ww) { return ww.id === w.dataset.widgetId; });
        if (!src) return;
        editClipboard = {
          _srcId: src.id,
          type: src.type,
          width: src.width,
          height: src.height,
          minWidth: src.minWidth,
          minHeight: src.minHeight,
          config: JSON.parse(JSON.stringify(src.config || {})),
          cardColor: src.cardColor ? Object.assign({}, src.cardColor) : undefined
        };
        pasteWidget();
      });

      trashBtn.addEventListener("click", function () { removeWidget(w.dataset.widgetId, gridEl); });

      w.addEventListener("mousedown", function (e) {
        if (e.target.closest(".widget-edit-controls, .widget-resize-handle")) return;
        beginWidgetDrag(w, e);
      });

      /* Clicking anywhere on the widget card selects it */
      w.addEventListener("click", function (e) {
        if (e.target.closest(".widget-edit-controls, .widget-resize-handle")) return;
        e.preventDefault();
        setEditFocus(w);
      });

      w.addEventListener("dblclick", function (e) {
        if (e.target.closest(".widget-edit-controls, .widget-resize-handle")) return;
        e.preventDefault();
        openFocusedWidgetConfig(w);
      });
    });

    /* Build chord map and stamp key badges onto each widget's drag handle */
    buildEditChordMap(gridEl);
    getEditableWidgets(gridEl).forEach(function (el) {
      var key = el.dataset.editChordKey;
      if (!key) return;
      var controls = el.querySelector(".widget-edit-controls");
      if (!controls) return;
      var badge = document.createElement("span");
      badge.className = "chord-key-badge edit-chord-badge";
      badge.textContent = key.toUpperCase();
      controls.appendChild(badge);
    });

    /* Open sidebar; if a widget is focused it will auto-render via setEditFocus */
    showConfigSidebarEmpty();

    if (focusWidgetId) {
      var focused = gridEl.querySelector('[data-widget-id="' + focusWidgetId + '"]');
      if (focused) {
        setEditFocus(focused);
        pulseAddedWidget(focused);
        scrollToRevealBottom(focused, 32);
      }
    }

    function onMouseMove(e) {
      var gridRect = gridEl.getBoundingClientRect();
      var cellW = gridRect.width / COLS;
      var rowH = ROW_HEIGHT;

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
        if (layout.some(function (it) { return it.widget === dragWidget.el.dataset.gridWidget; })) {
          syncLayoutToDOM(resolveLayoutChange(layout, {
            widget: dragWidget.el.dataset.gridWidget,
            col: newCol,
            row: newRow,
            width: w,
            height: h
          }));
        }
      }

      if (resizeWidget) {
        var rdx = e.clientX - resizeWidget.startX;
        var rdy = e.clientY - resizeWidget.startY;
        var col = parseInt(resizeWidget.el.dataset.gridCol);
        var row = parseInt(resizeWidget.el.dataset.gridRow);
        var newW = Math.max(resizeWidget.minWidth, Math.min(COLS - col + 1, resizeWidget.origWidth + Math.round(rdx / cellW)));
        var newH = Math.max(resizeWidget.minHeight, resizeWidget.origHeight + Math.round(rdy / rowH));

        /* Update the resized widget */
        resizeWidget.el.dataset.gridWidth = newW;
        resizeWidget.el.dataset.gridHeight = newH;

        /* Build layout, resolve collisions, compact (pin resized widget) */
        var layout = buildLayoutFromGrid(gridEl);
        if (layout.some(function (it) { return it.widget === resizeWidget.el.dataset.gridWidget; })) {
          syncLayoutToDOM(resolveLayoutChange(layout, {
            widget: resizeWidget.el.dataset.gridWidget,
            col: col,
            row: row,
            width: newW,
            height: newH,
            minWidth: resizeWidget.minWidth,
            minHeight: resizeWidget.minHeight
          }));
          scrollToRevealBottom(resizeWidget.el);
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
      if (e.key !== "Escape" || document.querySelector(".modal-overlay")) return;
      if (configSidebar && configSidebar.classList.contains("is-open") && configSidebar.contains(document.activeElement)) {
        /* If a form field or custom-select button currently has focus, let EditorKeyboard
           handle Escape first (insert → normal mode). This listener fires before
           EditorKeyboard because it was registered earlier — bail so the form isn't
           closed while the user is still interacting with a field. */
        var active = document.activeElement;
        if (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.tagName === "SELECT" ||
            (active.tagName === "BUTTON" && ("customSelect" in active.dataset || "customPicker" in active.dataset))) return;
        /* Panel (normal mode) has focus → collapse back to empty state */
        showConfigSidebarEmpty();
        if (editFocusedWidget) editFocusedWidget.focus();
        return;
      }
      if (onCancel) onCancel();
    }
    document.addEventListener("keydown", onEditEscape);

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);

    return function exitEditMode() {
      document.removeEventListener("keydown", onEditEscape);
      if (configSidebar) {
        if (configSidebar._cleanup) { configSidebar._cleanup(); configSidebar._cleanup = null; }
        configSidebar.classList.remove("is-open");
        document.body.classList.remove("config-sidebar-open");
      }
      editing = false;
      editGrabbed = false;
      setEditFocus(null);
      gridEl.classList.remove("grid-editing");
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      hideEditBar();
      gridEl.querySelectorAll(".widget-edit-controls, .widget-resize-handle").forEach(function (h) { h.remove(); });
      gridEl.querySelectorAll(".widget-editable").forEach(function (w) { w.classList.remove("widget-editable"); });
      gridEl.querySelectorAll('[data-search-input="true"]').forEach(function (input) {
        input.disabled = false;
        input.tabIndex = 0;
      });
      editClone = null;
      onAddedFn = null;
      editOnConfigSave = null;
      configSidebarWidgetId = null;
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
        height: parseInt(w.dataset.gridHeight) || 1,
        minWidth: parseInt(w.dataset.gridMinWidth) || 1,
        minHeight: parseInt(w.dataset.gridMinHeight) || 1
      });
    });
    return layout;
  }

  /* ── Shared credential section renderer ──
     Used by openConfigModal and by widgets that embed child editors (e.g. group tabs).
     container   – DOM element to append the section into
     plugin      – the widget plugin object (must have credentialFields)
     widgetId    – the ID used to store/load credentials
     isCancelled – optional function() → bool; if truthy result, the async append is a no-op
     onReady     – optional callback fired after the section is appended (use to trigger rescan)
  ── */
  function renderCredentialSection(container, plugin, widgetId, isCancelled, onReady) {
    if (!plugin.credentialFields || !plugin.credentialFields.length) return;
    Hub.credentials.load(widgetId).then(function (savedCreds) {
      if (isCancelled && isCancelled()) return;
      var section = document.createElement("div");
      section.className = "widget-editor-credentials";

      var hdr = document.createElement("div");
      hdr.className = "widget-editor-credentials-header";
      hdr.textContent = "Credentials";
      section.appendChild(hdr);

      plugin.credentialFields.forEach(function (field) {
        var row = document.createElement("div");
        row.className = "widget-editor-credentials-row";

        var lbl = document.createElement("label");
        lbl.textContent = field.label;

        var wrap = document.createElement("div");
        wrap.className = "widget-editor-credentials-input-wrap";

        var input = document.createElement("input");
        input.type = "password";
        input.placeholder = field.placeholder || "";
        input.autocomplete = "off";
        if (savedCreds[field.key]) input.value = savedCreds[field.key];

        var toggle = document.createElement("button");
        toggle.type = "button";
        toggle.className = "widget-editor-credentials-toggle";
        toggle.textContent = "Show";
        toggle.addEventListener("click", function () {
          var isHidden = input.type === "password";
          input.type = isHidden ? "text" : "password";
          toggle.textContent = isHidden ? "Hide" : "Show";
        });

        input.addEventListener("blur", function () {
          if (input.value !== "") {
            Hub.credentials.save(widgetId, { [field.key]: input.value });
          }
        });

        wrap.appendChild(input);
        wrap.appendChild(toggle);
        row.appendChild(lbl);
        row.appendChild(wrap);
        section.appendChild(row);
      });

      var clearBtn = document.createElement("button");
      clearBtn.type = "button";
      clearBtn.className = "widget-editor-credentials-clear";
      clearBtn.textContent = "Remove credentials";
      clearBtn.addEventListener("click", function () {
        Hub.credentials.clear(widgetId);
        section.querySelectorAll("input").forEach(function (i) { i.value = ""; });
      });
      section.appendChild(clearBtn);

      container.appendChild(section);
      if (onReady) onReady();
    });
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
    handleEditKey: handleEditKey,
    resolveLayoutChange: resolveLayoutChange,
    formatConfigJSON: formatConfigJSON,
    parseConfigJSON: parseConfigJSON,
    rawFindInnerWordRange: rawFindInnerWordRange,
    rawMoveWordBackward: rawMoveWordBackward,
    rawMoveWordForward: rawMoveWordForward,
    rawMoveWordEnd: rawMoveWordEnd,
    rawMoveParagraphForward: rawJsonEditor.rawMoveParagraphForward,
    rawMoveParagraphBackward: rawJsonEditor.rawMoveParagraphBackward,
    rawFindMatchingBracket: rawFindMatchingBracket,
    rawDeleteCurrentLine: rawDeleteCurrentLine,
    rawPasteLine: rawPasteLine,
    renderCredentialSection: renderCredentialSection
  };
})();
