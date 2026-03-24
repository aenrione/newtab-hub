# Widget Credential System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `Hub.credentials` — a simple utility any widget can call to store and retrieve API keys locally, never synced or exported.

**Architecture:** A new `js/credentials.js` module exposes `Hub.credentials.load/save/clear`. Widget authors call it themselves in their `load()` function using `config._id` as the storage key. `grid.js` renders credential UI in the widget editor automatically when `credentialFields` is declared. `background.js` and `customize.js` are patched to exclude `new-tab-creds-*` keys from all data-leaving paths. No changes to `load()`/`render()` function signatures.

**Tech Stack:** Vanilla JS, `chrome.storage.local` (with `localStorage` fallback), no build step, no dependencies.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `js/credentials.js` | **Create** | `Hub.credentials` utility: `load`, `save`, `clear` |
| `index.html` | **Modify** | Add `<script src="js/credentials.js">` before `grid.js` |
| `js/main.js` | **Modify** | Embed `_id` in config passed to `render()` and `load()` |
| `js/grid.js` | **Modify** | Inject credential UI after `renderEditor()`; clear on widget delete |
| `styles.css` | **Modify** | Styles for credential section in widget editor |
| `background.js` | **Modify** | Exclude `new-tab-creds-*` from upload, download, sync trigger |
| `js/customize.js` | **Modify** | Exclude `new-tab-creds-*` from export and import |

---

## Task 1: Create `js/credentials.js` and wire it into `index.html`

**Files:**
- Create: `js/credentials.js`
- Modify: `index.html`

- [ ] **Step 1: Create `js/credentials.js`**

```js
/* js/credentials.js
 * Per-widget credential storage via chrome.storage.local (localStorage fallback).
 * Storage key format: "new-tab-creds-{widgetId}"
 * Never synced, never exported, never imported.
 *
 * Usage in a widget's load() function:
 *   var creds = await Hub.credentials.load(config._id);
 *   if (!creds.apiKey) { ... show setup message ... return; }
 */
(function () {
  var PREFIX = "new-tab-creds-";

  function storageGet(key) {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      return new Promise(function (resolve) {
        chrome.storage.local.get([key], function (result) {
          resolve(result ? result[key] : undefined);
        });
      });
    }
    try { return Promise.resolve(JSON.parse(localStorage.getItem(key))); }
    catch (_) { return Promise.resolve(undefined); }
  }

  function storageSet(key, value) {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      return new Promise(function (resolve) {
        chrome.storage.local.set({ [key]: value }, resolve);
      });
    }
    localStorage.setItem(key, JSON.stringify(value));
    return Promise.resolve();
  }

  function storageRemove(key) {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      return new Promise(function (resolve) {
        chrome.storage.local.remove(key, resolve);
      });
    }
    localStorage.removeItem(key);
    return Promise.resolve();
  }

  Hub.credentials = {
    /** Load credentials for a widget instance. Resolves {} if none saved. */
    load: function (widgetId) {
      return storageGet(PREFIX + widgetId).then(function (val) {
        return val || {};
      });
    },

    /** Merge obj into the stored credentials for this widget. */
    save: function (widgetId, obj) {
      return Hub.credentials.load(widgetId).then(function (existing) {
        return storageSet(PREFIX + widgetId, Object.assign({}, existing, obj));
      });
    },

    /** Delete all credentials for this widget. */
    clear: function (widgetId) {
      return storageRemove(PREFIX + widgetId);
    }
  };
}());
```

- [ ] **Step 2: Add `<script>` tag to `index.html` before `grid.js`**

`Hub` is first defined in `utils.js` (line 3: `window.Hub = window.Hub || {}`), which loads before all other scripts. `credentials.js` just needs to load before `grid.js` (which calls `Hub.credentials`) — anywhere after `utils.js` is safe.

Open `index.html`. Find:
```html
<script src="js/grid.js"></script>
```
Insert before it:
```html
<script src="js/credentials.js"></script>
```

- [ ] **Step 3: Verify it loads without errors**

Reload the new tab page. Open DevTools → Console. Confirm:
- No errors on load
- `Hub.credentials` is defined (type `Hub.credentials` in console — should print the object with `load`, `save`, `clear`)

- [ ] **Step 4: Commit**

```bash
git add js/credentials.js index.html
git commit -m "feat(credentials): add Hub.credentials utility module"
```

---

## Task 2: Embed `_id` in widget config in `main.js`

**Files:**
- Modify: `js/main.js`

This is the only `main.js` change. Widgets need `config._id` to know which storage key to use when calling `Hub.credentials.load()`. We embed it at the two render/load call sites.

- [ ] **Step 1: Update `renderAllWidgets()` (line ~232)**

Find inside `renderAllWidgets()`:
```js
plugin.render(el, w.config || {}, state);
```
Change to:
```js
plugin.render(el, Object.assign({}, w.config || {}, { _id: w.id }), state);
```

