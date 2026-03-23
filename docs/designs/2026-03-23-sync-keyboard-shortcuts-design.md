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

- Both shortcuts are no-ops when WebDAV is not configured (URL missing from storage).
- `y` sends `syncDownload` message to the background service worker immediately.
- `Shift+Y` shows a toast-style confirm banner (bottom-left) with **"Push to WebDAV? [Yes] [No]"** before sending `syncUpload`.
- `y` is added to `RESERVED` in `keyboard.js` so the chord system never claims it.
- Both shortcuts are blocked while typing (existing `typing` guard applies).
- Help dialog (`js/help.js` `SHORTCUTS` array) gains two entries:
  - `Y` → "Pull from WebDAV"
  - `Shift+Y` → "Push to WebDAV"

### Keys left unchanged

- `p` / `Shift+P` — profile cycling (unchanged)
- `t` — theme sidebar (unchanged)

## Sync Status Badge (bottom-right)

A new `Hub.syncStatus` module in `js/sync-status.js`, initialized from `js/main.js`.

### Visibility

- Hidden when WebDAV URL is not configured.
- Always visible otherwise.

### States

| State | Appearance |
|-------|-----------|
| Idle | Cloud icon + relative timestamp ("Synced 2m ago") |
| Syncing | Spinning icon, no timestamp |
| Error | Red dot + "Sync error" — hover reveals error message |

### Data

- Reads `new-tab-sync-status`, `new-tab-sync-last`, `new-tab-sync-error`, `new-tab-webdav-url` on init.
- Subscribes to `chrome.storage.onChanged` for live updates (same pattern as `popup.js`).
- Relative timestamp updates via a `setInterval` (every 30s is sufficient).

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
| `js/sync-status.js` | New module — badge + toast rendering, storage listener, keyboard-triggered sync |
| `js/keyboard.js` | Add `y`/`Shift+Y` handlers; add `y` to `RESERVED` |
| `js/help.js` | Add two entries to `SHORTCUTS` array |
| `js/main.js` | Initialize `Hub.syncStatus` |
| `index.html` | Add `<script src="js/sync-status.js">` |
| `styles.css` | Badge and toast styles |

### Out of scope

- Changes to `popup.js` or `background.js` — keyboard shortcuts reuse existing message actions (`syncUpload`, `syncDownload`).
- Any change to profile cycling (`p`/`P`) or theme sidebar (`t`).
