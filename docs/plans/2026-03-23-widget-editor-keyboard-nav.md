# Widget Editor Keyboard Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add vim-inspired two-mode keyboard navigation to all widget config modals, so power users never need the mouse.

**Architecture:** A new `EditorKeyboard` class (js/editor-keyboard.js) attaches to every config modal when it opens, reads `data-nav-*` attributes from the DOM, manages List Mode ↔ Item Mode state, and injects inline key hint badges. The existing `buildListEditor` utility in `pinned.js` gets the attributes stamped onto its output once, giving all list-based widgets (links, pinned, markets, feeds) full navigation for free. `grid.js`'s old `onConfigKey` handler is removed and replaced entirely by `EditorKeyboard`.

**Tech Stack:** Vanilla JS (ES5-compatible), no build step, browser extension (Chrome MV3)

---

## File Map

| Action | File | What changes |
|--------|------|-------------|
| Modify | `styles.css` | Add `.editor-nav-focused`, `.editor-nav-hints`, `.editor-nav-hint` |
| Modify | `js/widgets/pinned.js` | Add `data-nav-*` attributes to `buildListEditor` output; accept `navOptions` 7th param; call `onRebuild` after each rebuild |
| Modify | `js/widgets/links.js` | Accept `navOptions` 4th param in `renderEditor`; forward to `buildListEditor`; add `data-nav-header-field` on title input |
| Modify | `js/widgets/markets.js` | Same as links.js |
| Modify | `js/widgets/feeds.js` | Same as links.js |
| Create | `js/editor-keyboard.js` | `EditorKeyboard` class — all navigation logic |
| Modify | `js/grid.js` | Remove `onConfigKey`; instantiate `EditorKeyboard`; wire `data-nav-save` |
| Modify | `index.html` | Add `<script src="js/editor-keyboard.js">` before `grid.js` |

---

## Task 1: Add CSS

**Files:**
- Modify: `styles.css` (append near end, after existing `.editor-*` rules)

- [ ] **Step 1: Locate the insertion point**

Search `styles.css` for `.editor-card` to find the cluster of editor styles.

- [ ] **Step 2: Append the new rules**

Add after the existing `.editor-card` block:

```css
/* ── Editor keyboard navigation ── */
.editor-card[data-nav-item].editor-nav-focused {
  outline: 2px solid rgba(121, 174, 232, 0.5);
  outline-offset: 2px;
  border-radius: var(--radius-md);
}

.editor-nav-hints {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  padding: 4px 0 2px;
}

.editor-nav-hint {
  background: var(--surface-hover);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 1px 6px;
  font-size: 0.7rem;
  font-family: monospace;
  color: var(--muted-strong);
  user-select: none;
}
```

- [ ] **Step 3: Commit**

```bash
git add styles.css
git commit -m "style: add editor keyboard navigation focus ring and hint badges"
```

---

## Task 2: Stamp `data-nav-*` attributes on `buildListEditor`

**Files:**
- Modify: `js/widgets/pinned.js:59-162`

`buildListEditor` signature is currently:
```js
function buildListEditor(container, config, listKey, onChange, fields, emptyItem)
```

It will become:
```js
function buildListEditor(container, config, listKey, onChange, fields, emptyItem, navOptions)
```

where `navOptions` is an optional object `{ onRebuild }`.

- [ ] **Step 1: Update the function signature and add `data-nav-list` / `data-nav-add`**

In `pinned.js`, change the function signature line (line 59) and the `addBtn` and `listWrap` creation:

```js
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
```

- [ ] **Step 2: Add `data-nav-item` to each card and `data-nav-field` to each input**

In the `items.forEach` block, after `card.className = "editor-card";`:

```js
card.dataset.navItem = "";                                 // ← NEW
```

After `card.innerHTML = ...` (line ~116), **replace** the existing `querySelectorAll("[data-field]")` loop at line ~153 (which currently only wires the `input` event listener) with this merged version that also stamps `data-nav-field`:

