---
title: Transmission
description: Displays active and paused torrent counts along with current download and upload speeds.
---

# Transmission

Shows a live snapshot of your Transmission torrent client: how many torrents are active, how many are paused, and the current aggregate download and upload speeds.

## Configuration

```js
{ id: "my-transmission", type: "transmission", col: 1, row: 1, width: 6, height: 1,
  config: {
    title: "Transmission",
    url: "http://localhost:9091",
    username: "your-username",
    password: "your-password",
  }
}
```

## Options

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `title` | string | `"Transmission"` | Heading displayed on the widget. |
| `url` | string | `"http://localhost:9091"` | Base URL of your Transmission RPC endpoint. |
| `username` | string | — | RPC username configured in Transmission. |
| `password` | string | — | RPC password configured in Transmission. |

## Credentials

Enable RPC authentication in Transmission under **Edit > Preferences > Remote** (desktop) or in `settings.json` via the `rpc-username` and `rpc-password` fields. Provide the same values in the widget config.

!!! tip
    The Transmission RPC interface requires a session-ID handshake (`X-Transmission-Session-Id` header). This is handled automatically by the widget — no manual steps are needed.

## Example

```js
{ id: "transmission-torrents", type: "transmission", col: 1, row: 4, width: 6, height: 1,
  config: {
    title: "Torrents",
    url: "http://192.168.1.10:9091",
    username: "admin",
    password: "my-secure-password",
  }
}
```

!!! note
    If Transmission is behind a reverse proxy, ensure the proxy forwards the `X-Transmission-Session-Id` header correctly or the RPC handshake will fail.
