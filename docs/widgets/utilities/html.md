---
title: HTML
description: Render arbitrary HTML inside a dashboard card.
---

# HTML

Renders a raw HTML string directly inside a card. Useful for custom widgets, embedded badges, status indicators, or any content that does not fit another widget type.

## Configuration

```js
{
  id: "my-html",
  type: "html",
  col: 1, row: 1, width: 6, height: 1,
  config: {
    title: "Announcements",
    content: "<p>Hello, <strong>world</strong>!</p>"
  }
}
```

## Options

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `title` | string | — | Card heading. Leave blank or omit to hide the title bar entirely. |
| `content` | string | — | Raw HTML string to render inside the card body. |

## Examples

**Status badge row**

```js
{
  id: "status-badges",
  type: "html",
  col: 1, row: 1, width: 6, height: 1,
  config: {
    title: "Build Status",
    content: `
      <img src="https://img.shields.io/github/actions/workflow/status/owner/repo/ci.yml?branch=main" alt="CI">
      <img src="https://img.shields.io/github/v/release/owner/repo" alt="Release">
    `
  }
}
```

**Custom message with inline styles**

```js
{
  id: "notice",
  type: "html",
  col: 1, row: 5, width: 12, height: 1,
  config: {
    content: `<div style="background:#ff9800;color:#fff;padding:8px 12px;border-radius:6px;">
      Maintenance window scheduled Sunday 02:00 – 04:00 UTC
    </div>`
  }
}
```

**No-title card**

```js
{
  id: "clock-html",
  type: "html",
  col: 10, row: 1, width: 3, height: 1,
  config: {
    content: "<p style='font-size:2rem;text-align:center;margin:0'>🕐</p>"
  }
}
```

!!! warning "No sandboxing"
    HTML is injected with `innerHTML`. Avoid placing untrusted or user-supplied content here — there is no XSS sandbox. Only use content you control.

!!! tip "Multi-line content"
    Use a JavaScript template literal (backticks) in your config file to keep multi-line HTML readable.