- [ ] **Step 2: Update `renderDashboard()` async load loop (line ~289)**

Find inside the `widgets.forEach` in `renderDashboard()`:
```js
loadPromises.push(plugin.load(el, w.config || {}, state, token));
```
Change to:
```js
loadPromises.push(plugin.load(el, Object.assign({}, w.config || {}, { _id: w.id }), state, token));
```

- [ ] **Step 3: Verify existing widgets still work**

Reload the extension. All existing widgets (search, pinned links, feeds, markets, clock, todo) must render and load data correctly. The extra `_id` field on config is ignored by all existing widgets. Check DevTools console — no errors.

- [ ] **Step 4: Commit**

```bash
git add js/main.js
git commit -m "feat(credentials): embed _id in widget config for credential key access"
```

---

## Task 3: Protect `background.js` from syncing credentials

**Files:**
- Modify: `background.js`

Three locations need a `new-tab-creds-` prefix check. They are independent — add each in turn.

- [ ] **Step 1: Extend `isPayloadKey()` — upload path (line ~26)**

Find:
```js
function isPayloadKey(k) {
  if (PAYLOAD_SKIP_EXACT[k]) return false;
  if (k.startsWith("new-tab-webdav-")) return false;
  if (k.startsWith("new-tab-sync-")) return false;
  return true;
}
```
Add one line before `return true`:
```js
  if (k.startsWith("new-tab-creds-")) return false;
```

- [ ] **Step 2: Extend `doDownload()` inline filter — download path (line ~165)**

Find the `toWrite` block inside `doDownload()`:
```js
Object.keys(downloaded.data).forEach(function (k) {
  if (PAYLOAD_SKIP_EXACT[k]) return;
  if (k.startsWith("new-tab-webdav-")) return;
  if (k.startsWith("new-tab-sync-")) return;
  toWrite[k] = downloaded.data[k];
});
```
Add one line:
```js
  if (k.startsWith("new-tab-creds-")) return;
```

- [ ] **Step 3: Extend sync trigger — storage change listener (line ~287)**

Find the `relevant` check in the storage change listener:
```js
var relevant = Object.keys(changes).some(function (k) {
  return k.startsWith("new-tab-") && !SYNC_TRIGGER_SKIP[k] && !k.startsWith("new-tab-sync-");
});
```

> **Why not `SYNC_TRIGGER_SKIP`?** That object uses exact key strings. Credential keys are dynamic (`new-tab-creds-{widgetId}`) so they can't be listed there. Add the prefix check directly to the `relevant` predicate instead.

Change to:
```js
var relevant = Object.keys(changes).some(function (k) {
  return k.startsWith("new-tab-") && !SYNC_TRIGGER_SKIP[k] && !k.startsWith("new-tab-sync-") && !k.startsWith("new-tab-creds-");
});
```

- [ ] **Step 4: Verify (manual)**

In the browser DevTools console:
```js
chrome.storage.local.set({"new-tab-creds-test": {apiKey: "test123"}})
```
If WebDAV sync is configured, trigger a manual push. The `new-tab-creds-test` key must not appear in the WebDAV file content.

- [ ] **Step 5: Commit**

```bash
git add background.js
git commit -m "feat(credentials): exclude new-tab-creds-* from WebDAV sync"
```

---

## Task 4: Protect `customize.js` export and import

**Files:**
- Modify: `js/customize.js`

- [ ] **Step 1: Extend export handler (line ~538)**

Find the export key filter. It contains:
```js
if (k.startsWith("new-tab-webdav-") || k.startsWith("new-tab-sync-")) return;
```
Change to:
```js
if (k.startsWith("new-tab-webdav-") || k.startsWith("new-tab-sync-") || k.startsWith("new-tab-creds-")) return;
```

- [ ] **Step 2: Extend import handler (line ~600)**

Find the import `keys` filter:
```js
var keys = Object.keys(parsed.data).filter(function (k) {
  return k.startsWith("new-tab-") &&
    k !== "new-tab-cache" &&
    k !== "new-tab-v2-migrated" &&
    !k.startsWith("new-tab-webdav-") &&
    !k.startsWith("new-tab-sync-");
});
```
Add one condition:
```js
    !k.startsWith("new-tab-creds-")
```

- [ ] **Step 3: Verify (manual)**

1. Set a test key: `chrome.storage.local.set({"new-tab-creds-abc": {apiKey: "secret"}})`
2. Export settings from the sidebar. Open the downloaded JSON — `new-tab-creds-abc` must not appear.
3. Craft a backup JSON with `"new-tab-creds-abc": {"apiKey": "injected"}` inside `data`. Import it. Run `chrome.storage.local.get(null, console.log)` — the key must not have been written.

- [ ] **Step 4: Commit**

```bash
git add js/customize.js
git commit -m "feat(credentials): exclude new-tab-creds-* from export and import"
```

---

## Task 5: Credential UI in `grid.js` + styles

