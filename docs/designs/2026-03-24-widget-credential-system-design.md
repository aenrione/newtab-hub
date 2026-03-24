# Widget Credential System Design

**Date:** 2026-03-24
**Status:** Approved

## Problem

newtab-hub widgets currently have no way to store API keys or tokens for authenticated external services (OpenAI, Linear, Google Calendar, etc.). There is no credential abstraction, so widget authors building integrations would have to invent their own storage patterns — leading to inconsistency, potential accidental sync of secrets, and poor UX.

## Goals

- Allow widget authors to declare credential fields as part of their widget registration
- Store credentials locally only — never synced via WebDAV
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
  load: async function(config, credentials) {
    const { apiKey } = credentials;
    // use apiKey to call OpenAI API
  },
  render: function(container, config, state, credentials) {
    // credentials available for inline render-time use
  },
  renderEditor: function(container, config, onChange, navOptions) {
    // credential fields rendered automatically below this
  },
  defaultConfig: function() {
    return { model: "gpt-4o-mini" };
  }
});
```

- `credentialFields` is optional. Omitting it means the widget behaves exactly as today.
- Each field: `{ key: string, label: string, placeholder?: string }`
- `credentials` passed to `load()` and `render()` is `{}` when no credentials are saved yet.

## Storage

Credentials are stored in `chrome.storage.local` under a key per widget instance:

```
"new-tab-creds-{widgetId}" → { apiKey: "sk-..." }
```

- Widget ID is the unique instance identifier already used for layout and config storage.
- Keys are isolated per widget instance (two OpenAI widgets each have their own key).
- No credential data ever appears in the profile config or grid layout objects.

## Sync Exclusion

The WebDAV sync payload builder in `background.js` already controls what gets serialized. A single filter excludes any storage key matching `new-tab-creds-*` from the sync payload. Widget authors need not do anything — exclusion is automatic.

## Editor UX

When a widget has `credentialFields`:

1. The widget editor renders credential inputs **below** the regular config fields, in a visually separated "Credentials" section with a lock icon.
2. Each field renders as `<input type="password">` with a show/hide toggle button.
3. Fields save to `Hub.credentials.save(widgetId, { key: value })` immediately on blur — not tied to the main config Save button, since credentials are in a separate store.
4. A "Remove credentials" button clears the storage key for that widget instance (`Hub.credentials.clear(widgetId)`).

## Infrastructure Changes

### New: `js/credentials.js` (~40 lines)

Thin wrapper over `chrome.storage.local` for the `new-tab-creds-*` namespace:

```js
Hub.credentials = {
  load(widgetId),       // → Promise<object>  (resolves {} if not set)
  save(widgetId, obj),  // → Promise
  clear(widgetId)       // → Promise
};
```

### Modified: `js/main.js`

- Before loading each widget, call `Hub.credentials.load(widgetId)` and pass the result to `load()` and `render()` as the `credentials` argument.
- Widgets without `credentialFields` receive `credentials = {}` — no observable change.

### Modified: `js/customize.js`

- In `renderEditor()`, after rendering the widget's own editor UI, check `widget.credentialFields`.
- If present, append a "Credentials" section with password inputs wired to `Hub.credentials.save()` and a clear button wired to `Hub.credentials.clear()`.

### Modified: `background.js`

- In the sync payload builder, add a filter: exclude any storage key matching `new-tab-creds-*`.

### Unchanged

- `js/registry.js` — `credentialFields` is a plain declared property, no registry changes needed.
- All existing widgets — no modifications required.

## Affected Files

| File | Change |
|------|--------|
| `js/credentials.js` | **New** — credential storage API |
| `js/main.js` | Load credentials before widget `load()`/`render()` |
| `js/customize.js` | Render credential fields in widget editor |
| `background.js` | Exclude `new-tab-creds-*` from sync payload |
| `index.html` | Add `<script src="js/credentials.js">` |

## Example: OpenAI Chat Widget (Future)

```js
Hub.registry.register("openai-chat", {
  label: "OpenAI Chat",
  credentialFields: [{ key: "apiKey", label: "API Key", placeholder: "sk-..." }],
  load: async function(config, credentials) {
    if (!credentials.apiKey) return { error: "No API key configured" };
    // fetch from OpenAI...
  },
  render: function(container, config, state, credentials) {
    if (!credentials.apiKey) {
      container.innerHTML = "<p>Add your OpenAI API key in the widget editor.</p>";
      return;
    }
    // render chat UI...
  },
  renderEditor: function(container, config, onChange, navOptions) {
    // model selector, temperature, etc.
  },
  defaultConfig: function() { return { model: "gpt-4o-mini" }; }
});
```

## Security Notes

- `chrome.storage.local` is sandboxed to the extension and protected by the OS.
- Credentials are never logged, never included in sync payloads, and never appear in exported profiles.
- Widget authors should document that users should use scoped/read-only API keys where possible.
- No encryption beyond what the browser provides is applied — consistent with how WebDAV credentials are currently stored.
