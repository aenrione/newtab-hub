# Widget Editor Keyboard Navigation Design

**Date:** 2026-03-23
**Status:** Approved

## Overview

Improve keyboard navigation in widget config/edit modals so that power users can operate them entirely without a mouse. The solution must be extensible to any present or future widget with minimal per-widget effort.

## Goals

- Fully mouseless operation of widget editor modals
- Vim-inspired two-mode navigation (list navigation + field editing)
- Visible inline key hint badges so shortcuts are discoverable
- Zero boilerplate for widgets that already use `buildListEditor`
- Simple opt-in for new widgets via data attributes

## Approach: Data-Attribute Driven Navigation

A central `EditorKeyboard` module attaches to every config modal when it opens. It reads `data-nav-*` attributes from the DOM to understand what is navigable and injects key hint badges. No widget-specific JS is needed — widgets declare their structure via attributes.

The existing `buildListEditor` shared utility (used by links, pinned, markets, feeds) gets the attributes added once, giving all those widgets full keyboard navigation for free. New widgets that render their own editor HTML opt in by adding the same attributes.

### Replacing `onConfigKey`

`openConfigModal` in `grid.js` currently registers an `onConfigKey` handler on `document` that:
- Closes the modal on Escape
- On Enter, advances to the next focusable or closes
- Traps Tab across the entire panel

**`EditorKeyboard` fully replaces `onConfigKey`.** The old handler must be removed from `openConfigModal`. `EditorKeyboard` takes responsibility for all Escape, Enter, Tab, and modal-close behavior. The `data-nav-save` button's `.click()` method is used to close/save (this fires all existing click listeners on the Done button, which is the correct path).

## Navigation Model

### Two Modes

**List Mode** (default when modal opens, if a `[data-nav-list]` is present)
- Focus sits on a card as a whole (`.editor-card[data-nav-item]`)
- The focused card gets a visible accent outline

| Key | Action |
|-----|--------|
| `↑` / `k` | Previous card |
| `↓` / `j` | Next card |
| `Enter` / `i` | Enter Item Mode (focus first field in card) |
| `⇧↑` / `⇧↓` | Reorder card up/down |
| `⌫` / `x` | Delete focused card (`preventDefault()` called on `⌫` to block browser back-nav) |
| `n` | Add new card (calls `.click()` on `[data-nav-add]`) |
| `⌘Enter` | Save and close (calls `.click()` on `[data-nav-save]`) |
| `Esc` | Close modal (if no card is focused) |

