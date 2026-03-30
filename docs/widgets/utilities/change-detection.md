---
title: Change Detection
description: Show watched URLs and last-changed timestamps from a self-hosted changedetection.io instance.
---

# Change Detection

Connects to a self-hosted [changedetection.io](https://changedetection.io) instance and lists watched URLs alongside the last time a change was detected.

## Configuration

```js
{
  id: "my-change-detection",
  type: "change-detection",
  col: 1, row: 1, width: 6, height: 2,
  config: {
    title: "Change Detection",
    url: "http://changedetection.local:5000",
    limit: 10,
    apiKey: "YOUR_API_KEY"
  }
}
```

## Options

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `title` | string | `"Change Detection"` | Card heading. |
| `url` | string | — | Base URL of your changedetection.io instance (no trailing slash). |
| `limit` | number | `10` | Maximum rows to display. Hard cap of **50**. |
| `apiKey` | string | — | API key from your changedetection.io instance. |

## Credentials

**`apiKey`** — found in your changedetection.io instance under **Settings > API**.

!!! warning "API key required"
    Without an `apiKey` the request will return `403 Forbidden`. Keep the key in your config rather than committing it to a public repository.

## Examples

**Default — 10 most recent watches**

```js
{
  id: "changes",
  type: "change-detection",
  col: 1, row: 1, width: 6, height: 2,
  config: {
    url: "http://192.168.1.50:5000",
    apiKey: "abc123"
  }
}
```

**Show up to 25 entries with a custom title**

```js
{
  id: "changes-full",
  type: "change-detection",
  col: 7, row: 1, width: 6, height: 3,
  config: {
    title: "Website Watches",
    url: "http://192.168.1.50:5000",
    limit: 25,
    apiKey: "abc123"
  }
}
```

!!! tip "Self-hosted only"
    This widget targets a **self-hosted** changedetection.io instance. The cloud-hosted version at changedetection.io is not supported.