```js
card.querySelectorAll("[data-field]").forEach(function (inp) {
  inp.dataset.navField = "";                               // ← NEW
  inp.addEventListener("input", function (e) {
    item[e.target.dataset.field] = e.target.value;
    onChange(config);
  });
});
```

Do not add a second loop — replace the existing one.

- [ ] **Step 3: Forward `navOptions` in all recursive `buildListEditor` calls**

There are three internal recursive calls (click Add, drop reorder, click remove). Each becomes:

```js
buildListEditor(container, config, listKey, onChange, fields, emptyItem, navOptions);
```

(Replace the three existing calls that omit `navOptions`.)

- [ ] **Step 4: Open the extension in the browser and verify**

Load the extension. Open any widget's config (Edit mode → G or click gear). Open browser DevTools console and run:

```js
document.querySelector('[data-nav-list]')   // should not be null
document.querySelector('[data-nav-item]')   // should not be null
document.querySelector('[data-nav-field]')  // should not be null
document.querySelector('[data-nav-add]')    // should not be null
```

All four should return elements, not `null`.

- [ ] **Step 5: Commit**

```bash
git add js/widgets/pinned.js
git commit -m "feat(editor-nav): stamp data-nav attributes on buildListEditor"
```

---

## Task 3: Update widget `renderEditor` functions

**Files:**
- Modify: `js/widgets/links.js:47-69`
- Modify: `js/widgets/markets.js:64-89`
- Modify: `js/widgets/feeds.js:65-80`

Each of these widgets has a `renderEditor: function(container, config, onChange)`. They need to accept a fourth `navOptions` parameter, mark their title input with `data-nav-header-field`, and forward `navOptions` to `buildListEditor`.

- [ ] **Step 1: Update `links.js`**

Change `renderEditor` from:
```js
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
```

To:
```js
renderEditor: function (container, config, onChange, navOptions) {
  container.replaceChildren();

  /* Title field */
  var titleLabel = document.createElement("label");
  titleLabel.className = "editor-field";
  titleLabel.innerHTML = '<span>Group title</span><input type="text" value="' + Hub.escapeHtml(config.title || "") + '" />';
  var titleInput = titleLabel.querySelector("input");
  titleInput.dataset.navHeaderField = "";                  // ← NEW
  titleInput.addEventListener("input", function (e) {
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
  ], function () { return { title: "", href: "https://", badge: "", healthCheck: "" }; }, navOptions);  // ← navOptions forwarded
},
```

- [ ] **Step 2: Update `markets.js`**

Change `renderEditor: function (container, config, onChange)` to `renderEditor: function (container, config, onChange, navOptions)`.

After `titleLabel.querySelector("input")` is obtained to attach the event listener, also set:
```js
titleLabel.querySelector("input").dataset.navHeaderField = "";   // ← NEW
```

Change the `buildListEditor(...)` call's last argument from `function () { return {...}; }` to:
```js
function () { return { label: "", symbol: "", coinGeckoId: "", href: "https://" }; }, navOptions
```

- [ ] **Step 3: Update `feeds.js`**

Same pattern as markets.js:
- Add `navOptions` fourth parameter to `renderEditor`
- Set `data-nav-header-field` on the title input
- Forward `navOptions` as last arg to `buildListEditor`

Full updated `renderEditor` for feeds.js:
```js
renderEditor: function (container, config, onChange, navOptions) {
  container.replaceChildren();
  var titleLabel = document.createElement("label");
  titleLabel.className = "editor-field";
  titleLabel.innerHTML = '<span>Widget title</span><input type="text" value="' + Hub.escapeHtml(config.title || "Feeds") + '" />';
  var titleInput = titleLabel.querySelector("input");
  titleInput.dataset.navHeaderField = "";                  // ← NEW
  titleInput.addEventListener("input", function (e) { config.title = e.target.value; onChange(config); });
  container.appendChild(titleLabel);

  var itemsWrap = document.createElement("div");
  container.appendChild(itemsWrap);
  buildListEditor(itemsWrap, config, "items", onChange, [
    { key: "title", label: "Title" },
    { key: "url", label: "Feed URL" },
    { key: "site", label: "Site URL" }
  ], function () { return { title: "", url: "https://", site: "https://" }; }, navOptions);  // ← navOptions
},
```

