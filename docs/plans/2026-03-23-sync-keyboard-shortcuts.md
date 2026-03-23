# Sync Keyboard Shortcuts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `y` (pull) and `Shift+Y` (push) keyboard shortcuts for WebDAV sync, with a bottom-right status badge and bottom-left toast notifications.

**Architecture:** A new `js/sync-status.js` IIFE module exposes `Hub.syncStatus` with `init()`, `pull()`, and `confirmPush()`. The badge and toast container are appended to `document.body` by the module on init. Storage changes drive live badge updates via `chrome.storage.onChanged`; a `pendingToast` flag tracks keyboard-triggered operations so only those show result toasts.

**Tech Stack:** Vanilla JS (ES5-compatible IIFE modules, matching codebase style), Chrome Extension MV3 APIs (`chrome.storage.local`, `chrome.runtime.sendMessage`), CSS custom properties from `styles.css`.

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `js/sync-status.js` | **Create** | Badge DOM, toast DOM, storage listener, `pull()`, `confirmPush()` |
| `styles.css` | **Modify** | Badge + toast CSS, spin keyframe animation |
| `index.html` | **Modify** | Add `<script src="js/sync-status.js">` before `js/main.js` |
| `js/main.js` | **Modify** | Call `Hub.syncStatus.init()` in `init()` |
| `js/keyboard.js` | **Modify** | Add `y` to `RESERVED`, add handler block, update comment |
| `js/help.js` | **Modify** | Add two `SHORTCUTS` entries |

---

## Task 1: Create `js/sync-status.js`

**Files:**
- Create: `js/sync-status.js`

This is the core new module. It follows the same IIFE pattern as every other module in the codebase (see `js/help.js`, `js/zen.js` for reference).

Key design notes:
- `currentData` caches the last-read storage snapshot so `pull()`/`confirmPush()` can guard synchronously without an async storage read on keypress.
- `pendingToast` is `"pull"` or `"push"` when a keyboard-triggered sync is in flight. The storage change listener checks it to decide whether to show a result toast. Auto-syncs (triggered by page load, not keyboard) never set `pendingToast`, so they never produce toasts.
- The badge's `hidden` class (`.hidden { display: none !important }` already in `styles.css`) hides it when WebDAV is not configured.
- `sendSync()` sends to `background.js` which already handles `"syncDownload"` and `"syncUpload"` actions (see `background.js` line 317–326).

- [ ] **Step 1: Create the file with the module skeleton**

