---
title: Grid Layout
description: How to position and size widgets on the 12-column grid
---

# Grid Layout

New Tab Hub uses a **12-column CSS Grid**. Every widget declares its position and size with four fields.

## Widget Placement Fields

| Field | Type | Description |
|-------|------|-------------|
| `col` | number (1–12) | Starting column |
| `row` | number (1+) | Starting row |
| `width` | number (1–12) | Column span |
| `height` | number (1+) | Row span |

```js
// Full-width widget in row 1
{ id: "search", type: "search", col: 1, row: 1, width: 12, height: 1, config: {} }

// Half-width widgets side by side in row 2
{ id: "feeds",   type: "feeds",   col: 1, row: 2, width: 6, height: 1, config: { ... } }
{ id: "weather", type: "weather", col: 7, row: 2, width: 6, height: 1, config: { ... } }

// One-third / two-thirds split
{ id: "clock",  type: "clock",  col: 1, row: 3, width: 4, height: 1, config: {} }
{ id: "pinned", type: "pinned-links", col: 5, row: 3, width: 8, height: 1, config: { ... } }
```

!!! tip
    Columns must add up to 12 per row, but gaps are fine — unused columns are simply empty.

## Visual Edit Mode

You don't have to edit config files manually. Click the **grid icon** in the top bar to enter edit mode:

- **Drag** widgets to reorder
- **Resize** widgets by dragging their edges
- **Add** new widgets from the widget picker
- **Remove** widgets with the remove button

Changes are saved to browser storage and applied immediately. They are stored per-profile and override the config file values.

!!! note
    Edits made in the UI are saved to `chrome.storage.local`, not back to your JS config files. If you want the layout baked into your config, you can copy the widget positions shown in the editor back to your profile file.

## Tips

- Use `width: 12` for full-width widgets (search bar, pinned links)
- Use `width: 6` for two-column layouts
- Use `width: 4` for three-column layouts
- Tall widgets (like Pomodoro) benefit from `height: 2` or more
- Some widgets have a minimum size — check their individual docs
