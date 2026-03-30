---
title: Clock
description: Shows the current time and date, updated every 30 seconds
---

# Clock

Displays the current time and date, refreshed every 30 seconds. Formatting is handled by the browser's built-in `Intl` API, so the output automatically matches your system locale (12 h / 24 h, day/month order, etc.).

No configuration is required — just add the widget to your dashboard.

## Configuration

```js
{ id: "my-clock", type: "clock", col: 1, row: 1, width: 4, height: 1,
  config: {}
}
```

## Options

This widget has no configurable fields. All formatting is derived from your browser's locale settings.

## Examples

### Minimal

```js
{ id: "w1", type: "clock", col: 1, row: 1, width: 4, height: 1,
  config: {}
}
```

!!! tip
    Pair the clock with the `calendar` widget nearby for a clean at-a-glance date/time section on your dashboard.