```js
/* js/sync-status.js — Sync status badge (bottom-right) + toast notifications (bottom-left) */

window.Hub = window.Hub || {};

Hub.syncStatus = (function () {

  var badge = null;
  var toastContainer = null;
  var currentData = {};
  var pendingToast = null; /* "pull" | "push" | null — set when a keyboard-triggered sync is in flight */
  var tickTimer = null;

  /* Inline SVGs — kept here rather than icons.js since these are UI chrome specific to this module */
  var CLOUD_SVG = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9z"/></svg>';
  var SPIN_SVG  = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="sync-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>';
  var ALERT_SVG = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';

  /* ── Storage ── */

  function storageGet(keys) {
    return new Promise(function (resolve) {
      chrome.storage.local.get(keys, function (r) { resolve(r || {}); });
    });
  }

  /* ── Relative time ── */

  function relativeTime(iso) {
    if (!iso) return "Never synced";
    var diff = Math.floor((Date.now() - new Date(iso)) / 1000);
    if (diff < 10) return "Just now";
    if (diff < 60) return diff + "s ago";
    if (diff < 3600) return Math.floor(diff / 60) + "m ago";
    if (diff < 86400) return Math.floor(diff / 3600) + "h ago";
    return Math.floor(diff / 86400) + "d ago";
  }

  /* ── Badge ── */

  function renderBadge(data) {
    if (!badge) return;
    var url    = data["new-tab-webdav-url"];
    var status = data["new-tab-sync-status"];
    var last   = data["new-tab-sync-last"];
    var err    = data["new-tab-sync-error"];

    if (!url) { badge.classList.add("hidden"); return; }
    badge.classList.remove("hidden");

    var iconEl  = badge.querySelector(".sync-badge-icon");
    var labelEl = badge.querySelector(".sync-badge-label");

    if (status === "syncing") {
      badge.className = "sync-badge is-syncing";
      iconEl.innerHTML = SPIN_SVG;
      labelEl.textContent = "";
      badge.title = "Syncing\u2026";
    } else if (status === "error") {
      badge.className = "sync-badge is-error";
      iconEl.innerHTML = ALERT_SVG;
      labelEl.textContent = "Sync error";
      badge.title = err || "Unknown error";
    } else {
      badge.className = "sync-badge";
      iconEl.innerHTML = CLOUD_SVG;
      labelEl.textContent = relativeTime(last);
      badge.title = last ? "Last synced: " + new Date(last).toLocaleString() : "Never synced";
    }
  }

  /* ── Toasts ── */

  function removeToast(el) {
    el.classList.remove("is-visible");
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 300);
  }

  function createToast(html, persistent) {
    var el = document.createElement("div");
    el.className = "sync-toast" + (persistent ? " is-confirm" : "");
    el.innerHTML = html;
    toastContainer.appendChild(el);
    /* Trigger reflow so the CSS transition runs */
    el.getBoundingClientRect();
    el.classList.add("is-visible");
    if (!persistent) {
      setTimeout(function () { removeToast(el); }, 3000);
    }
    return el;
  }

  function showToast(text) {
    createToast(Hub.escapeHtml(text), false);
  }

  function showConfirmToast(onConfirm) {
    var el = createToast(
      'Push to WebDAV? <button class="sync-toast-btn sync-toast-yes" type="button">Yes</button>' +
      '<button class="sync-toast-btn sync-toast-no" type="button">No</button>',
      true
    );
    el.querySelector(".sync-toast-yes").addEventListener("click", function () {
      removeToast(el);
      onConfirm();
    });
    el.querySelector(".sync-toast-no").addEventListener("click", function () {
      removeToast(el);
    });
  }

  /* ── Storage change listener ── */

  var WATCH_KEYS = ["new-tab-sync-status", "new-tab-sync-last", "new-tab-sync-error", "new-tab-webdav-url"];

  function onStorageChanged(changes, area) {
    if (area !== "local") return;
    if (!WATCH_KEYS.some(function (k) { return changes[k]; })) return;

    WATCH_KEYS.forEach(function (k) {
      if (changes[k]) currentData[k] = changes[k].newValue;
    });
    renderBadge(currentData);

    /* Show result toast for keyboard-triggered syncs only */
    if (pendingToast) {
      var status = currentData["new-tab-sync-status"];
      if (status === "idle") {
        showToast(pendingToast === "pull" ? "Pulled" : "Pushed");
        pendingToast = null;
      } else if (status === "error") {
        var msg = currentData["new-tab-sync-error"] || "Unknown error";
        showToast((pendingToast === "pull" ? "Pull failed: " : "Push failed: ") + msg);
        pendingToast = null;
      }
    }
  }

  /* ── Background messaging ── */

  function sendSync(action) {
    if (typeof chrome !== "undefined" && chrome.runtime) {
      chrome.runtime.sendMessage({ action: action });
    }
  }

  /* ── Public API ── */

  function pull() {
    /* No-op if WebDAV not configured or sync already in progress */
    if (!currentData["new-tab-webdav-url"]) return;
    if (currentData["new-tab-sync-status"] === "syncing") return;
    pendingToast = "pull";
    sendSync("syncDownload");
  }

  function confirmPush() {
    /* No-op if WebDAV not configured or sync already in progress */
    if (!currentData["new-tab-webdav-url"]) return;
    if (currentData["new-tab-sync-status"] === "syncing") return;
    showConfirmToast(function () {
      pendingToast = "push";
      sendSync("syncUpload");
    });
  }

  function init() {
    /* Build badge element */
    badge = document.createElement("div");
    badge.className = "sync-badge hidden";
    badge.innerHTML = '<span class="sync-badge-icon"></span><span class="sync-badge-label"></span>';
    document.body.appendChild(badge);

    /* Build toast container */
    toastContainer = document.createElement("div");
    toastContainer.className = "sync-toast-container";
    document.body.appendChild(toastContainer);

    /* Load initial storage state */
    storageGet(WATCH_KEYS).then(function (data) {
      currentData = data;
      renderBadge(currentData);
      /* Refresh relative timestamp every 30 seconds */
      if (tickTimer) clearInterval(tickTimer);
      tickTimer = setInterval(function () { renderBadge(currentData); }, 30000);
    });

    /* Live updates */
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener(onStorageChanged);
    }
  }

  return { init: init, pull: pull, confirmPush: confirmPush };

}());
```

