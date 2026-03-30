---
title: iFrame
description: Embed any URL in a sandboxed iframe with scripts disabled.
---

# iFrame

Embeds an external URL inside the dashboard using an HTML `<iframe>`. The frame runs in a sandbox — scripts are disabled to prevent the embedded page from interacting with the parent.

## Configuration

```js
{
  id: "my-iframe",
  type: "iframe",
  col: 1, row: 1, width: 6, height: 2,
  config: {
    title: "iFrame",
    url: "https://example.com",
    height: 300
  }
}
```

## Options

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `title` | string | `"iFrame"` | Card heading. |
| `url` | string | — | Full URL to embed (include `https://` or `http://`). |
| `height` | number | `300` | Iframe height in pixels. Accepted range: **50 – 2000**. |

## Examples

**Embed a local service**

```js
{
  id: "grafana-iframe",
  type: "iframe",
  col: 1, row: 1, width: 8, height: 3,
  config: {
    title: "Grafana Dashboard",
    url: "http://192.168.1.10:3000/d/abc123/home?kiosk=tv",
    height: 600
  }
}
```

**Minimal — no title**

```js
{
  id: "weather-iframe",
  type: "iframe",
  col: 1, row: 1, width: 4, height: 2,
  config: {
    url: "https://forecast.example.com/embed",
    height: 250
  }
}
```

!!! warning "Security sandbox"
    The iframe uses `sandbox="allow-same-origin allow-forms"`. JavaScript execution is **disabled**. Pages that rely on scripts to render content may appear broken.

!!! note "X-Frame-Options"
    Some sites send `X-Frame-Options: DENY` or `Content-Security-Policy: frame-ancestors 'none'` headers that prevent embedding. If the frame shows blank, the target site is blocking embeds at the server level — this cannot be worked around from the browser.

!!! tip "Height tuning"
    Set `height` to match the content you are embedding. For full-page dashboards, values between **600** and **1200** px are common. The widget card will scroll if the content overflows.