- [ ] **Step 4: Commit**

```bash
git add js/widgets/links.js js/widgets/markets.js js/widgets/feeds.js
git commit -m "feat(editor-nav): add navOptions forwarding and data-nav-header-field to widget editors"
```

---

## Task 4: Create `js/editor-keyboard.js`

**Files:**
- Create: `js/editor-keyboard.js`

This is the core module. It exports nothing globally — it defines the `EditorKeyboard` constructor on `window` for `grid.js` to use.

- [ ] **Step 1: Create the file**

```js
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

  // Find and click the drag source programmatically by swapping data in the DOM
  // The actual data swap is handled by buildListEditor's reorder logic;
  // we trigger it by simulating a drop event sequence via the remove + re-add approach.
  // Instead, the simplest correct approach: find a reorder button if provided,
  // or swap items in config directly. Since buildListEditor uses drag-drop,
  // we re-use the config mutation pattern:
  // Find the parent container, read its navList, and fire a custom event.
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
```

- [ ] **Step 2: Add the `navreorder` event listener to `buildListEditor` in `pinned.js`**

After the `listWrap` is created and before items are rendered, add the listener. Because `buildListEditor` calls `container.replaceChildren()` on every rebuild (destroying the old `listWrap`), this block must live inside `buildListEditor` so it re-registers on each rebuild — which is exactly where it goes here:

```js
listWrap.addEventListener("navreorder", function (e) {
  var from = e.detail.fromIndex;
  var to = e.detail.toIndex;
  var moved = config[listKey].splice(from, 1)[0];
  config[listKey].splice(to, 0, moved);
  onChange(config);
  buildListEditor(container, config, listKey, onChange, fields, emptyItem, navOptions);
});
```

- [ ] **Step 3: Commit**

```bash
git add js/editor-keyboard.js js/widgets/pinned.js
git commit -m "feat(editor-nav): create EditorKeyboard module and wire navreorder event"
```

---

## Task 5: Wire `EditorKeyboard` into `grid.js`

**Files:**
- Modify: `js/grid.js:218-315` (`openConfigModal` function)

**Important — final order of code in `openConfigModal`:** After all edits in this task, the code must read in this order: (1) `editorKeyboard` is instantiated, (2) `renderEditor` is called with `navOptions` referencing `editorKeyboard`, (3) `close` calls `editorKeyboard.detach()`, (4) `requestAnimationFrame` calls `editorKeyboard.attach()`. Apply the steps below but verify the final structure matches this order before committing.

- [ ] **Step 1: Add `data-nav-save` to the Done button**

In `openConfigModal`, find the line `doneBtn.textContent = "Done";` and add directly after:

```js
doneBtn.dataset.navSave = "";
```

- [ ] **Step 2: Instantiate `EditorKeyboard` before the `renderEditor` call**

In `openConfigModal`, add the instantiation on the line **immediately before** the `plugin.renderEditor(...)` call (currently line ~241):

```js
var editorKeyboard = new EditorKeyboard(panel);
```

- [ ] **Step 3: Update the `renderEditor` call to pass `navOptions`**

Change the call immediately after the line added in Step 2:
```js
plugin.renderEditor(body, w.config || {}, function (newConfig) {
  w.config = newConfig;
});
```

To:
```js
plugin.renderEditor(body, w.config || {}, function (newConfig) {
  w.config = newConfig;
}, { onRebuild: function () { editorKeyboard.rescan(); } });
```

- [ ] **Step 4: Remove `onConfigKey` and its registration**