- [ ] **Step 2: Verify file was created**

Run: `ls -la js/sync-status.js`
Expected: file exists with non-zero size.

- [ ] **Step 3: Commit**

```bash
git add js/sync-status.js
git commit -m "feat(sync): add sync-status module (badge + toast)"
```

---

## Task 2: Add CSS for badge and toasts

**Files:**
- Modify: `styles.css` (append before the `/* ── Responsive ──` block near the end, around line 1366)

The badge uses `position: fixed; bottom: 16px; right: 16px` (bottom-right corner). The toast container uses `position: fixed; bottom: 16px; left: 16px` (bottom-left corner). The `.hidden` class that hides the badge when WebDAV is not configured already exists in `styles.css` as `.hidden, .is-hidden { display: none !important; }`.

- [ ] **Step 1: Append the following CSS block to `styles.css` just before the `/* ── Responsive ──` comment**

```css
/* ── Sync status badge (bottom-right) ── */
.sync-badge {
  position: fixed;
  bottom: 16px;
  right: 16px;
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 9px;
  background: var(--surface);
  border: var(--border-width) solid var(--border);
  border-radius: var(--radius-md);
  font-size: 0.72rem;
  color: var(--muted);
  z-index: 100;
  pointer-events: none;
  user-select: none;
  transition: border-color 0.2s ease, color 0.2s ease;
}
.sync-badge.is-error {
  color: var(--down);
  border-color: rgba(248, 113, 113, 0.25);
}
.sync-badge-icon { display: flex; align-items: center; }

@keyframes sync-spin {
  to { transform: rotate(360deg); }
}
.sync-spin {
  animation: sync-spin 1s linear infinite;
}

/* ── Sync toast container (bottom-left) ── */
.sync-toast-container {
  position: fixed;
  bottom: 16px;
  left: 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  z-index: 200;
  pointer-events: none;
}
.sync-toast {
  padding: 7px 12px;
  background: var(--surface);
  border: var(--border-width) solid var(--border);
  border-radius: var(--radius-md);
  font-size: 0.78rem;
  color: var(--text);
  opacity: 0;
  transform: translateY(6px);
  transition: opacity 0.2s ease, transform 0.2s ease;
  pointer-events: none;
  white-space: nowrap;
}
.sync-toast.is-confirm {
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: 8px;
}
.sync-toast.is-visible {
  opacity: 1;
  transform: translateY(0);
}
.sync-toast-btn {
  padding: 2px 8px;
  background: var(--bg);
  border: var(--border-width) solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text);
  font-size: 0.75rem;
  cursor: pointer;
  font-family: var(--font-body);
}
.sync-toast-btn:hover { background: var(--surface-hover); }
.sync-toast-yes { border-color: rgba(74, 222, 128, 0.4); color: var(--ok); }
.sync-toast-yes:hover { background: rgba(74, 222, 128, 0.08); }
```

- [ ] **Step 2: Commit**

```bash
git add styles.css
git commit -m "feat(sync): add badge and toast CSS"
```

---

## Task 3: Wire up `index.html` and `main.js`

**Files:**
- Modify: `index.html` (add script tag)
- Modify: `js/main.js` (call `init`)

`sync-status.js` must load after `js/utils.js` (needs `Hub.escapeHtml`) and after `js/icons.js`, but before `js/main.js` (which calls `Hub.syncStatus.init()`).

Current script order in `index.html` ends with:
```html
<script src="js/customize.js"></script>
<script src="js/main.js"></script>
```

- [ ] **Step 1: Add the script tag in `index.html`**

Find this block (near line 56–57):
```html
    <script src="js/customize.js"></script>
    <script src="js/main.js"></script>
```

