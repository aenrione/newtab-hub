---
title: Jellyfin
description: Show library counts and active streams from your Jellyfin server.
---

# Jellyfin

Displays movie count, series count, episode count, and the number of active streams from your Jellyfin media server.

## Configuration

```js
{ id: "my-jellyfin", type: "jellyfin", col: 1, row: 1, width: 6, height: 1,
  config: {
    title: "Jellyfin",
    url: "http://localhost:8096",
  }
}
```

## Options

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `title` | string | `"Jellyfin"` | Label shown in the widget header. |
| `url` | string | `"http://localhost:8096"` | Base URL of your Jellyfin server. |

## Credentials

| Field | Type | Description |
|-------|------|-------------|
| `apiKey` | password | A Jellyfin API key. |

To generate an API key: open the Jellyfin Dashboard, go to **Advanced → API Keys**, and click **+**. Give the key a descriptive name (e.g. "newtab-hub") and copy the generated value.

!!! note
    API keys are tied to the admin account by default. Any key listed under **Dashboard → Advanced → API Keys** will work.

## Displayed stats

| Stat | Description |
|------|-------------|
| Movies | Total movie items in all libraries. |
| Series | Total TV series in all libraries. |
| Episodes | Total individual episode items. |
| Active Streams | Sessions with a currently playing item. |

## Example

```js
{ id: "jf-1", type: "jellyfin", col: 1, row: 1, width: 6, height: 1,
  config: {
    title: "Jellyfin",
    url: "http://192.168.1.50:8096",
  }
}
```
