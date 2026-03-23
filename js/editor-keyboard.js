/* ── EditorKeyboard: vim-inspired keyboard navigation for widget config modals ── */

window.EditorKeyboard = function EditorKeyboard(panel) {
  this.panel = panel;
  this.mode = "flat";        // "list" | "item" | "flat"
  this.activeItemIndex = -1;
  this.activeFieldIndex = -1;
  this.items = [];           // [data-nav-item] elements
  this.headerFields = [];    // [data-nav-header-field] elements
  this._handler = this._onKey.bind(this);
};

EditorKeyboard.prototype.attach = function () {
  this.rescan();
  document.addEventListener("keydown", this._handler);
};

EditorKeyboard.prototype.detach = function () {
  document.removeEventListener("keydown", this._handler);
  this._clearHints();
};

EditorKeyboard.prototype.rescan = function () {
  var panel = this.panel;
  this.headerFields = Array.from(panel.querySelectorAll("[data-nav-header-field]"));
  this.items = Array.from(panel.querySelectorAll("[data-nav-item]"));

  // Determine mode
  if (this.items.length > 0) {
    this.mode = "list";
    // Restore focus to clamped index after a rebuild
    if (this.activeItemIndex >= 0) {
      this.activeItemIndex = Math.min(this.activeItemIndex, this.items.length - 1);
      this._focusItem(this.activeItemIndex);
    } else {
      // First open: focus first header field if present, else first item
      if (this.headerFields.length > 0) {
        this.headerFields[0].focus();
      } else {
        this.activeItemIndex = 0;
        this._focusItem(0);
      }
    }
  } else {
    this.mode = "flat";
    // Focus first nav field or first input in panel
    var firstField = panel.querySelector("[data-nav-header-field], [data-nav-field], input, select, textarea");
    if (firstField) firstField.focus();
  }
};

EditorKeyboard.prototype._focusItem = function (index) {
  var items = this.items;
  if (!items.length) return;
  // Remove focused class from all items
  items.forEach(function (el) { el.classList.remove("editor-nav-focused"); });
  var item = items[index];
  item.classList.add("editor-nav-focused");
  item.focus();
  item.scrollIntoView({ block: "nearest" });
  this._renderHints(item, "list");
};

EditorKeyboard.prototype._enterItemMode = function () {
  var item = this.items[this.activeItemIndex];
  if (!item) return;
  var fields = Array.from(item.querySelectorAll("[data-nav-field]"));
  if (!fields.length) return;
  this.mode = "item";
  this.activeFieldIndex = 0;
  this._renderHints(item, "item");
  fields[0].focus();
};

EditorKeyboard.prototype._exitItemMode = function () {
  this.mode = "list";
  this.activeFieldIndex = -1;
  this._focusItem(this.activeItemIndex);
};

EditorKeyboard.prototype._renderHints = function (item, mode) {
  this._clearHints();
  var hintsEl = document.createElement("div");
  hintsEl.className = "editor-nav-hints";

  var hints = mode === "list"
    ? ["↑↓ navigate", "↵ edit", "⇧↑↓ reorder", "⌫ delete", "n add"]
    : ["Tab fields", "Esc back"];

  hints.forEach(function (text) {
    var span = document.createElement("span");
    span.className = "editor-nav-hint";
    span.textContent = text;
    hintsEl.appendChild(span);
  });

  item.appendChild(hintsEl);
};

EditorKeyboard.prototype._clearHints = function () {
  this.panel.querySelectorAll(".editor-nav-hints").forEach(function (el) { el.remove(); });
};

EditorKeyboard.prototype._getSaveBtn = function () {
  return this.panel.querySelector("[data-nav-save]");
};

EditorKeyboard.prototype._getAddBtn = function () {
  return this.panel.querySelector("[data-nav-add]");
};

EditorKeyboard.prototype._isTyping = function () {
  var tag = document.activeElement && document.activeElement.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
};

