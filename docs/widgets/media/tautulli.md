---
title: Tautulli
description: Show detailed Plex stream stats — total streams, direct play, transcode, and bandwidth.
---

# Tautulli

Displays current Plex activity pulled from Tautulli: total active streams, direct play count, transcode count, and total bandwidth. Tautulli proxies Plex data and provides richer session detail than the Plex widget.

!!! tip
    Tautulli gives significantly more detail than the native [Plex widget](plex.md). If you run both Plex and Tautulli, prefer this widget for stream monitoring.

## Configuration

```js
{ id: "my-tautulli", type: "tautulli", col: 1, row: 1, width: 6, height: 1,
  config: {
    title: "Tautulli",
    url: "http://localhost:8181",
  }
}
```

## Options

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `title` | string | `"Tautulli"` | Label shown in the widget header. |
| `url` | string | `"http://localhost:8181"` | Base URL of your Tautulli instance. |

## Credentials

| Field | Type | Description |
|-------|------|-------------|
| `apiKey` | password | Your Tautulli API key. |

To find your API key: open Tautulli, go to **Settings → Web Interface**, and scroll down to the **API** section. Copy the value shown next to **API Key**.

## Displayed stats

| Stat | Description |
|------|-------------|
| Total Streams | All currently active Plex sessions. |
| Direct Play | Sessions streaming without transcoding. |
| Transcode | Sessions being actively transcoded. |
| Bandwidth | Combined stream bandwidth in kbps. |

## Example

```js
{ id: "tau-1", type: "tautulli", col: 1, row: 1, width: 6, height: 1,
  config: {
    title: "Tautulli",
    url: "http://192.168.1.100:8181",
  }
}
```