Replace with:
```html
    <script src="js/customize.js"></script>
    <script src="js/sync-status.js"></script>
    <script src="js/main.js"></script>
```

- [ ] **Step 2: Call `Hub.syncStatus.init()` from `main.js`**

In `js/main.js`, find this block inside the `init()` function (around line 805–806):
```js
    bindSearch();
    Hub.keyboard.bind(function () { return state; });
```

Add the init call immediately after `Hub.keyboard.bind(...)`:
```js
    bindSearch();
    Hub.keyboard.bind(function () { return state; });
    Hub.syncStatus.init();
```

- [ ] **Step 3: Manual verification — badge appears when WebDAV is configured**

Load the extension in Chrome (`chrome://extensions` → Load unpacked). Open a new tab.

If you have WebDAV credentials saved: the badge should appear bottom-right showing either a cloud icon + timestamp (idle), a spinning icon (syncing), or a red error state.

If you don't have WebDAV configured: the badge should be invisible (no element visible bottom-right).

Open DevTools console — no errors should appear on load.

- [ ] **Step 4: Commit**

```bash
git add index.html js/main.js
git commit -m "feat(sync): wire up sync-status module in index.html and main.js"
```

---

## Task 4: Update `js/keyboard.js` — add `y` to RESERVED and handler

**Files:**
- Modify: `js/keyboard.js`

There are three changes:
1. Add `y:1` to the `RESERVED` object (line 76) so the chord system never assigns `y` to a widget.
2. Update the adjacent comment on line 74 to mention `y`.
3. Insert the sync handler block before the chord-active block (around line 333).

**Change 1 & 2 — RESERVED and comment:**

Find (around line 74–76):
```js
  /* Ergonomic priority: home row center outward, top row, bottom row.
     Excludes keys already bound: h j k l d u z e p t */
  var ERGO_KEYS = "fgsatrewvbcniopqyxm".split("");
  var RESERVED = { h:1, j:1, k:1, l:1, d:1, u:1, z:1, e:1, p:1, t:1, a:1 };
```

Replace with:
```js
  /* Ergonomic priority: home row center outward, top row, bottom row.
     Excludes keys already bound: h j k l d u z e p t y */
  var ERGO_KEYS = "fgsatrewvbcniopqyxm".split("");
  var RESERVED = { h:1, j:1, k:1, l:1, d:1, u:1, z:1, e:1, p:1, t:1, a:1, y:1 };
```

**Change 3 — handler block:**

The insertion point is just before the chord-active block. Find this block (around line 328–333):
```js
      /* Edit mode keyboard controls: arrow keys move, shift+arrows resize, G config, X/Delete remove */
      if (!typing && Hub.grid.isEditing() && !document.querySelector(".modal-overlay")) {
        if (Hub.grid.handleEditKey(e)) return;
      }

      /* Chord mode: item selection or escape while chord is active */
      if (!typing && chordState.active) {
```

Insert the sync handler block between those two sections:
```js
      /* Edit mode keyboard controls: arrow keys move, shift+arrows resize, G config, X/Delete remove */
      if (!typing && Hub.grid.isEditing() && !document.querySelector(".modal-overlay")) {
        if (Hub.grid.handleEditKey(e)) return;
      }

      /* Y / Shift+Y: pull / push WebDAV sync */
      if (!typing && key === "y" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        if (e.shiftKey) {
          if (Hub.syncStatus) Hub.syncStatus.confirmPush();
        } else {
          if (Hub.syncStatus) Hub.syncStatus.pull();
        }
        return;
      }

      /* Chord mode: item selection or escape while chord is active */
      if (!typing && chordState.active) {
```

- [ ] **Step 1: Apply Change 1 & 2 — update RESERVED and comment**

(Use the exact find/replace shown above.)

- [ ] **Step 2: Apply Change 3 — insert sync handler block**

(Use the exact find/replace shown above.)

- [ ] **Step 3: Manual verification — keyboard shortcuts work**

Load the extension. Open a new tab. WebDAV must be configured for non-no-op behavior.

Test `y` (pull):
- Press `y` (not while typing in search)
- If WebDAV configured: badge should spin briefly, then show "Pulled" toast bottom-left on success
- If not configured: nothing happens (silent no-op)

