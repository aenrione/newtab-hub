---
title: Pinned Links
description: A row of favourite links accessible via keyboard shortcuts 1–9
---

# Pinned Links

A compact row of your most-used links, each accessible via the keyboard shortcuts `1` through `9`. Supports optional badge labels and uptime health-check indicators.

## Configuration

```js
{ id: "my-pinned", type: "pinned-links", col: 1, row: 1, width: 12, height: 1,
  config: {
    items: [
      { title: "GitHub", href: "https://github.com" }
    ]
  }
}
```

## Options

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `items` | array | — | Array of link objects (see sub-fields below). |
| `items[].title` | string | — | Display label for the link. |
| `items[].href` | string | — | Destination URL. |
| `items[].badge` | string | — | Optional badge text overlaid on the link (e.g., a short tag or counter). |
| `items[].healthCheck` | string \| boolean | — | Set to `"auto"` to derive the health-check URL from `href`, or provide an explicit URL. Shows a coloured uptime dot. |

## Examples

### Minimal

```js
{ id: "w1", type: "pinned-links", col: 1, row: 1, width: 12, height: 1,
  config: {
    items: [
      { title: "GitHub", href: "https://github.com" },
      { title: "Gmail",  href: "https://mail.google.com" }
    ]
  }
}
```

### Advanced

```js
{ id: "w1", type: "pinned-links", col: 1, row: 1, width: 12, height: 1,
  config: {
    items: [
      { title: "GitHub",    href: "https://github.com",           healthCheck: "auto" },
      { title: "Grafana",   href: "https://grafana.example.com",  healthCheck: "https://grafana.example.com/api/health", badge: "Internal" },
      { title: "Portainer", href: "https://portainer.example.com", healthCheck: "auto" },
      { title: "Gmail",     href: "https://mail.google.com" }
    ]
  }
}
```

!!! tip
    You can define up to 9 items — each maps to the keyboard shortcut matching its position (1 = first link, 2 = second, etc.).

!!! note
    Health-check dots poll the given URL and display green for reachable, red for unreachable. Use `"auto"` to let the widget derive the URL from `href` automatically.
