# Sync Keyboard Shortcuts Design

**Date:** 2026-03-23
**Status:** Approved

## Overview

Add keyboard shortcuts to trigger WebDAV sync operations directly from the new tab page, along with a persistent sync status badge and toast notifications — removing the need to open the browser popup for routine sync actions.

## Keyboard Shortcuts

### Key bindings

| Key | Action | Confirm? |
|-----|--------|----------|
| `y` | Pull (download from WebDAV) | No — fires immediately |
| `Shift+Y` | Push (upload to WebDAV) | Yes — toast confirm banner |

### Behavior

- Both shortcuts are no-ops when WebDAV is not configured (URL missing from storage). This guard lives inside `pull()` and `confirmPush()` themselves (not just in the keyboard handler), so the help-dialog action callbacks also respect it.
- Both shortcuts are no-ops when `new-tab-sync-status === "syncing"` (sync already in progress) — the badge spinner is the in-progress signal. Same: guard lives inside `pull()`/`confirmPush()`.
- `y` sends `syncDownload` to the background service worker immediately. No confirmation is shown — this is intentional and consistent with the auto-download that already fires on every new tab open without a prompt.
- `Shift+Y` shows a toast-style confirm banner (bottom-left) with **"Push to WebDAV? [Yes] [No]"** before sending `syncUpload`. Push is confirmed because it overwrites the remote with local state.
- Both shortcuts are blocked while typing (existing `typing` guard in `keyboard.js` applies).

### `keyboard.js` integration details

- Add `y` to the `RESERVED` object: `var RESERVED = { h:1, j:1, k:1, l:1, d:1, u:1, z:1, e:1, p:1, t:1, a:1, y:1 };`. This is sufficient — `ERGO_KEYS` includes `y` but `RESERVED` gates all chord assignment, so no chord will ever claim `y`.
- Insert the `y`/`Shift+Y` handlers in the `bind()` keydown listener **after the `!typing` guard and before the chord-active block** (the block that checks `chordState.active`). Placing it before the chord-active block is essential — the chord-active block swallows all unrecognised keys and would suppress the sync shortcut if the handler came later. The handlers must be ordered as follows:

```js
/* Sync shortcuts */
if (!typing && key === "y" && !e.metaKey && !e.ctrlKey && !e.altKey) {
  e.preventDefault();
  if (e.shiftKey) {
    if (Hub.syncStatus) Hub.syncStatus.confirmPush();
  } else {
    if (Hub.syncStatus) Hub.syncStatus.pull();
  }
  return;
}
```

Using `key === "y"` (lowercased) with an explicit `e.shiftKey` branch covers both `y` and `Shift+Y` without any ordering ambiguity. The `Hub.syncStatus` null guard handles the edge case where `sync-status.js` has not yet initialised when the key is pressed. Also update the inline comment on the `ERGO_KEYS` line to include `y` in the excluded keys list.

### Help dialog entries

Add to `SHORTCUTS` array in `js/help.js` as two separate rows (unlike `P / Shift+P` which shares one row, pull and push are split because they have different risk profiles and different confirmation behavior — combining them would obscure that asymmetry):

```js
["Y", "Pull from WebDAV", function () { if (Hub.syncStatus) Hub.syncStatus.pull(); }],
["Shift+Y", "Push to WebDAV", function () { if (Hub.syncStatus) Hub.syncStatus.confirmPush(); }],
```

### Keys left unchanged

- `p` / `Shift+P` — profile cycling (unchanged)
- `t` — theme sidebar (unchanged)

## Sync Status Badge (bottom-right)

A new `Hub.syncStatus` module in `js/sync-status.js`, initialized from `js/main.js`.

### Visibility

- Hidden when WebDAV URL is not configured.
- Always visible otherwise.

### States

| `new-tab-sync-status` | `new-tab-sync-error` | Appearance |
|-----------------------|----------------------|-----------|
| `"idle"` | any | Cloud icon + relative timestamp ("Synced 2m ago") |
| `"syncing"` | any | Spinning icon, no timestamp |
| `"error"` | non-null string | Red dot + "Sync error" — hover reveals error message |
| `"error"` | `null` | Red dot + "Sync error" — hover shows "Unknown error" (can occur on SW startup recovery) |
| missing/undefined | any | Treated as idle |

### Data

- Reads `new-tab-sync-status`, `new-tab-sync-last`, `new-tab-sync-error`, `new-tab-webdav-url` on init.
- Subscribes to `chrome.storage.onChanged` for live updates (same pattern as `popup.js`).
- Relative timestamp updates via `setInterval` every 30s.

### Interaction

- Clicking the badge does nothing — it is a read-only indicator.

## Toast Notifications (bottom-left)

Implemented in the same `js/sync-status.js` module.

### Pull (`y`) toasts

| Event | Message |
|-------|---------|
| Success | "Pulled" |
| Error | "Pull failed: [error message]" |

### Push (`Shift+Y`) toasts

| Event | Message |
|-------|---------|
| Confirm prompt | "Push to WebDAV? [Yes] [No]" (persists until answered) |
| Success | "Pushed" |
| Error | "Push failed: [error message]" |

### Behavior

- Success/error toasts auto-dismiss after 3 seconds.
- Confirm banner persists until the user answers Yes or No.
- Toasts stack vertically if multiple fire in quick succession.
- No toast is shown while the operation is in-flight — the badge spinner serves as the in-progress indicator.

## Implementation Scope

### Files changed

| File | Change |
|------|--------|
| `js/sync-status.js` | New module — badge + toast rendering, storage listener, `pull()` and `confirmPush()` |
| `js/keyboard.js` | Add `y`/`Shift+Y` handler block; add `y` to `RESERVED`; update `ERGO_KEYS` inline comment to include `y` |
| `js/help.js` | Add two tuples to `SHORTCUTS` array |
| `js/main.js` | Initialize `Hub.syncStatus` |
| `index.html` | Add `<script src="js/sync-status.js">` |
| `styles.css` | Badge and toast styles |

### Out of scope

- Changes to `popup.js` or `background.js` — shortcuts reuse existing `syncUpload`/`syncDownload` messages.
- Any change to profile cycling (`p`/`P`) or theme sidebar (`t`).
