---
title: Bazarr
description: Displays counts of missing movie and episode subtitles managed by Bazarr.
---

# Bazarr

Shows how many movie subtitles and episode subtitles are currently missing in your Bazarr instance, giving you a quick health check on your subtitle library.

## Configuration

```js
{ id: "my-bazarr", type: "bazarr", col: 1, row: 1, width: 6, height: 1,
  config: {
    title: "Bazarr",
    url: "http://localhost:6767",
    apiKey: "your-api-key",
  }
}
```

## Options

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `title` | string | `"Bazarr"` | Heading displayed on the widget. |
| `url` | string | `"http://localhost:6767"` | Base URL of your Bazarr instance. |
| `apiKey` | string | — | Bazarr API key. See [Credentials](#credentials). |

## Credentials

Open Bazarr and navigate to **Settings > General**. Your API key is displayed in the **Security** section. Copy it and paste it into the `apiKey` field.

!!! warning
    Keep your API key private. Anyone with the key has access to your Bazarr instance.

## Example

```js
{ id: "bazarr-missing", type: "bazarr", col: 1, row: 3, width: 6, height: 1,
  config: {
    title: "Subtitles",
    url: "http://192.168.1.10:6767",
    apiKey: "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4",
  }
}
```

!!! tip
    Use Bazarr alongside [Sonarr](sonarr.md) and [Radarr](radarr.md) — Bazarr monitors those libraries and automatically downloads subtitles for new content.