**Files:**
- Modify: `js/grid.js`
- Modify: `styles.css`

- [ ] **Step 1: Clear credentials on widget delete**

Find `removeWidget()` (line ~214). It removes the widget from `editClone` and the DOM. Add one line at the top of the function:
```js
Hub.credentials.clear(widgetId);
```

- [ ] **Step 2: Inject credential UI after `renderEditor()` in `openConfigModal()`**

Find the call to `plugin.renderEditor(body, ...)` (line ~245). After it, add:

```js
// Inject credential fields if declared
if (plugin.credentialFields && plugin.credentialFields.length > 0) {
  Hub.credentials.load(widgetId).then(function (savedCreds) {
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

    body.appendChild(section);
  });
}
```

> **Note:** `body` is the correct variable name — confirmed in `openConfigModal` at line ~242 (`var body = document.createElement("div")`). It is already appended to the modal panel, so `body.appendChild(section)` works even from inside the async `.then()` callback.

- [ ] **Step 3: Add CSS to `styles.css`**

Find the widget editor styles section in `styles.css`. Append:

```css
/* Credential fields in widget editor */
.widget-editor-credentials {
  border-top: 1px solid var(--border);
  margin-top: 12px;
  padding-top: 12px;
}

.widget-editor-credentials-header {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted);
  margin-bottom: 8px;
}

.widget-editor-credentials-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 8px;
}

.widget-editor-credentials-row label {
  font-size: 0.8rem;
  color: var(--fg);
}

.widget-editor-credentials-input-wrap {
  display: flex;
  gap: 6px;
  align-items: center;
}

.widget-editor-credentials-input-wrap input {
  flex: 1;
  font-family: monospace;
  font-size: 0.85rem;
}

.widget-editor-credentials-toggle,
.widget-editor-credentials-clear {
  font-size: 0.75rem;
  padding: 2px 8px;
  cursor: pointer;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--fg);
}

.widget-editor-credentials-clear {
  display: block;
  margin-top: 4px;
  color: var(--muted);
}
```

> **Note:** Check existing widget editor styles in `styles.css` to confirm the CSS variable names used (`--border`, `--muted`, `--surface`, `--fg`). Adjust if the project uses different names.

- [ ] **Step 4: Verify credential UI with a test widget**

In the browser console on the new tab page, register a minimal test widget:

```js
Hub.registry.register("test-creds", {
  label: "Credentials Test",
  credentialFields: [
    { key: "apiKey", label: "API Key", placeholder: "sk-..." },
    { key: "orgId", label: "Org ID", placeholder: "org-..." }
  ],
  render: function(container, config, state) {
    container.innerHTML = "<div style='padding:8px'>creds test widget (id: " + config._id + ")</div>";
  },
  defaultConfig: function() { return {}; }
});
```

Then in the grid edit mode (click the grid icon in the toolbar), add the widget. Open its gear icon to enter the editor. Verify:

1. "Credentials" section appears below any config fields with a divider
2. Two password inputs render with "Show"/"Hide" toggles
3. Enter a value and tab/click away — it saves. Check: `chrome.storage.local.get(null, console.log)` — should see `new-tab-creds-{id}: {apiKey: "..."}`
4. Close and reopen the editor — inputs are pre-populated
5. Click "Remove credentials" — inputs clear; key deleted from storage
6. Delete the widget — verify `new-tab-creds-{id}` key is gone from storage

- [ ] **Step 5: Commit**

```bash
git add js/grid.js styles.css
git commit -m "feat(credentials): credential UI in widget editor; clear on widget delete"
```

---

## Task 6: End-to-end verification

- [ ] **Step 1: Backwards compatibility check**

All existing widgets must work exactly as before. Navigate between profiles, let feeds/markets load. No console errors. The `_id` field added to config is ignored by existing widgets.

- [ ] **Step 2: Widget author ergonomics check**

Verify the full widget authoring flow works. Write a minimal widget file and load it:

```js
// Save as profiles/private/test-openai-widget.js (git-ignored) and load via config.private.js
Hub.registry.register("my-openai", {
  label: "OpenAI Test",
  credentialFields: [{ key: "apiKey", label: "API Key", placeholder: "sk-..." }],
  load: async function(container, config, state, token) {
    var creds = await Hub.credentials.load(config._id);
    var body = container.querySelector(".widget-body") || container;
    if (!creds.apiKey) {
      body.innerHTML = "<p style='padding:8px;color:var(--muted)'>Add your OpenAI API key in the widget editor.</p>";
      return;
    }
    body.innerHTML = "<p style='padding:8px'>Key loaded: " + creds.apiKey.slice(0, 8) + "...</p>";
  },
  render: function(container, config, state) {},
  defaultConfig: function() { return {}; }
});
```

Add it to a profile config, reload. Verify:
- Without credentials: "Add your API key" message shows
- After adding key in editor: widget re-loads and shows truncated key

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat(credentials): widget credential system complete"
```
