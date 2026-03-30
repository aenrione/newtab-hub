---
title: Lidarr
description: Displays a summary of your music library including artist count, wanted albums, and queue.
---

# Lidarr

Shows a high-level overview of your Lidarr music library: total artists tracked, how many albums are wanted, and how many items are currently in the download queue.

## Configuration

```js
{ id: "my-lidarr", type: "lidarr", col: 1, row: 1, width: 6, height: 1,
  config: {
    title: "Lidarr",
    url: "http://localhost:8686",
    apiKey: "your-api-key",
  }
}
```

## Options

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `title` | string | `"Lidarr"` | Heading displayed on the widget. |
| `url` | string | `"http://localhost:8686"` | Base URL of your Lidarr instance. |
| `apiKey` | string | — | Lidarr API key. See [Credentials](#credentials). |

## Credentials

Open Lidarr and navigate to **Settings > General**. Your API key is listed under the **Security** section. Copy it and paste it into the `apiKey` field.

!!! warning
    Keep your API key private. Anyone with the key can control your Lidarr instance.

## Example

```js
{ id: "lidarr-overview", type: "lidarr", col: 7, row: 1, width: 6, height: 1,
  config: {
    title: "Music",
    url: "http://192.168.1.10:8686",
    apiKey: "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4",
  }
}
```

!!! tip
    Stack this widget with [Radarr](radarr.md) and [Sonarr](sonarr.md) for a complete *arr suite overview on your dashboard.
