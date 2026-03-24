# Widget Credential System Design

**Date:** 2026-03-24
**Status:** Approved

## Problem

newtab-hub widgets currently have no way to store API keys or tokens for authenticated external services (OpenAI, Linear, Google Calendar, etc.). There is no credential abstraction, so widget authors building integrations would have to invent their own storage patterns — leading to inconsistency, potential accidental sync of secrets, and poor UX.

## Goals

- Provide a simple `Hub.credentials` utility that any widget can call directly
- Store credentials locally only — never synced via WebDAV, never exported
- Render credential inputs in the widget editor automatically (masked, with show/hide toggle)
- Remain fully backwards compatible — existing widgets are completely unaffected
- No new dependencies, no build step changes

## Non-Goals

- OAuth / token refresh flows (future work)
- Automatic injection of credentials into `load()`/`render()` signatures (widgets grab what they need)
- A global/shared credential store (per-widget keyed by instance ID)
- Encrypting credentials beyond what `chrome.storage.local` provides at the OS level

## Design Philosophy

Widgets that need credentials call `Hub.credentials` themselves — the same way they call `Hub.cache` or any other utility. No changes to the `load()` or `render()` call signatures. No changes to `main.js`. The credential system is a tool widget authors opt into, not infrastructure that wraps every widget.

## Widget Author Contract

Widget authors opt in by adding a `credentialFields` array to their registration and calling `Hub.credentials.load()` in their `load()` function:

```js
Hub.registry.register("openai-chat", {
  label: "OpenAI Chat",
  icon: "✦",
  credentialFields: [
    { key: "apiKey", label: "API Key", placeholder: "sk-..." }
  ],
  load: async function(container, config, state, token) {
    var creds = await Hub.credentials.load(config._id);
    if (!creds.apiKey) {
      container.querySelector(".widget-body").innerHTML =
        "<p class='widget-empty'>Add your API key in the widget editor.</p>";
      return;
    }
    // use creds.apiKey to fetch data...
  },
  render: function(container, config, state) {
    // sync render using data already loaded in load()
  },
  renderEditor: function(container, config, onChange, navOptions) {
    // model selector, temperature, etc.
    // credential fields are rendered automatically after this by grid.js
  },
  defaultConfig: function() {
    return { model: "gpt-4o-mini" };
  }
});
```

- `credentialFields` is optional. Omitting it means the widget behaves exactly as today.
- Each field: `{ key: string, label: string, placeholder?: string }`
- `config._id` is the widget's unique instance ID, automatically available on every widget's config object (see main.js change below).
- `credentials` resolves to `{}` when no credentials have been saved yet — widget handles this gracefully.

### `config._id`

The only change to `main.js` is that the widget's instance ID is embedded in its config before being passed to `load()` and `render()`:

```js
// In renderDashboard() before plugin.load(...)
var configWithId = Object.assign({}, w.config || {}, { _id: w.id });
plugin.load(el, configWithId, state, token);
```

This gives every widget access to its own instance ID without changing function signatures. `grid.js` uses the same `widgetId` value when saving credentials from the editor UI, so the keys always match.

## Storage

Credentials are stored in `chrome.storage.local` under a key per widget instance:

```
"new-tab-creds-{widgetId}" → { apiKey: "sk-..." }
```

- Widget ID is the unique instance identifier already used for layout and config storage.
- Keys are isolated per widget instance (two OpenAI widgets each have their own key).
- No credential data ever appears in the profile config or grid layout objects.

## Sync & Export/Import Exclusion

`new-tab-creds-*` keys are explicitly excluded at every point where storage data leaves the device:

1. **Upload path** (`background.js` `isPayloadKey()`): add `k.startsWith("new-tab-creds-")` check to return `false`.

2. **Download path** (`background.js` `doDownload()` inline filter): add `k.startsWith("new-tab-creds-")` check — prevents a crafted WebDAV file from overwriting local credentials.

3. **Sync trigger** (`background.js` storage change listener): add `&& !k.startsWith("new-tab-creds-")` to the `relevant` predicate so credential saves do not schedule a sync upload. Note: `SYNC_TRIGGER_SKIP` uses exact-key lookups and cannot match dynamic `new-tab-creds-{id}` keys — the prefix check in the `relevant` predicate is the correct location.

