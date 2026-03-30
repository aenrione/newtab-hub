---
title: Calendar
description: Month calendar view with today highlighted and prev/next navigation
---

# Calendar

A month-view calendar with today's date highlighted and weekends visually differentiated. Use the prev/next arrows to navigate between months. Configurable first day of the week.

## Configuration

```js
{ id: "my-calendar", type: "calendar", col: 1, row: 1, width: 4, height: 2,
  config: {
    title: "Calendar"
  }
}
```

## Options

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `title` | string | — | Widget heading. |
| `firstDay` | string | `"sun"` | First day of the week: `"sun"` (Sunday) or `"mon"` (Monday). |

## Examples

### Minimal

```js
{ id: "w1", type: "calendar", col: 1, row: 1, width: 4, height: 2,
  config: {}
}
```

### Advanced

```js
{ id: "w1", type: "calendar", col: 1, row: 1, width: 4, height: 2,
  config: {
    title: "Calendar",
    firstDay: "mon"
  }
}
```

!!! tip
    Set `firstDay: "mon"` if you follow an ISO/European week layout where weeks start on Monday.
