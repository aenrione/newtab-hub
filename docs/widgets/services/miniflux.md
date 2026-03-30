---
title: Miniflux
description: Displays total feed count and unread entry count from your Miniflux RSS reader.
---

# Miniflux

Shows the number of feeds configured in Miniflux and how many unread entries are waiting for you — a quick glance at your reading backlog without opening the full interface.

## Configuration

```js
{ id: "my-miniflux", type: "miniflux", col: 1, row: 1, width: 6, height: 1,
  config: {
    title: "Miniflux",
    url: "http://localhost:8080",
    apiKey: "your-api-key",
  }
}
```

## Options

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `title` | string | `"Miniflux"` | Heading displayed on the widget. |
| `url` | string | `"http://localhost:8080"` | Base URL of your Miniflux instance. |
| `apiKey` | string | — | Miniflux API key. See [Credentials](#credentials). |

## Credentials

Open Miniflux and navigate to **Settings > API Keys**. Create a new API key (or copy an existing one) and paste it into the `apiKey` field.

!!! note
    Miniflux API keys are per-user. The widget will reflect the feeds and unread counts belonging to the user who owns the key.

## Example

```js
{ id: "miniflux-reader", type: "miniflux", col: 7, row: 1, width: 6, height: 1,
  config: {
    title: "RSS",
    url: "http://192.168.1.10:8080",
    apiKey: "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4",
  }
}
```

!!! tip
    If you run Miniflux on the same port as another service (e.g. SABnzbd also defaults to `8080`), make sure the `url` points to the correct host and port.