EditorKeyboard.prototype._onKey = function (e) {
  var meta = e.metaKey || e.ctrlKey;

  // ⌘Enter: save and close from any mode
  if (e.key === "Enter" && meta) {
    e.preventDefault();
    var saveBtn = this._getSaveBtn();
    if (saveBtn) saveBtn.click();
    return;
  }

  // FLAT mode: only handle ⌘Enter (above) and Tab cycle
  if (this.mode === "flat") {
    this._handleFlatTab(e);
    return;
  }

  // ITEM mode
  if (this.mode === "item") {
    if (e.key === "Escape") {
      e.preventDefault();
      this._exitItemMode();
      return;
    }
    if (e.key === "Tab") {
      this._handleItemTab(e);
      return;
    }
    // All other keys fall through to normal input handling
    return;
  }

  // LIST mode — only act when focus is not in a text input
  if (this.mode === "list") {
    // If user has focused a header field, let Tab/Enter work naturally
    if (this._isHeaderFieldActive()) {
      if (e.key === "Tab" && !e.shiftKey) {
        // Tab from last header field → first item
        var headerFields = this.headerFields;
        if (document.activeElement === headerFields[headerFields.length - 1]) {
          e.preventDefault();
          if (this.items.length) {
            this.activeItemIndex = 0;
            this._focusItem(0);
          }
        }
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        if (this.items.length) {
          this.activeItemIndex = 0;
          this._focusItem(0);
        }
        return;
      }
      return;
    }

    // Esc with no focused item → close (let grid.js close button handle it)
    if (e.key === "Escape") {
      if (this.activeItemIndex < 0) return; // let bubble to overlay click handler
      e.preventDefault();
      // Defocus the item and clear focus
      this.items.forEach(function (el) { el.classList.remove("editor-nav-focused"); });
      this._clearHints();
      this.activeItemIndex = -1;
      return;
    }

    // Arrow down / j  (plain only — Shift+ArrowDown is reorder, handled below)
    if ((e.key === "ArrowDown" || e.key === "j") && !e.shiftKey && !this._isTyping()) {
      e.preventDefault();
      if (this.items.length === 0) return;
      if (this.activeItemIndex < 0) this.activeItemIndex = 0;
      else this.activeItemIndex = Math.min(this.activeItemIndex + 1, this.items.length - 1);
      this._focusItem(this.activeItemIndex);
      return;
    }

    // Arrow up / k  (plain only — Shift+ArrowUp is reorder, handled below)
    if ((e.key === "ArrowUp" || e.key === "k") && !e.shiftKey && !this._isTyping()) {
      e.preventDefault();
      if (this.items.length === 0) return;
      if (this.activeItemIndex <= 0) {
        // Wrap up to last header field if present
        if (this.headerFields.length) {
          this.items.forEach(function (el) { el.classList.remove("editor-nav-focused"); });
          this._clearHints();
          this.activeItemIndex = -1;
          this.headerFields[this.headerFields.length - 1].focus();
          return;
        }
        this.activeItemIndex = 0;
      } else {
        this.activeItemIndex = this.activeItemIndex - 1;
      }
      this._focusItem(this.activeItemIndex);
      return;
    }

    // Enter / i → enter item mode
    if ((e.key === "Enter" || e.key === "i") && !this._isTyping()) {
      if (this.activeItemIndex < 0) return;
      e.preventDefault();
      this._enterItemMode();
      return;
    }

    // Shift+ArrowUp → reorder up
    if (e.key === "ArrowUp" && e.shiftKey && !this._isTyping()) {
      e.preventDefault();
      this._reorder(-1);
      return;
    }

    // Shift+ArrowDown → reorder down
    if (e.key === "ArrowDown" && e.shiftKey && !this._isTyping()) {
      e.preventDefault();
      this._reorder(1);
      return;
    }

    // Backspace / x → delete
    if ((e.key === "Backspace" || e.key === "x") && !this._isTyping()) {
      if (this.activeItemIndex < 0) return;
      e.preventDefault();
      var removeBtn = this.items[this.activeItemIndex].querySelector(".editor-remove");
      if (removeBtn) removeBtn.click();
      return;
    }

    // n → add new
    if (e.key === "n" && !this._isTyping()) {
      e.preventDefault();
      var addBtn = this._getAddBtn();
      if (addBtn) addBtn.click();
      return;
    }

    // Tab → shift focus to header fields or trap within panel
    if (e.key === "Tab" && e.shiftKey && this.activeItemIndex === 0) {
      if (this.headerFields.length) {
        e.preventDefault();
        this.items.forEach(function (el) { el.classList.remove("editor-nav-focused"); });
        this._clearHints();
        this.activeItemIndex = -1;
        this.headerFields[this.headerFields.length - 1].focus();
      }
      return;
    }
  }
};

EditorKeyboard.prototype._isHeaderFieldActive = function () {
  var active = document.activeElement;
  return this.headerFields.indexOf(active) !== -1;
};

EditorKeyboard.prototype._handleItemTab = function (e) {
  var item = this.items[this.activeItemIndex];
  if (!item) return;
  var fields = Array.from(item.querySelectorAll("[data-nav-field]"));
  if (!fields.length) return;
  var idx = fields.indexOf(document.activeElement);
  if (e.shiftKey) {
    if (idx <= 0) {
      // Shift+Tab on first field → back to list mode
      e.preventDefault();
      this._exitItemMode();
    }
    // else let browser handle natural Shift+Tab within card
  } else {
    if (idx >= fields.length - 1) {
      // Tab on last field → back to list mode
      e.preventDefault();
      this._exitItemMode();
    }
    // else let browser handle natural Tab within card
  }
};

EditorKeyboard.prototype._handleFlatTab = function (e) {
  var panel = this.panel;
  var focusable = Array.from(panel.querySelectorAll(
    "[data-nav-header-field], [data-nav-field], button[data-nav-save], button[data-nav-add]"
  )).filter(function (el) { return el.offsetParent !== null; });
  if (!focusable.length) return;
  var idx = focusable.indexOf(document.activeElement);
  if (e.shiftKey && idx === 0) {
    e.preventDefault();
    focusable[focusable.length - 1].focus();
  } else if (!e.shiftKey && idx === focusable.length - 1) {
    e.preventDefault();
    focusable[0].focus();
  }
};

EditorKeyboard.prototype._reorder = function (direction) {
  var idx = this.activeItemIndex;
  var items = this.items;
  var newIdx = idx + direction;
  if (newIdx < 0 || newIdx >= items.length) return;

  var listWrap = this.panel.querySelector("[data-nav-list]");
  if (!listWrap) return;

  // Fire a custom "navreorder" event that buildListEditor listens for
  listWrap.dispatchEvent(new CustomEvent("navreorder", {
    bubbles: false,
    detail: { fromIndex: idx, toIndex: newIdx }
  }));

  // After rebuild (via onRebuild callback), rescan will restore focus
  this.activeItemIndex = newIdx;
};
