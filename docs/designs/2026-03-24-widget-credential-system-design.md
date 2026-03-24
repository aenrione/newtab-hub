# Widget Credential System Design

**Date:** 2026-03-24
**Status:** Approved

## Problem

newtab-hub widgets currently have no way to store API keys or tokens for authenticated external services (OpenAI, Linear, Google Calendar, etc.). There is no credential abstraction, so widget authors building integrations would have to invent their own storage patterns — leading to inconsistency, potential accidental sync of secrets, and poor UX.

## Goals

- Allow widget authors to declare credential fields as part of their widget registration
- Store credentials locally only — never synced via WebDAV, never exported
- Render credential inputs in the widget editor automatically (masked, with show/hide toggle)
- Pass credentials to `load()` and `render()` alongside `config`
- Remain fully backwards compatible — widgets without credentials are unaffected
- No new dependencies, no build step changes

## Non-Goals

- OAuth / token refresh flows (future work)
- A global/shared credential store (per-widget is sufficient for now)
- Encrypting credentials beyond what `chrome.storage.local` provides at the OS level

## Widget Author Contract

Widget authors opt in by adding a `credentialFields` array to their registration:

```js
Hub.registry.register("openai-chat", {
  label: "OpenAI Chat",
  icon: "✦",
  credentialFields: [
    { key: "apiKey", label: "API Key", placeholder: "sk-..." }
  ],
  load: async function(container, config, state, token, credentials) {
    const { apiKey } = credentials;
    // use apiKey to call OpenAI API
  },
  render: function(container, config, state, credentials) {
    // credentials available for inline render-time use
  },
  renderEditor: function(container, config, onChange, navOptions) {
    // credential fields are rendered automatically after this by grid.js
  },
  defaultConfig: function() {
    return { model: "gpt-4o-mini" };
  }
});
```

- `credentialFields` is optional. Omitting it means the widget behaves exactly as today.
- Each field: `{ key: string, label: string, placeholder?: string }`
- `credentials` is the **last argument** on all call signatures — existing widgets that don't declare it simply ignore it.
- `credentials` is `{}` when no credentials are saved yet.

### Updated call signatures

- `load(container, config, state, token)` → `load(container, config, state, token, credentials)`
- `render(container, config, state)` → `render(container, config, state, credentials)`

Adding `credentials` as the last argument is backwards compatible — existing widgets receive `{}` and ignore it.

## Storage

Credentials are stored in `chrome.storage.local` under a key per widget instance:

```
"new-tab-creds-{widgetId}" → { apiKey: "sk-..." }
```

- Widget ID is the unique instance identifier already used for layout and config storage.
- Keys are isolated per widget instance (two OpenAI widgets each have their own key).
- No credential data ever appears in the profile config or grid layout objects.

## Credential Cache

Because `renderAllWidgets()` and `runHealthChecks()` are synchronous and cannot `await` credential reads, `Hub.credentials` maintains an in-memory cache:

- `Hub.credentials.load(widgetId)` — async, fetches from `chrome.storage.local`, populates cache, resolves `{}` if not set.
- `Hub.credentials.cached(widgetId)` — synchronous, returns last loaded value from cache, or `{}` if never loaded.

On the initial page render, `renderAllWidgets()` runs before the async load loop in `renderDashboard()`, so all synchronous render call sites will receive `{}` on first paint. This is acceptable: credential-aware widgets must handle `{}` gracefully (e.g., show "Add your API key in the widget editor"). After async loads complete and cache is populated, subsequent renders (health check refreshes, config saves) will have credentials available.

## Sync & Export/Import Exclusion

`new-tab-creds-*` keys are explicitly excluded at every point where storage data leaves the device:

1. **Upload path** (`background.js` `isPayloadKey()`): extend to return `false` for keys starting with `new-tab-creds-`.

2. **Download path** (`background.js` `doDownload()` inline filter): `doDownload` has its own inline key filter separate from `isPayloadKey`. Add `k.startsWith("new-tab-creds-")` to this inline filter to prevent a crafted WebDAV file from overwriting local credentials.

3. **Sync trigger** (`background.js` storage change listener): the listener calls `scheduleUpload()` for relevant storage changes. Add a prefix check `k.startsWith("new-tab-creds-")` to the `relevant` predicate (or equivalent early-exit) before the `scheduleUpload()` call, so credential saves never trigger a sync cycle.

4. **Export handler** (`customize.js`): extend the key filter to exclude keys starting with `new-tab-creds-`.

5. **Import handler** (`customize.js`): silently skip any key starting with `new-tab-creds-` found in a backup file.

## Editor UX

`plugin.renderEditor()` is called from `grid.js` (line ~245). After calling `plugin.renderEditor(body, config, onChange, navOptions)`, `grid.js` checks `plugin.credentialFields`. If present:

