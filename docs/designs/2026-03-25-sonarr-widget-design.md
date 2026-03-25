# Sonarr "On Deck" Widget — Design Spec

## Overview

A calendar widget that shows upcoming TV episodes from a self-hosted Sonarr instance.
This is the first proof-of-concept widget that uses `Hub.credentials` for API key storage.

---

## Scope

One new file: `js/widgets/sonarr.js`. No changes to core files beyond registering the script in `index.html`.

---

## Widget Registration

```js
Hub.registry.register("sonarr", {
  label: "Sonarr",
  icon: "calendar",
  defaultConfig: function () { return { title: "On Deck", url: "http://localhost:8989", days: 7 }; },
  credentialFields: [{ key: "apiKey", label: "API Key", type: "password" }],
  render,
  load,
  renderEditor
});
```

`label` is shown in the Add Widget picker. `icon` is currently unused by the picker (which resolves icons via `Hub.iconForType[type]`). The implementer must add `Hub.iconForType["sonarr"] = "calendar"` (or another existing `Hub.icons` key) in `js/icons.js` for the picker to display an icon.
`credentialFields` is declared so that `grid.js` automatically injects the credential UI section into the editor modal.
`defaultConfig` must be a function — `grid.js` calls `plugin.defaultConfig()` when a widget is added from the picker.

---

## Credential / Config Split

- **Config** (`chrome.storage.local` via widget registry, synced via WebDAV): `title`, `url`, `days`
- **Credentials** (`Hub.credentials`, key `new-tab-creds-{widgetId}`, never synced): `{ apiKey }`

The widget reads `config._id` at runtime to derive the credential storage key. It never stores `apiKey` in config.

---

## Data Flow

```
render(el, config)
  → paint skeleton (header + empty list or no-credentials hint)

load(el, config, state, token)
  → Hub.credentials.load(config._id)
  → if no apiKey → render no-credentials state → return
  → fetch {config.url}/api/v3/calendar?start=TODAY&end=TODAY+days
      headers: { "X-Api-Key": apiKey }
  → if (token !== state.renderToken) return  ← stale-render guard
  → on success → group episodes by local date → render list
  → on network/auth error → render error state
```

`render()` is synchronous; `load()` is async (`el, config, state, token`) and updates the DOM in place when data arrives. The stale-render guard (`token !== state.renderToken`) must be checked after the `await fetch()` resolves to avoid writing to a widget container that has already been re-rendered.

`renderEditor(container, config, onChange, navOptions)` — four parameters. `navOptions` can be ignored by this widget (it is used by list-based editors).

---

## Sonarr API

Endpoint: `GET /api/v3/calendar?start=YYYY-MM-DD&end=YYYY-MM-DD`
Auth header: `X-Api-Key: {apiKey}`
Response: array of episode objects. Relevant fields:

| Field | Use |
|---|---|
| `series.title` | Show name |
| `series.titleSlug` | URL slug for series page link (Sonarr v3; may differ in v4 — null-guard required: if absent, render the row as non-clickable text) |
| `seasonNumber` | Season label |
| `episodeNumber` | Episode label |
| `airDateUtc` | Converted to local date/time for display |

---

## Widget UI States

### Normal (episodes loaded)

```
┌─────────────────────────────┐
│ On Deck                     │
├─────────────────────────────┤
│ Today                       │  ← .sonarr-day header
│  The Penguin    S01E05·21:00│  ← .sonarr-episode <a>
│  Yellowstone    S05E08·22:00│
│ Tomorrow                    │
│  Severance      S02E07·00:00│
│  The Bear       S03E01·03:00│
│ Wed Mar 27                  │
│  The Last of Us S02E03·21:00│
└─────────────────────────────┘
```

- List is scrollable (`overflow-y: auto`)
- Each episode row is a `<a>` element; clicking opens `{url}/series/{titleSlug}` in a new tab
- Day headers: "Today", "Tomorrow", then `"Ddd Mon D"` (e.g., "Wed Mar 27")

### No credentials

```
┌─────────────────────────────┐
│ On Deck                     │
├─────────────────────────────┤
│  Add your Sonarr API key    │
│  in the widget editor.      │
└─────────────────────────────┘
```

### Error / unreachable

```
┌─────────────────────────────┐
│ On Deck                     │
├─────────────────────────────┤
│  Could not reach Sonarr.    │
└─────────────────────────────┘
```

### Empty (API returned no episodes)

```
┌─────────────────────────────┐
│ On Deck                     │
├─────────────────────────────┤
│  No episodes in the next    │
│  7 days.                    │
└─────────────────────────────┘
```

---

## Editor UI

The editor uses the standard grid.js `renderEditor()` pattern. Fields are stacked full-width:

1. **Widget title** — text input, default "On Deck"
2. **Sonarr URL** — text input, default `http://localhost:8989`
3. **Days to show** — number input (1–30), default 7

Below a visual divider, `grid.js` injects the credential section automatically from `credentialFields`:
- **API Key** — password input with Show/Hide toggle
- **Remove credentials** button

`renderEditor()` only renders the three config fields. The credential section is injected by `grid.js` (already implemented).

---

## CSS

New classes, scoped to the widget:

| Class | Purpose |
|---|---|
| `.sonarr-list` | Scrollable episode list container |
| `.sonarr-day` | Day group header (muted uppercase label) |
| `.sonarr-episode` | Episode row — flex row, show name left, `SxxExx·HH:MM` right |

CSS variables to use: `--text`, `--muted`, `--bg`, `--surface`, `--border`.
Do NOT use `--fg`, `--text-muted`, or `--bg-secondary` — these are not defined in the project.

Styles are added to `styles.css` following existing widget patterns (`.widget-header`, `.link-list`, etc.).

---

## Files Changed

| File | Change |
|---|---|
| `js/widgets/sonarr.js` | New file — full widget implementation |
| `js/icons.js` | Add `Hub.iconForType["sonarr"] = "<key>"` |
| `styles.css` | Add `.sonarr-list`, `.sonarr-day`, `.sonarr-episode` |
| `index.html` | Add `<script src="js/widgets/sonarr.js"></script>` |

No changes to `js/main.js`, `js/grid.js`, `js/credentials.js`, `background.js`, or `js/customize.js`.