**Item Mode** (inside a card's fields)
- Tab cycles between `[data-nav-field]` inputs within the active card
- Esc returns to List Mode, restoring focus to the card

| Key | Action |
|-----|--------|
| `Tab` | Next field in card |
| `⇧Tab` | Previous field in card |
| `Esc` | Exit to List Mode |
| `⌘Enter` | Save and close (calls `.click()` on `[data-nav-save]`) |

### Mode Transitions

```
[List Mode] --Enter/i--> [Item Mode]
[Item Mode] --Esc------> [List Mode]
[Any Mode]  --⌘Enter---> [Closed/Saved]
[List Mode, no card focused] --Esc--> [Closed]
```

### Header Fields (fields above the list)

Some widgets (e.g., link-group) render a standalone field **above** the `[data-nav-list]` container (e.g., a "Group title" input). These fields must be marked with `data-nav-header-field`. They are reachable in List Mode via `⇧Tab` from the first card (wraps up to header fields) and via `Tab` from the last header field (moves to first card). Header fields do not enter Item Mode — Tab and Shift+Tab navigate between header fields directly, and Enter on a header field moves focus to the first card in the list.

### Non-list Editors

For widget editors that have no `[data-nav-list]` (simple form-only widgets), `EditorKeyboard` falls back to plain Tab/Shift+Tab cycling between all `[data-nav-field]` and `[data-nav-header-field]` inputs, with `⌘Enter` to save. No modes are needed.

### Guard Note

`keyboard.js` returns early when `.modal-overlay` is present in the DOM (lines 288, 296, 309, 320 of `keyboard.js`). `EditorKeyboard` therefore does not conflict with the main-view navigation system. The old `onConfigKey` guard from `grid.js` is removed; `EditorKeyboard` takes sole ownership of keydown events while the modal is open.

## Key Hint Badges

Hints are injected as a `<div class="editor-nav-hints">` bar appended inside the focused card or at the bottom of the active card in Item Mode. They are re-rendered on mode and focus change.

**List Mode hints** (shown on focused card):
```
↑↓ navigate   ↵ edit   ⇧↑↓ reorder   ⌫ delete   n add
```

**Item Mode hints** (compact bar at bottom of active card):
```
Tab fields   Esc back
```

Hints use the same aesthetic as `.chord-index` badges.

## DOM After `buildListEditor` Mutation

`buildListEditor` rebuilds the entire list DOM on Add, Delete, and drag-drop reorder (via `container.replaceChildren()`). After any such rebuild, `EditorKeyboard`'s internal index state points to detached nodes.

**Recovery strategy:** `buildListEditor` accepts an optional `onRebuild` callback. When provided, it calls `onRebuild()` after each `replaceChildren()`. `openConfigModal` passes this callback as `() => editorKeyboard.rescan()`. `EditorKeyboard.rescan()` re-queries all `[data-nav-item]` and `[data-nav-field]` nodes, updates internal references, and restores focus to the card at the previously stored index (clamped to the new list length).

`buildListEditor` already takes a `config` and `onChange` parameter. The callback is passed as a third parameter: `buildListEditor(container, config, onChange, { onRebuild })`. Widgets that call `buildListEditor` don't need to change — `openConfigModal` supplies the callback via the shared options object.

## Data Attributes

| Attribute | Placed on | Purpose |
|-----------|-----------|---------|
| `data-nav-list` | Items container (`div` wrapping all cards) | Marks the navigable list |
| `data-nav-item` | Each `.editor-card` | Marks a navigable row/card |
| `data-nav-field` | Each `input`, `select`, `textarea` inside a card | Marks a focusable field within a card |
| `data-nav-header-field` | Inputs above the list container | Reachable via Tab/Shift+Tab from list edges |
| `data-nav-add` | The "Add" button | `EditorKeyboard` calls `.click()` on `n` keypress |
| `data-nav-save` | The "Done" button | `EditorKeyboard` calls `.click()` on `⌘Enter` |

## Implementation Scope

### New file: `js/editor-keyboard.js`
- `EditorKeyboard` class (~150 lines)
- `constructor(panel)` — takes the `.modal-panel` element
- `attach()` — sets up keydown listener, calls `rescan()` to build initial index
- `detach()` — removes listener (called on modal close)
- `rescan()` — re-queries `[data-nav-list]`, `[data-nav-item]`, `[data-nav-field]`, `[data-nav-header-field]`, restores focus by stored index
- Internal state: `mode` (`list` | `item` | `flat`), `activeItemIndex`, `activeFieldIndex`
- Renders/removes hint badges on mode/focus change

### Modified: `js/widgets/pinned.js` (`buildListEditor`)
- Add `data-nav-list` to the items container
- Add `data-nav-item` to each card element (on creation and each rebuild)
- Add `data-nav-field` to each `input`/`select` inside a card
- Add `data-nav-add` to the "Add" button
- Accept optional third parameter `{ onRebuild }` and call `onRebuild()` after each `replaceChildren()`

### Modified: `js/widgets/links.js` (`renderEditor`)
- Accept `navOptions` as a fourth parameter and forward it to `buildListEditor`
- Add `data-nav-header-field` to the "Group title" input

### Modified: `js/widgets/markets.js` (`renderEditor`)
- Accept `navOptions` as a fourth parameter and forward it to `buildListEditor`
- Add `data-nav-header-field` to the title input rendered above the list

### Modified: `js/widgets/feeds.js` (`renderEditor`)
- Accept `navOptions` as a fourth parameter and forward it to `buildListEditor`
- Add `data-nav-header-field` to the title/feed-url input rendered above the list

### Modified: `js/grid.js` (`openConfigModal`)
- **Remove** the existing `onConfigKey` document keydown listener
- After injecting widget's `renderEditor` content, instantiate `EditorKeyboard(panel)` and call `attach()`
- Call `plugin.renderEditor(body, config, onChange, { onRebuild: () => editorKeyboard.rescan() })` — the `navOptions` fourth argument is forwarded by all list-based widgets to `buildListEditor`; simple widgets ignore it
- Add `data-nav-save` to the "Done" button
- On modal close, call `editorKeyboard.detach()`

### No changes needed for:
- `js/keyboard.js` — `.modal-overlay` guards already prevent conflicts

## CSS

Add to `styles.css`:

```css
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
}
```

Outline opacity `0.5` matches `.chord-active`; `border-radius: var(--radius-md)` matches the card's own corners.

## Extensibility Contract

Any future widget that wants keyboard navigation in its editor:

1. Wrap its list container with `data-nav-list`
2. Mark each navigable row with `data-nav-item`
3. Mark each editable input with `data-nav-field`
4. Mark any fields above the list with `data-nav-header-field` (if applicable)
5. Mark its add button with `data-nav-add` (optional)
6. Accept `navOptions` as a fourth parameter in `renderEditor` and forward it to `buildListEditor` (or call `navOptions?.onRebuild?.()` directly after any DOM rebuild if not using `buildListEditor`)

`EditorKeyboard` handles everything else automatically when the modal opens.

## Out of Scope

- Drag-to-reorder via keyboard beyond `⇧↑/↓` (already covered)
- Keyboard navigation outside the modal (existing `keyboard.js` handles that)
- Undo for delete (a nice future improvement, not in this spec)