Remove the entire `getFocusableElements` and `onConfigKey` function definitions and the `document.addEventListener("keydown", onConfigKey)` call (lines ~269-307). These are fully replaced by `EditorKeyboard`.

- [ ] **Step 5: Update the `close` function to detach EditorKeyboard**

The current `close` function is:
```js
function close() {
  document.removeEventListener("keydown", onConfigKey);
  overlay.remove();
  if (onSave) onSave(widgetId);
}
```

Change to:
```js
function close() {
  editorKeyboard.detach();
  overlay.remove();
  if (onSave) onSave(widgetId);
}
```

- [ ] **Step 6: Replace the auto-focus `requestAnimationFrame` block**

The current block (lines ~310-314) focuses the first input on open. Remove it — `EditorKeyboard.rescan()` handles initial focus. (`attach()` calls `rescan()`.)

Replace with:

```js
requestAnimationFrame(function () { editorKeyboard.attach(); });
```

- [ ] **Step 7: Commit**

```bash
git add js/grid.js
git commit -m "feat(editor-nav): wire EditorKeyboard into openConfigModal, remove onConfigKey"
```

---

## Task 6: Register the script in `index.html`

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Add the script tag before `grid.js`**

In `index.html`, find the line:
```html
<script src="js/grid.js"></script>
```

Add before it:
```html
<script src="js/editor-keyboard.js"></script>
```

- [ ] **Step 2: Commit**

```bash
git add index.html
git commit -m "feat(editor-nav): load editor-keyboard.js"
```

---

## Task 7: Manual Smoke Test

Load the extension (or open `index.html` directly in the browser). Enter Edit mode (`e`), click/keyboard-navigate to a widget, press `g` or Enter to open its config.

**Test checklist:**

- [ ] **List Mode basics** — Open a group-links widget config. Press `↓` — first card gets accent outline and hint badges (`↑↓ navigate ↵ edit ⇧↑↓ reorder ⌫ delete n add`). Press `↓` again — focus moves to second card. Press `↑` — moves back.

- [ ] **k/j aliases** — Press `j` — moves down. Press `k` — moves up.

- [ ] **Header field navigation** — Press `↑` from the first card — focus moves to the "Group title" input. Press `Tab` — focus returns to first card in list.

- [ ] **Enter Item Mode** — With a card focused, press `Enter` — focus moves inside the card to the first field, hint bar changes to `Tab fields Esc back`.

- [ ] **Tab within Item Mode** — Press `Tab` — focus moves to next field in the card. Press `Shift+Tab` — moves back.

- [ ] **Exit Item Mode** — Press `Esc` — returns to List Mode, card outline reappears, list hints reappear.

- [ ] **Add** — Press `n` in List Mode — new card appears at bottom, focus moves to it.

- [ ] **Delete** — Focus a card, press `⌫` (Backspace) or `x` — card is removed, focus moves to previous (or next) card.

- [ ] **Reorder** — Focus a card that has one above/below it. Press `Shift+↓` — card moves down one position. Press `Shift+↑` — card moves back up.

- [ ] **Save** — Press `⌘Enter` (or `Ctrl+Enter`) — modal closes and changes persist.

- [ ] **Pinned widget editor** — Open a Pinned Links widget config. Confirm same list navigation works (it uses `buildListEditor` directly).

- [ ] **Markets and Feeds editors** — Open a Markets widget config. Confirm same list navigation works. Confirm title input is reachable via `Shift+Tab` from first item.

- [ ] **Flat-mode widget** (if any widget has no list) — Confirm Tab still cycles through its fields and `⌘Enter` saves.

- [ ] **No mouse regression** — Confirm clicking the "Done" button still works. Confirm clicking the X close button still works. Confirm clicking outside the modal still closes it.

- [ ] **Commit if all passing**

```bash
git add .
git commit -m "feat: widget editor keyboard navigation complete"
```