Test `Shift+Y` (push):
- Press `Shift+Y` (not while typing)
- If configured: bottom-left confirm toast appears: "Push to WebDAV? [Yes] [No]"
- Click Yes → badge spins → "Pushed" toast appears
- Click No → confirm toast disappears, nothing else happens

Test chord safety:
- Press `y` when a chord is active (e.g. press a widget letter first) — the sync handler fires, not the chord system (chord is cleared, sync pull runs)
- Verify no widget with key `y` is assigned (check badge labels on widget headers — none should show "Y")

- [ ] **Step 4: Commit**

```bash
git add js/keyboard.js
git commit -m "feat(sync): add y/Shift+Y keyboard shortcuts for pull/push"
```

---

## Task 5: Update `js/help.js` — add shortcuts to palette

**Files:**
- Modify: `js/help.js`

Add two entries to the `SHORTCUTS` array. They are separate rows (not combined like `P / Shift+P`) because pull and push have different confirmation behavior, and combining them would obscure that asymmetry.

Find the end of the SHORTCUTS array in `js/help.js` (around line 35–36):
```js
    ["Ctrl/Cmd + S", "Save layout (in edit mode)", function () { if (Hub.grid.isEditing() && Hub.editMode) Hub.editMode.save(); }],
    ["?", "Show this help"],
    ["Escape", "Close dialog / cancel edit / blur search"]
```

Add two entries before `["?", ...]`:
```js
    ["Ctrl/Cmd + S", "Save layout (in edit mode)", function () { if (Hub.grid.isEditing() && Hub.editMode) Hub.editMode.save(); }],
    ["Y", "Pull from WebDAV", function () { if (Hub.syncStatus) Hub.syncStatus.pull(); }],
    ["Shift+Y", "Push to WebDAV", function () { if (Hub.syncStatus) Hub.syncStatus.confirmPush(); }],
    ["?", "Show this help"],
    ["Escape", "Close dialog / cancel edit / blur search"]
```

- [ ] **Step 1: Apply the change**

- [ ] **Step 2: Manual verification — shortcuts appear in help dialog**

Press `?` to open the help dialog. Search for "WebDAV" — both "Pull from WebDAV" and "Push to WebDAV" rows should appear. Both rows should be highlighted/actionable (clickable). Clicking "Pull from WebDAV" should close the dialog and trigger a pull (badge spins if configured).

- [ ] **Step 3: Commit**

```bash
git add js/help.js
git commit -m "feat(sync): add y/Shift+Y entries to help dialog shortcuts"
```

---

## Task 6: End-to-end smoke test

No automated test framework exists in this codebase. Do a full manual pass.

- [ ] **Step 1: Load extension fresh**

Go to `chrome://extensions`, click "Reload" on the extension. Open a new tab.

- [ ] **Step 2: Test with WebDAV NOT configured**

- Badge is invisible ✓
- Press `y` → nothing ✓
- Press `Shift+Y` → nothing ✓
- Press `?` → help dialog shows Y and Shift+Y entries ✓
- Widget headers show no "Y" badge ✓

- [ ] **Step 3: Test with WebDAV configured**

Configure WebDAV in the browser action popup (click extension icon, enter URL/user/pass, save). Return to the new tab.

- Badge appears bottom-right showing cloud icon + relative time ✓
- Hover over badge → tooltip shows "Last synced: [date]" or "Never synced" ✓
- Press `y` → badge spins briefly → "Pulled" toast appears bottom-left, fades after 3s ✓
- Press `Shift+Y` → confirm toast appears bottom-left with Yes/No → click No → toast disappears ✓
- Press `Shift+Y` → click Yes → badge spins → "Pushed" toast appears ✓
- Press `y` while typing in search box → nothing (typing guard) ✓
- Check that no "Y" chord badge appears on any widget header ✓

- [ ] **Step 4: Test error state**

Temporarily set an invalid WebDAV password in the popup (Edit → change pass → Save). Open new tab. Badge should show red error state. Hovering shows the error message. Pressing `y` shows "Pull failed: …" toast.

- [ ] **Step 5: Final commit if any cleanup needed**

```bash
git add -p  # stage only intentional changes
git commit -m "chore(sync): post-smoke-test cleanup"
```
