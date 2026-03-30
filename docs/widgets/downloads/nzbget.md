---
title: NZBGet
description: Displays NZBGet download speed, remaining size, pause state, and free disk space.
---

# NZBGet

Shows the current state of your NZBGet downloader: active download speed (MB/s), remaining data (MB), whether the queue is paused, and available free disk space (GB).

## Configuration

```js
{ id: "my-nzbget", type: "nzbget", col: 1, row: 1, width: 6, height: 1,
  config: {
    title: "NZBGet",
    url: "http://localhost:6789",
    username: "nzbget",
    password: "your-password",
  }
}
```

## Options

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `title` | string | `"NZBGet"` | Heading displayed on the widget. |
| `url` | string | `"http://localhost:6789"` | Base URL of your NZBGet instance. |
| `username` | string | — | NZBGet control username. |
| `password` | string | — | NZBGet control password. |

## Credentials

NZBGet uses HTTP Basic Auth over its JSON-RPC endpoint. The username and password are the **Control credentials** you configured in NZBGet under **Settings > Security**.

By default NZBGet ships with `nzbget` / `tegbzn6789` — change these before exposing NZBGet on your network.

!!! warning
    Always change the default NZBGet credentials. The defaults are publicly known and present a security risk.

## Example

```js
{ id: "nzbget-status", type: "nzbget", col: 7, row: 3, width: 6, height: 1,
  config: {
    title: "NZBGet",
    url: "http://192.168.1.10:6789",
    username: "admin",
    password: "my-secure-password",
  }
}
```

!!! tip
    Use this widget alongside [SABnzbd](sabnzbd.md) if you run both Usenet clients, or pair it with [Transmission](transmission.md) for a mixed download overview.
