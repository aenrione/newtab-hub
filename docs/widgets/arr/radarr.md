---
title: Radarr
description: Displays a summary of your movie library including available, missing, and queued counts.
---

# Radarr

Shows a high-level overview of your Radarr movie library: total movies, how many are available, how many are missing, and how many are currently queued for download.

## Configuration

```js
{ id: "my-radarr", type: "radarr", col: 1, row: 1, width: 6, height: 1,
  config: {
    title: "Radarr",
    url: "http://localhost:7878",
    apiKey: "your-api-key",
  }
}
```

## Options

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `title` | string | `"Radarr"` | Heading displayed on the widget. |
| `url` | string | `"http://localhost:7878"` | Base URL of your Radarr instance. |
| `apiKey` | string | — | Radarr API key. See [Credentials](#credentials). |

## Credentials

Open Radarr and navigate to **Settings > General**. Your API key is listed under the **Security** section. Copy it and paste it into the `apiKey` field.

!!! warning
    Keep your API key private. Anyone with the key can control your Radarr instance.

## Example

```js
{ id: "radarr-overview", type: "radarr", col: 1, row: 2, width: 6, height: 1,
  config: {
    title: "Movies",
    url: "http://192.168.1.10:7878",
    apiKey: "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4",
  }
}
```

!!! tip
    Place this widget alongside the [Sonarr](sonarr.md) widget to get a combined view of your entire media library at a glance.