4. **Export handler** (`customize.js`): add `k.startsWith("new-tab-creds-")` to the key exclusion filter.

5. **Import handler** (`customize.js`): skip any key starting with `new-tab-creds-` found in a backup file.

## Editor UX

`plugin.renderEditor()` is called from `grid.js` (line ~245). After calling it, `grid.js` checks `plugin.credentialFields`. If present:

1. Appends a visually separated "Credentials" section below the widget's editor UI.
2. Calls `Hub.credentials.load(widgetId)` to get existing values.
3. Renders each field as `<input type="password">` with a show/hide toggle. Pre-populates with the saved value if one exists; leaves empty otherwise.
4. On blur, calls `Hub.credentials.save(widgetId, { [key]: value })`.
5. Includes a "Remove credentials" button that calls `Hub.credentials.clear(widgetId)` and empties all inputs.

## Widget Deletion Cleanup

When a widget is removed from the grid, `grid.js` calls `Hub.credentials.clear(widgetId)` to delete the orphaned storage key.

## Infrastructure Changes

### New: `js/credentials.js` (~40 lines)

Uses `chrome.storage.local` directly (not `Hub.store`, which is a per-instance state object not globally accessible):

```js
Hub.credentials = {
  load(widgetId),       // → Promise<object> — resolves {} if not set
  save(widgetId, obj),  // → Promise — merges obj into stored credentials
  clear(widgetId)       // → Promise — removes the storage key
};
```

### Modified: `js/main.js` — one small change

In the widget render/load paths, embed `_id` in the config object passed to plugins:
```js
var configWithId = Object.assign({}, w.config || {}, { _id: w.id });
```
Apply this in `renderAllWidgets()` and the async `renderDashboard()` load loop. No signature changes.

### Modified: `js/grid.js`

- After `plugin.renderEditor()`, check `plugin.credentialFields` and inject credential UI.
- On widget deletion, call `Hub.credentials.clear(widgetId)`.

### Modified: `js/customize.js`

- Export: exclude `new-tab-creds-*` keys.
- Import: skip `new-tab-creds-*` keys.

### Modified: `background.js`

- `isPayloadKey()`: exclude `new-tab-creds-*`.
- `doDownload()` inline filter: exclude `new-tab-creds-*`.
- Sync trigger listener `relevant` predicate: exclude `new-tab-creds-*`.

### Modified: `index.html`

Add `<script src="js/credentials.js">` before `grid.js` (which calls `Hub.credentials.clear` on delete and `Hub.credentials.load` in the editor). Since this is a no-module project, load order is the dependency mechanism.

## Affected Files

| File | Change |
|------|--------|
| `js/credentials.js` | **New** — `Hub.credentials` utility (load/save/clear) |
| `js/main.js` | Embed `_id` in config in `renderAllWidgets()` and `renderDashboard()` |
| `js/grid.js` | Inject credential UI after `renderEditor()`; clear on widget delete |
| `js/customize.js` | Export/import key filtering |
| `background.js` | Exclude `new-tab-creds-*` from upload, download, and sync trigger |
| `index.html` | Add `credentials.js` before `grid.js` |
| `styles.css` | Styles for credential section in widget editor |

## Example: OpenAI Chat Widget (Future)

```js
Hub.registry.register("openai-chat", {
  label: "OpenAI Chat",
  credentialFields: [{ key: "apiKey", label: "API Key", placeholder: "sk-..." }],
  load: async function(container, config, state, token) {
    var creds = await Hub.credentials.load(config._id);
    if (!creds.apiKey) {
      container.innerHTML = "<p>Add your OpenAI API key in the widget editor.</p>";
      return;
    }
    // fetch from OpenAI using creds.apiKey...
  },
  render: function(container, config, state) {
    // uses data already fetched in load()
  },
  renderEditor: function(container, config, onChange, navOptions) {
    // model selector, temperature, etc.
  },
  defaultConfig: function() { return { model: "gpt-4o-mini" }; }
});
```

## Security Notes

- `chrome.storage.local` is sandboxed to the extension and protected by the OS.
- Credentials are never logged, never included in sync payloads (upload or download), never exported, and never importable from backup files.
- Widget authors should document that users should use scoped/read-only API keys where possible.
- No encryption beyond what the browser provides — consistent with how WebDAV credentials are currently stored.