1. Append a visually separated "Credentials" section with a lock icon below the widget's editor UI.
2. Call `Hub.credentials.load(widgetId)` (async, `grid.js` already calls `renderEditor` from an async context) to get existing values.
3. Render each field as `<input type="password">` with a show/hide toggle. Pre-populate with the saved value if one exists (showing `••••••`); leave empty otherwise.
4. On blur, call `Hub.credentials.save(widgetId, { [key]: value })` to persist the updated field.
5. Include a "Remove credentials" button that calls `Hub.credentials.clear(widgetId)` and empties all credential inputs.

## Widget Deletion Cleanup

When a widget is removed from the grid, its `new-tab-creds-{widgetId}` key must be deleted to prevent orphaned storage. `grid.js` already handles widget removal — extend the deletion callback to call `Hub.credentials.clear(widgetId)`.

## Infrastructure Changes

### New: `js/credentials.js` (~50 lines)

```js
Hub.credentials = {
  _cache: {},
  load(widgetId),       // → Promise<object> — fetches from storage, populates cache, resolves {}
  cached(widgetId),     // → object — synchronous cache read, returns {} if not loaded
  save(widgetId, obj),  // → Promise — merges obj into stored credentials
  clear(widgetId)       // → Promise — deletes storage key and clears cache entry
};
```

### Modified: `js/main.js` — 5 call sites

1. **`renderDashboard()` async loop** (line ~289): before `plugin.load(el, config, state, token)`, `await Hub.credentials.load(widgetId)`. Pass result as fifth argument.
2. **`renderAllWidgets()`** (line ~232): pass `Hub.credentials.cached(widgetId)` as fourth argument to `plugin.render()`. Resolves `{}` on first paint; populated on subsequent renders.
3. **`runHealthChecks()`** (line ~86): pass `Hub.credentials.cached(widgetId)` as fourth argument to `plugin.render()`.
4. **`onConfigSave()` render call** (line ~718): pass `Hub.credentials.cached(widgetId)` as fourth argument to `plugin.render()`.
5. **`onConfigSave()` load call** (line ~722): `onConfigSave` is already `async`. `await Hub.credentials.load(widgetId)`, pass as fifth argument to `plugin.load()`. (Changes existing fire-and-forget to awaited — intentional, ensures load completes before editor re-renders.)

### Modified: `js/grid.js`

- After calling `plugin.renderEditor()`, check `plugin.credentialFields` and inject the credential UI section as described in Editor UX above.
- On widget deletion, call `Hub.credentials.clear(widgetId)`.

### Modified: `js/customize.js`

- **Export:** extend key filter to exclude `new-tab-creds-*`.
- **Import:** skip `new-tab-creds-*` keys found in backup files.

### Modified: `background.js`

- Extend `isPayloadKey()` to exclude `new-tab-creds-*` (upload path).
- Extend `doDownload()` inline key filter to exclude `new-tab-creds-*` (download path).
- Add prefix check in sync trigger listener to skip `new-tab-creds-*` key changes before calling `scheduleUpload()`.

### Modified: `index.html`

Add `<script src="js/credentials.js">` **before** `main.js` and `customize.js`. Script load order is the dependency mechanism in this no-module project.

## Affected Files

| File | Change |
|------|--------|
| `js/credentials.js` | **New** — credential storage API with in-memory cache |
| `js/main.js` | Pass credentials to all 5 `load()`/`render()` call sites |
| `js/grid.js` | Inject credential UI after `renderEditor()`; clear on widget delete |
| `js/customize.js` | Export/import key filtering |
| `background.js` | Exclude `new-tab-creds-*` from upload, download, and sync trigger |
| `index.html` | Add `credentials.js` script before main.js and customize.js |

## Example: OpenAI Chat Widget (Future)

```js
Hub.registry.register("openai-chat", {
  label: "OpenAI Chat",
  credentialFields: [{ key: "apiKey", label: "API Key", placeholder: "sk-..." }],
  load: async function(container, config, state, token, credentials) {
    if (!credentials.apiKey) return { error: "No API key configured" };
    // fetch from OpenAI...
  },
  render: function(container, config, state, credentials) {
    if (!credentials.apiKey) {
      container.innerHTML = "<p>Add your OpenAI API key in the widget editor.</p>";
      return;
    }
    // render widget UI...
  },
  renderEditor: function(container, config, onChange, navOptions) {
    // model selector, temperature, etc. — credential fields added automatically below
  },
  defaultConfig: function() { return { model: "gpt-4o-mini" }; }
});
```

## Security Notes

- `chrome.storage.local` is sandboxed to the extension and protected by the OS.
- Credentials are never logged, never included in sync payloads (upload or download), never exported, and never importable from backup files.
- Widget authors should document that users should use scoped/read-only API keys where possible.
- No encryption beyond what the browser provides — consistent with how WebDAV credentials are currently stored.
