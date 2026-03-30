---
title: Todo
description: Simple persistent task list stored in browser storage
---

# Todo

A lightweight task list that persists to browser storage per widget instance. Add tasks, toggle them complete, and clear finished items — all without leaving your new tab.

**Keyboard shortcuts inside the widget:**

| Action | Key |
|--------|-----|
| Add task | `Enter` |
| Toggle task complete | `Space` or `Enter` |
| Delete task | `Backspace` or `Delete` |

## Configuration

```js
{ id: "my-todo", type: "todo", col: 1, row: 1, width: 4, height: 3,
  config: {
    title: "Tasks"
  }
}
```

## Options

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `title` | string | — | Widget heading. Double-click the title directly on the dashboard to rename it inline. |

## Examples

### Minimal

```js
{ id: "w1", type: "todo", col: 1, row: 1, width: 4, height: 3,
  config: {
    title: "Today"
  }
}
```

!!! tip
    You can place multiple `todo` widgets side-by-side (e.g., "Today", "This week", "Backlog") — each stores its items independently.

!!! note
    Tasks are saved to browser storage. Clearing site data or switching browsers will reset the list. There is currently no sync across devices.
